/**
 * 入金確認メール自動送信（Airtable Automation専用）
 *
 * トリガー: Airtable Status が "pending" → "active" に変更
 * 動作:
 *   1. Airtableからレコード情報取得（email, 氏名, プラン）
 *   2. 二重送信防止チェック（PaymentEmailSentフィールド）
 *   3. メール送信
 *   4. PaymentEmailSent を true に更新
 */

exports.handler = async (event, context) => {
  // CORSヘッダー設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // プリフライトリクエスト対応
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // POSTメソッドのみ許可
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // リクエストデータ取得（Airtable Automationから渡される）
    const requestData = JSON.parse(event.body);
    const { airtableRecordId } = requestData;

    console.log('📧 Payment confirmation auto trigger:', airtableRecordId);

    // 必須項目チェック
    if (!airtableRecordId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'airtableRecordId is required' })
      };
    }

    // Airtable API設定
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      throw new Error('Airtable credentials not configured');
    }

    // ========================================
    // Step 1: Airtableからレコード情報取得
    // ========================================
    const recordUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Customers/${airtableRecordId}`;

    console.log('🔍 Debug info:', {
      AIRTABLE_BASE_ID,
      airtableRecordId,
      recordUrl,
      tokenPrefix: AIRTABLE_API_KEY.substring(0, 7)
    });

    const recordResponse = await fetch(recordUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!recordResponse.ok) {
      const errorText = await recordResponse.text();
      throw new Error(`Airtable record fetch failed: ${recordResponse.status} - ${errorText}`);
    }

    const recordData = await recordResponse.json();
    const fields = recordData.fields;

    // 必須フィールド確認
    const email = fields.Email;
    const fullName = fields['氏名'];
    const productName = fields['プラン'];
    const planType = fields['PlanType'] || null;  // monthly, annual, lifetime, null for Free
    const expirationDate = fields['有効期限'] || fields['ExpiryDate'] || null;
    const paymentAmount = fields['入金金額'] || fields['金額'] || null;
    const paymentEmailSent = fields.PaymentEmailSent || false;

    console.log('📋 Record info:', { email, fullName, productName, planType, expirationDate, paymentAmount, paymentEmailSent });

    if (!email || !fullName || !productName) {
      console.error('⚠️ Missing required fields:', { email, fullName, productName });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields in Airtable record',
          details: { email, fullName, productName }
        })
      };
    }

    // ========================================
    // Step 2: 二重送信防止チェック
    // ========================================
    if (paymentEmailSent === true) {
      console.log('ℹ️ Payment email already sent, skipping:', email);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          skipped: true,
          message: 'Payment email already sent',
          email: email
        })
      };
    }

    // ========================================
    // Step 3: メール送信
    // ========================================
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const FROM_EMAIL = 'noreply@keiba.link';

    if (!SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured');
    }

    // プラン別の情報を取得
    const planInfo = getPlanInfo(productName, planType);

    // 日本時間
    const japanTime = new Date().toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // ユーザー向けメール
    const userEmailData = {
      personalizations: [{
        to: [{ email: email }],
        subject: `【入金確認】NANKANアナリティクス ${productName} - アクセス情報`
      }],
      from: { email: FROM_EMAIL, name: 'NANKANアナリティクス' },
      content: [{
        type: 'text/html',
        value: generateEmailHTML(fullName, email, productName, planType, expirationDate, paymentAmount, planInfo, japanTime)
      }],
      tracking_settings: {
        click_tracking: { enable: false },
        open_tracking: { enable: false }
      }
    };

    // SendGrid APIでメール送信
    const userResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userEmailData)
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('SendGrid user email error:', errorText);
      throw new Error(`Failed to send user email: ${userResponse.status}`);
    }

    console.log('✅ Payment confirmation email sent:', email);

    // ========================================
    // Step 4: PaymentEmailSent を true に更新 + ExpirationDate 設定
    // ========================================
    const updatePayload = {
      fields: {
        'PaymentEmailSent': true
      }
    };

    // 有効期限計算（2026-02-09価格体系対応）
    if (!productName.includes('Premium Plus') && !productName.includes('Plus')) {
      const today = new Date();
      let expirationDate = null;

      if (productName.includes('Lifetime')) {
        // 買い切りプラン: 2099年12月31日（永久）
        expirationDate = '2099-12-31';
        console.log('📅 有効期限設定: 永久アクセス (2099-12-31) for', productName);
      } else if (productName.includes('Annual')) {
        // 年払いプラン: 1年後
        const expDate = new Date(today);
        expDate.setFullYear(expDate.getFullYear() + 1);
        expirationDate = expDate.toISOString().split('T')[0];
        console.log('📅 有効期限設定: 1年後', expirationDate, 'for', productName);
      } else if (productName.includes('Monthly')) {
        // 月払いプラン: 1ヶ月後
        const expDate = new Date(today);
        expDate.setMonth(expDate.getMonth() + 1);
        expirationDate = expDate.toISOString().split('T')[0];
        console.log('📅 有効期限設定: 1ヶ月後', expirationDate, 'for', productName);
      } else {
        // デフォルト: 1ヶ月後
        const expDate = new Date(today);
        expDate.setMonth(expDate.getMonth() + 1);
        expirationDate = expDate.toISOString().split('T')[0];
        console.log('📅 有効期限設定: デフォルト1ヶ月後', expirationDate, 'for', productName);
      }

      updatePayload.fields['ExpirationDate'] = expirationDate;
    } else {
      console.log('💎 Premium Plus: 有効期限設定スキップ（単品商品）');
    }

    // PaymentMethod を "Bank Transfer" と設定（未設定の場合のみ）
    const currentPaymentMethod = fields.PaymentMethod;
    if (!currentPaymentMethod) {
      updatePayload.fields['PaymentMethod'] = 'Bank Transfer';
      console.log('💳 PaymentMethod設定: Bank Transfer');
    }

    const updateResponse = await fetch(recordUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });

    if (updateResponse.ok) {
      console.log('✅ PaymentEmailSent updated to true:', airtableRecordId);
      if (updatePayload.fields['ExpirationDate']) {
        console.log('✅ ExpirationDate updated:', updatePayload.fields['ExpirationDate']);
      }
    } else {
      const errorText = await updateResponse.text();
      console.error('⚠️ Airtable update failed:', errorText);
    }

    // 成功レスポンス
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Payment confirmation email sent successfully',
        email: email,
        productName: productName,
        airtableRecordId: airtableRecordId
      })
    };

  } catch (error) {
    console.error('Error sending payment confirmation:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      })
    };
  }
};

/**
 * メールHTML生成
 */
function generateEmailHTML(fullName, email, productName, planType, expirationDate, paymentAmount, planInfo, japanTime) {
  // プランタイプ表示用
  let planTypeDisplay = '';
  if (planType === 'lifetime') {
    planTypeDisplay = '（買い切り）';
  } else if (planType === 'annual') {
    planTypeDisplay = '（年払い）';
  } else if (planType === 'monthly') {
    planTypeDisplay = '（月払い）';
  }
  // planType が null または '' の場合（Freeプラン）は何も表示しない

  // 有効期限表示用（買い切りの場合は特別表記）
  let expirationDisplay = '';
  if (expirationDate) {
    if (expirationDate === '2099-12-31' || planType === 'lifetime') {
      expirationDisplay = `${expirationDate}（永久アクセス）`;
    } else {
      expirationDisplay = expirationDate;
    }
  }

  // 入金金額表示用（フォーマット）
  let amountDisplay = '';
  if (paymentAmount) {
    // 数値の場合はカンマ区切り、文字列の場合はそのまま
    const amount = typeof paymentAmount === 'number'
      ? paymentAmount.toLocaleString('ja-JP')
      : paymentAmount;
    amountDisplay = `¥${amount}`;
  }
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; line-height: 1.8; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10b981; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
    .section { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #10b981; }
    .info-row { padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .label { font-weight: bold; color: #475569; display: inline-block; width: 120px; }
    .value { color: #1e293b; }
    .highlight { background: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0; }
    .login-button { display: inline-block; background-color: #3b82f6; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 15px 0; }
    .access-list { background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin: 15px 0; }
    .footer { text-align: center; color: #64748b; font-size: 0.9rem; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 1.8rem;">🎉 ご入金ありがとうございます</h1>
      <p style="margin: 15px 0 0 0; font-size: 1rem;">入金を確認いたしました</p>
    </div>

    <div class="section">
      <p style="margin: 0 0 15px 0; font-size: 1.1rem;">
        <strong>${fullName} 様</strong>
      </p>
      <p style="margin: 0; color: #475569; line-height: 1.8;">
        この度は <strong>${productName}</strong> をご購入いただき、誠にありがとうございます。<br>
        ご入金を確認いたしました。
      </p>
    </div>

    <div class="highlight">
      <h3 style="margin: 0 0 15px 0; color: #1e40af;">🔑 ログイン情報</h3>
      <div class="info-row">
        <span class="label">プラン:</span>
        <span class="value"><strong>${productName} ${planTypeDisplay}</strong></span>
      </div>
      ${expirationDisplay ? `
      <div class="info-row">
        <span class="label">有効期限:</span>
        <span class="value"><strong>${expirationDisplay}</strong></span>
      </div>
      ` : ''}
      ${amountDisplay ? `
      <div class="info-row">
        <span class="label">お支払い金額:</span>
        <span class="value"><strong>${amountDisplay}</strong></span>
      </div>
      ` : ''}
      <div class="info-row" style="border-bottom: none;">
        <span class="label">ログインURL:</span>
        <div class="value" style="margin-top: 10px;">
          <a href="${planInfo.loginUrl}" class="login-button" target="_blank" style="display: inline-block; background-color: #3b82f6; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff !important; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 15px 0;">
            ${planInfo.buttonText}
          </a>
        </div>
      </div>
    </div>


    <div class="section">
      <h4 style="margin: 0 0 15px 0; color: #1e293b;">📋 ご利用方法</h4>
      <ol style="margin: 0; padding-left: 20px; color: #475569;">
        <li style="margin-bottom: 10px;">
          上記の「${planInfo.buttonText}」ボタンをクリック
        </li>
        <li style="margin-bottom: 10px;">
          メールアドレス <strong>${email}</strong> を入力してマジックリンクを受信
        </li>
        <li style="margin-bottom: 10px;">
          ${planInfo.usageInstructions}
        </li>
      </ol>
    </div>


    <div class="section">
      <h4 style="margin: 0 0 15px 0; color: #1e293b;">📞 サポート</h4>
      <p style="margin: 0; color: #475569; line-height: 1.8;">
        ご不明な点やログインできない場合は、お気軽にお問い合わせください。<br>
        📧 <a href="mailto:support@keiba.link" style="color: #3b82f6;">support@keiba.link</a>
      </p>
    </div>

    <div class="footer">
      <p><strong>NANKANアナリティクス</strong></p>
      <p>AI・機械学習で勝つ。南関競馬の次世代予想プラットフォーム</p>
      <p><a href="https://nankan-analytics.keiba.link" style="color: #3b82f6; text-decoration: none;">https://nankan-analytics.keiba.link</a></p>
      <p style="margin-top: 15px; font-size: 0.85rem; color: #94a3b8;">
        ※このメールは入金確認後に自動送信されています
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * プラン別の情報を取得
 */
function getPlanInfo(productName, planType) {
  const baseUrl = 'https://nankan-analytics.keiba.link';

  // Standard
  if (productName.includes('Standard')) {
    return {
      loginUrl: `${baseUrl}/dashboard/`,
      buttonText: 'ダッシュボードにログイン',
      usageInstructions: '後半3レース（10R、11R、12R）の予想データにアクセス可能です'
    };
  }

  // Premium
  if (productName.includes('Premium') && !productName.includes('Sanrenpuku') && !productName.includes('Combo') && !productName.includes('Plus')) {
    return {
      loginUrl: `${baseUrl}/dashboard/`,
      buttonText: 'ダッシュボードにログイン',
      usageInstructions: '全レース（1R〜12R）の予想データと穴馬データにアクセス可能です'
    };
  }

  // Premium Sanrenpuku
  if (productName.includes('Premium Sanrenpuku') || productName.includes('Sanrenpuku')) {
    return {
      loginUrl: `${baseUrl}/dashboard/`,
      buttonText: 'ダッシュボードにログイン',
      usageInstructions: '全レース（1R〜12R）の予想データ + 三連複予想 + 穴馬データにアクセス可能です'
    };
  }

  // Premium Combo
  if (productName.includes('Premium Combo') || productName.includes('Combo')) {
    return {
      loginUrl: `${baseUrl}/dashboard/`,
      buttonText: 'ダッシュボードにログイン',
      usageInstructions: '全レース（1R〜12R）の予想データ + 三連複予想 + 穴馬データ + Combo限定コンテンツにアクセス可能です'
    };
  }

  // Premium Plus
  if (productName.includes('Premium Plus') || productName.includes('Plus')) {
    return {
      loginUrl: `${baseUrl}/premium-plus/`,
      buttonText: 'Premium Plus ページにアクセス',
      usageInstructions: 'Premium Plus専用の超高精度予想データと実績画像（直近5戦）にアクセスできます。単品商品のため永久アクセス可能です'
    };
  }

  // デフォルト
  return {
    loginUrl: `${baseUrl}/dashboard/`,
    buttonText: 'ダッシュボードにログイン',
    usageInstructions: 'ダッシュボードから各種予想データにアクセスできます'
  };
}
