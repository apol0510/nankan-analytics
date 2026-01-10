// PayPal IPN Webhook受信Function
// 決済完了時にAirtable登録 + SendGridウェルカムメール送信

const Airtable = require('airtable');
const querystring = require('querystring');

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
    console.log('🎯 PayPal IPN受信:', new Date().toISOString());
    console.log('📦 Event body:', event.body);

    // PayPal IPNペイロード解析（form-urlencoded形式）
    const ipnData = querystring.parse(event.body);

    console.log('🔍 IPN Data:', JSON.stringify(ipnData, null, 2));

    // PayPal IPN検証（必須）
    const isValid = await verifyIPN(event.body);
    if (!isValid) {
      console.error('❌ IPN検証失敗');
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'IPN verification failed' })
      };
    }

    console.log('✅ IPN検証成功');

    // トランザクションタイプ確認
    const txnType = ipnData.txn_type;
    const paymentStatus = ipnData.payment_status;

    console.log('🔍 Transaction Type:', txnType);
    console.log('🔍 Payment Status:', paymentStatus);

    // 処理対象のイベントのみ処理
    const validTxnTypes = [
      'subscr_signup',      // サブスク登録
      'subscr_payment',     // サブスク決済
      'web_accept',         // 単品決済
      'express_checkout'    // Express Checkout
    ];

    if (!validTxnTypes.includes(txnType)) {
      console.log('⚠️ 処理対象外のイベント:', txnType);
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Event ignored', txnType })
      };
    }

    // Completedステータスのみ処理
    if (paymentStatus !== 'Completed' && txnType !== 'subscr_signup') {
      console.log('⚠️ 未完了の決済をスキップ:', paymentStatus);
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Payment not completed', paymentStatus })
      };
    }

    // 必須データ確認
    const email = ipnData.payer_email;
    const itemName = ipnData.item_name || ipnData.item_name1;
    const customerName = `${ipnData.first_name || ''} ${ipnData.last_name || ''}`.trim();

    if (!email || !itemName) {
      throw new Error('Missing required fields: payer_email or item_name');
    }

    // プラン名マッピング（PayPal商品名 → システム内部プラン名）
    const planMapping = {
      'Standard': 'Standard',
      'Premium': 'Premium',
      'Premium Sanrenpuku': 'Premium Sanrenpuku',
      'Premium Combo': 'Premium Combo',
      'Premium Plus': 'Premium Plus'
    };

    const userPlan = planMapping[itemName];
    if (!userPlan) {
      throw new Error(`Unknown product: ${itemName}`);
    }

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

    // Airtable接続
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);

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
        'StripeCustomerId': ipnData.txn_id || '', // PayPalトランザクションID
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
          'StripeCustomerId': ipnData.txn_id || '',
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

    // 成功レスポンス
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'IPN processed successfully',
        customerEmail: email,
        plan: userPlan,
        expiryDate: expiryDateStr,
        isNewCustomer,
        timestamp: now.toISOString()
      })
    };

  } catch (error) {
    console.error('❌ IPN処理エラー:', error);

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

// PayPal IPN検証（必須セキュリティ対策）
async function verifyIPN(ipnBody) {
  try {
    // PayPal Sandboxか本番環境か判定
    const verifyUrl = process.env.PAYPAL_MODE === 'live'
      ? 'https://ipnpb.paypal.com/cgi-bin/webscr'
      : 'https://ipnpb.sandbox.paypal.com/cgi-bin/webscr';

    // IPNデータに cmd=_notify-validate を追加
    const verifyBody = `cmd=_notify-validate&${ipnBody}`;

    console.log('🔍 IPN検証URL:', verifyUrl);

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': verifyBody.length.toString()
      },
      body: verifyBody
    });

    const verifyResult = await response.text();
    console.log('🔍 IPN検証結果:', verifyResult);

    return verifyResult === 'VERIFIED';
  } catch (error) {
    console.error('❌ IPN検証エラー:', error);
    return false;
  }
}

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
