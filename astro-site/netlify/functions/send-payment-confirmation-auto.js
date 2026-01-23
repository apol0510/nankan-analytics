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
    const paymentEmailSent = fields.PaymentEmailSent || false;

    console.log('📋 Record info:', { email, fullName, productName, paymentEmailSent });

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
    const planInfo = getPlanInfo(productName);

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
        value: generateEmailHTML(fullName, email, productName, planInfo, japanTime)
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
    // Step 4: PaymentEmailSent を true に更新 + ExpiryDate 設定
    // ========================================
    const updatePayload = {
      fields: {
        'PaymentEmailSent': true
      }
    };

    // 月額プランの場合のみ ExpiryDate を設定（Premium Plus はスキップ）
    if (!productName.includes('Premium Plus') && !productName.includes('Plus')) {
      const today = new Date();
      const expiryDate = new Date(today);
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      const expiryDateString = expiryDate.toISOString().split('T')[0];

      updatePayload.fields['ExpiryDate'] = expiryDateString;
      console.log('📅 ExpiryDate設定:', expiryDateString, 'for', productName);
    } else {
      console.log('💎 Premium Plus: ExpiryDate設定スキップ');
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
      if (updatePayload.fields['ExpiryDate']) {
        console.log('✅ ExpiryDate updated:', updatePayload.fields['ExpiryDate']);
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
function generateEmailHTML(fullName, email, productName, planInfo, japanTime) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; line-height: 1.8; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
    .section { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #10b981; }
    .info-row { padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .label { font-weight: bold; color: #475569; display: inline-block; width: 120px; }
    .value { color: #1e293b; }
    .highlight { background: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0; }
    .login-button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 15px 0; }
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
        <span class="value"><strong>${productName}</strong></span>
      </div>
      <div class="info-row" style="border-bottom: none;">
        <span class="label">ログインURL:</span>
        <div class="value" style="margin-top: 10px;">
          <a href="${planInfo.loginUrl}" class="login-button" target="_blank">
            ${planInfo.buttonText}
          </a>
        </div>
      </div>
    </div>

    ${planInfo.accessDetails ? `
    <div class="access-list">
      <h4 style="margin: 0 0 15px 0; color: #065f46;">📌 アクセス可能なコンテンツ</h4>
      ${planInfo.accessDetails}
    </div>
    ` : ''}

    <div class="section">
      <h4 style="margin: 0 0 15px 0; color: #1e293b;">📋 ご利用方法</h4>
      <ol style="margin: 0; padding-left: 20px; color: #475569;">
        <li style="margin-bottom: 10px;">
          上記の「${planInfo.buttonText}」ボタンをクリック
        </li>
        <li style="margin-bottom: 10px;">
          <strong>ログイン情報入力</strong><br>
          メールアドレス: <strong>${email}</strong><br>
          ${planInfo.passwordInfo || 'パスワードは登録時に設定したものをご使用ください'}
        </li>
        <li style="margin-bottom: 10px;">
          ${planInfo.usageInstructions}
        </li>
      </ol>
    </div>

    ${planInfo.additionalNotes ? `
    <div class="section">
      <h4 style="margin: 0 0 15px 0; color: #1e293b;">💡 追加情報</h4>
      ${planInfo.additionalNotes}
    </div>
    ` : ''}

    <div class="section">
      <h4 style="margin: 0 0 15px 0; color: #1e293b;">📞 サポート</h4>
      <p style="margin: 0; color: #475569; line-height: 1.8;">
        ご不明な点やログインできない場合は、お気軽にお問い合わせください。<br>
        📧 <a href="mailto:nankan.analytics@keiba.link" style="color: #3b82f6;">nankan.analytics@keiba.link</a>
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
function getPlanInfo(productName) {
  const baseUrl = 'https://nankan-analytics.keiba.link';

  // Standard
  if (productName.includes('Standard')) {
    return {
      loginUrl: `${baseUrl}/dashboard/`,
      buttonText: 'ダッシュボードにログイン',
      passwordInfo: 'パスワードは登録時に設定したものをご使用ください',
      usageInstructions: '後半3レース（10R、11R、12R）の予想データにアクセス可能です',
      accessDetails: `
        <ul style="margin: 0; padding-left: 20px; color: #065f46;">
          <li>後半3レース（10R、11R、12R）の予想データ</li>
          <li>Standard Predictions ページ</li>
        </ul>
      `,
      additionalNotes: `
        <p style="margin: 0; color: #475569; line-height: 1.8;">
          ✨ <strong>Premium会員へのアップグレード</strong>も可能です。<br>
          Premium会員になると、全レース（1R〜12R）の予想データにアクセスできます。
        </p>
      `
    };
  }

  // Premium
  if (productName.includes('Premium') && !productName.includes('Sanrenpuku') && !productName.includes('Combo') && !productName.includes('Plus')) {
    return {
      loginUrl: `${baseUrl}/dashboard/`,
      buttonText: 'ダッシュボードにログイン',
      passwordInfo: 'パスワードは登録時に設定したものをご使用ください',
      usageInstructions: '全レース（1R〜12R）の予想データにアクセス可能です',
      accessDetails: `
        <ul style="margin: 0; padding-left: 20px; color: #065f46;">
          <li>全レース（1R〜12R）の予想データ</li>
          <li>Premium Predictions ページ</li>
          <li>穴馬データ</li>
        </ul>
      `,
      additionalNotes: `
        <p style="margin: 0; color: #475569; line-height: 1.8;">
          ✨ <strong>Premium Sanrenpuku会員へのアップグレード</strong>も可能です。<br>
          三連複予想データと高精度な買い目が利用できます。
        </p>
      `
    };
  }

  // Premium Sanrenpuku
  if (productName.includes('Premium Sanrenpuku') || productName.includes('Sanrenpuku')) {
    return {
      loginUrl: `${baseUrl}/dashboard/`,
      buttonText: 'ダッシュボードにログイン',
      passwordInfo: 'パスワードは登録時に設定したものをご使用ください',
      usageInstructions: '全レース（1R〜12R）の予想データ + 三連複予想にアクセス可能です',
      accessDetails: `
        <ul style="margin: 0; padding-left: 20px; color: #065f46;">
          <li>全レース（1R〜12R）の予想データ</li>
          <li>三連複予想データ（高精度買い目）</li>
          <li>穴馬データ</li>
        </ul>
      `,
      additionalNotes: `
        <p style="margin: 0; color: #475569; line-height: 1.8;">
          ✨ <strong>Premium Plus（単品商品）</strong>もご購入いただけます。<br>
          Premium Sanrenpuku会員限定で、さらに高精度な予想データが利用可能です。
        </p>
      `
    };
  }

  // Premium Combo
  if (productName.includes('Premium Combo') || productName.includes('Combo')) {
    return {
      loginUrl: `${baseUrl}/dashboard/`,
      buttonText: 'ダッシュボードにログイン',
      passwordInfo: 'パスワードは登録時に設定したものをご使用ください',
      usageInstructions: '全レース（1R〜12R）の予想データ + 三連複予想にアクセス可能です',
      accessDetails: `
        <ul style="margin: 0; padding-left: 20px; color: #065f46;">
          <li>全レース（1R〜12R）の予想データ</li>
          <li>三連複予想データ（高精度買い目）</li>
          <li>穴馬データ</li>
          <li>Combo会員限定コンテンツ</li>
        </ul>
      `,
      additionalNotes: `
        <p style="margin: 0; color: #475569; line-height: 1.8;">
          ✨ <strong>Premium Plus（単品商品）</strong>もご購入いただけます。<br>
          Premium Combo会員限定で、さらに高精度な予想データが利用可能です。
        </p>
      `
    };
  }

  // Premium Plus
  if (productName.includes('Premium Plus') || productName.includes('Plus')) {
    return {
      loginUrl: `${baseUrl}/premium-plus/`,
      buttonText: 'Premium Plus ページにアクセス',
      passwordInfo: 'ログインは不要です。直接アクセスしてご覧ください',
      usageInstructions: 'Premium Plus専用の高精度予想データにアクセスできます',
      accessDetails: `
        <ul style="margin: 0; padding-left: 20px; color: #065f46;">
          <li>Premium Plus専用の超高精度予想データ</li>
          <li>実績画像（直近5戦）</li>
          <li>単品商品のため、追加料金なしで永久アクセス可能</li>
        </ul>
      `,
      additionalNotes: `
        <p style="margin: 0; color: #475569; line-height: 1.8;">
          💡 <strong>Premium Plus は単品商品です</strong><br>
          月額プランではなく、一度ご購入いただければ永久的にアクセス可能です。<br>
          Premium Sanrenpuku会員・Premium Combo会員のみが購入できる限定商品です。
        </p>
      `
    };
  }

  // デフォルト
  return {
    loginUrl: `${baseUrl}/dashboard/`,
    buttonText: 'ダッシュボードにログイン',
    passwordInfo: 'パスワードは登録時に設定したものをご使用ください',
    usageInstructions: 'ダッシュボードから各種予想データにアクセスできます',
    accessDetails: null,
    additionalNotes: null
  };
}
