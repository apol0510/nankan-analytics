// PayPal Webhook受信Function（REST API Webhook形式）
// 決済完了時にAirtable登録 + SendGridウェルカムメール送信

const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS対応
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // POSTメソッドのみ許可
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('🎯 PayPal Webhook受信:', new Date().toISOString());
    console.log('📦 Event body:', event.body);
    console.log('📋 Headers:', JSON.stringify(event.headers, null, 2));

    // PayPal Webhookペイロード解析（JSON形式）
    const webhookData = JSON.parse(event.body || '{}');

    console.log('🔍 Webhook Data:', JSON.stringify(webhookData, null, 2));

    // 必須フィールド確認
    const {
      id: eventId,
      event_type: eventType,
      resource
    } = webhookData;

    if (!eventId || !eventType || !resource) {
      throw new Error('Missing required webhook fields');
    }

    console.log('🔍 Event ID:', eventId);
    console.log('🔍 Event Type:', eventType);

    // Airtable接続
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);

    // 🔒 重複排除チェック（event_idベース・冪等性保証）
    const processedEvents = await base('ProcessedWebhookEvents')
      .select({
        filterByFormula: `{EventId} = "${eventId}"`
      })
      .firstPage()
      .catch(() => []);

    if (processedEvents.length > 0) {
      console.log('⚠️ 重複イベント検出・スキップ:', eventId);
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Duplicate event ignored',
          eventId
        })
      };
    }

    // イベント記録（重複排除用・処理開始時に即座記録）
    await base('ProcessedWebhookEvents').create([{
      fields: {
        'EventId': eventId,
        'EventType': eventType,
        'ProcessedAt': new Date().toISOString(),
        'Status': 'processing'
      }
    }]);

    // 処理対象のイベントのみ処理
    // ⚠️ 重要（専門家推奨）: 本番では PAYMENT系 イベントで権限付与を確定すべき
    // - ACTIVATED: 購読有効化（決済完了とは限らない）→ 仮登録・subscription_id保存
    // - PAYMENT.SALE.COMPLETED: 単品決済完了 → 本登録
    // - BILLING.SUBSCRIPTION.PAYMENT.COMPLETED: サブスク決済完了 → 本登録（将来実装予定）
    const validEventTypes = [
      'BILLING.SUBSCRIPTION.CREATED',   // サブスク登録
      'BILLING.SUBSCRIPTION.ACTIVATED', // サブスク有効化（テスト用・仮登録）
      'PAYMENT.SALE.COMPLETED'          // 単品決済完了
    ];

    if (!validEventTypes.includes(eventType)) {
      console.log('⚠️ 処理対象外のイベント:', eventType);

      // イベント記録を更新
      await base('ProcessedWebhookEvents').update(processedEvents[0]?.id || eventId, {
        'Status': 'ignored'
      });

      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Event ignored', eventType })
      };
    }

    // サブスクリプション情報抽出
    let email, customerName, planId, userPlan;

    if (eventType === 'BILLING.SUBSCRIPTION.CREATED' || eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      // サブスクリプションイベント
      email = resource.subscriber?.email_address;
      customerName = `${resource.subscriber?.name?.given_name || ''} ${resource.subscriber?.name?.surname || ''}`.trim();
      planId = resource.plan_id;

      // 🔍 デバッグログ追加
      console.log('🔍 DEBUG - email:', email);
      console.log('🔍 DEBUG - planId:', planId);
      console.log('🔍 DEBUG - customerName:', customerName);

      // プラン名マッピング（PayPal Plan ID → システム内部プラン名）
      const planMapping = {
        'P-68H748483T318591TNFRBYMQ': 'Standard',
        'P-6US56295GW7958014NFRB2BQ': 'Premium',
        'P-17K19274A7982913DNFRB3KA': 'Premium Sanrenpuku',
        'P-8KU85292CD447891XNFRB4GI': 'Premium Combo'
      };

      // 🔧 2026-01-10修正: Webhook Simulatorのダミーplan_idに対応（デフォルトStandard）
      userPlan = planMapping[planId] || 'Standard';
      console.log('🔍 DEBUG - userPlan:', userPlan, `(mapped from ${planId})`);
    } else if (eventType === 'PAYMENT.SALE.COMPLETED') {
      // 単品決済イベント（Premium Plus）
      email = resource.payer?.payer_info?.email;
      customerName = `${resource.payer?.payer_info?.first_name || ''} ${resource.payer?.payer_info?.last_name || ''}`.trim();
      userPlan = 'Premium Plus';
    }

    if (!email || !userPlan) {
      throw new Error('Missing required fields: email or userPlan');
    }

    console.log('📧 Email:', email);
    console.log('📦 User Plan:', userPlan);

    // 有効期限計算（Premium Plus以外は1ヶ月後）
    const now = new Date();
    let expiryDate;

    if (userPlan === 'Premium Plus') {
      // Premium Plusは単品商品なので有効期限なし
      expiryDate = null;
    } else {
      // サブスクは1ヶ月後
      expiryDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }

    const expiryDateStr = expiryDate ? expiryDate.toISOString().split('T')[0] : '';

    // 既存顧客チェック
    const existingRecords = await base('Customers')
      .select({
        filterByFormula: `{Email} = "${email}"`
      })
      .firstPage();

    let customerRecord;
    let isNewCustomer = false;

    if (existingRecords.length > 0) {
      // 既存顧客の更新
      console.log('🔄 既存顧客を更新:', email);

      const recordId = existingRecords[0].id;
      customerRecord = await base('Customers').update(recordId, {
        'プラン': userPlan,
        '有効期限': expiryDateStr,
        'WithdrawalRequested': false, // 退会フラグリセット
        'WithdrawalDate': null,
        'WithdrawalReason': null,
        'StripeCustomerId': resource.id || eventId, // PayPal Subscription ID
        'LastUpdated': now.toISOString()
      });

      console.log('✅ 既存顧客更新完了:', recordId);
    } else {
      // 新規顧客登録
      console.log('➕ 新規顧客を登録:', email);
      isNewCustomer = true;

      customerRecord = await base('Customers').create([{
        fields: {
          'Email': email,
          'Name': customerName,
          'プラン': userPlan,
          '有効期限': expiryDateStr,
          'RegistrationDate': now.toISOString().split('T')[0],
          'StripeCustomerId': resource.id || eventId,
          'WithdrawalRequested': false,
          'LastUpdated': now.toISOString()
        }
      }]);

      console.log('✅ 新規顧客登録完了:', customerRecord[0].id);
    }

    // SendGridでウェルカムメール送信（新規顧客のみ）
    if (isNewCustomer) {
      console.log('📧 ウェルカムメール送信開始...');

      const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: email }],
            subject: `【NANKANアナリティクス】${userPlan}プラン ご登録ありがとうございます`
          }],
          from: {
            email: 'nankan.analytics@gmail.com',
            name: 'NANKANアナリティクス'
          },
          content: [{
            type: 'text/html',
            value: generateWelcomeEmail(customerName, userPlan, expiryDateStr, email)
          }]
        })
      });

      if (sendGridResponse.ok) {
        console.log('✅ ウェルカムメール送信完了');
      } else {
        const errorText = await sendGridResponse.text();
        console.error('❌ SendGrid送信失敗:', errorText);
      }
    }

    // イベント記録を更新（処理完了）
    const processedEventRecords = await base('ProcessedWebhookEvents')
      .select({
        filterByFormula: `{EventId} = "${eventId}"`
      })
      .firstPage();

    if (processedEventRecords.length > 0) {
      await base('ProcessedWebhookEvents').update(processedEventRecords[0].id, {
        'Status': 'completed',
        'CustomerEmail': email,
        'UserPlan': userPlan
      });
    }

    // 成功レスポンス
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        eventId,
        eventType,
        customerEmail: email,
        plan: userPlan,
        expiryDate: expiryDateStr,
        isNewCustomer,
        timestamp: now.toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Webhook処理エラー:', error);

    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// ウェルカムメールHTML生成（マジックリンク付き）
function generateWelcomeEmail(customerName, plan, expiryDate, email) {
  const planDescriptions = {
    'Standard': '後半3レースの馬単予想',
    'Premium': '全レースの馬単予想',
    'Premium Sanrenpuku': '全レースの三連複予想',
    'Premium Combo': '全レースの馬単+三連複予想',
    'Premium Plus': '超高性能AI予想（1鞍）'
  };

  const description = planDescriptions[plan] || plan;
  const expiryText = expiryDate ? `有効期限: ${expiryDate}` : '無期限';

  // マジックリンク生成（既存のauth-user.js経由）
  const magicLink = `https://nankan-analytics.keiba.link/?email=${encodeURIComponent(email)}`;

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ご登録ありがとうございます</title>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">🎉 ご登録ありがとうございます</h1>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p>${customerName ? customerName + '様' : 'お客様'}</p>

    <p>NANKANアナリティクスへのご登録ありがとうございます。<br>
    以下の内容でご登録が完了しました。</p>

    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>📦 ご契約プラン</strong></p>
      <p style="margin: 0 0 10px 0; font-size: 18px; color: #667eea;"><strong>${plan}</strong></p>
      <p style="margin: 0 0 10px 0; color: #666;">${description}</p>
      <p style="margin: 0; color: #666;">${expiryText}</p>
    </div>

    <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>🔐 ログイン方法</strong></p>
      <p style="margin: 0 0 15px 0;">下のボタンをクリックすると、自動的にログインできます。<br>
      パスワードは不要です。</p>

      <div style="text-align: center;">
        <a href="${magicLink}"
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 25px; font-weight: bold;">
          マジックリンクでログイン
        </a>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <p style="margin: 0 0 15px 0; color: #666;">または、メールアドレスでログインすることもできます：</p>
      <a href="https://nankan-analytics.keiba.link/"
         style="display: inline-block; background: #fff; color: #667eea; text-decoration: none; padding: 12px 30px; border: 2px solid #667eea; border-radius: 25px; font-weight: bold;">
        サイトにアクセス
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="font-size: 12px; color: #999;">
      ※ このメールに心当たりがない場合は、お手数ですが削除してください。<br>
      ※ ご不明な点がございましたら、nankan.analytics@gmail.com までお問い合わせください。
    </p>
  </div>
</body>
</html>
  `;
}
