// 期限切れ通知システム（お客様＋マコさんへの自動通知）
// 実行タイミング: 毎日午前9時（cron-expiry-check.jsから呼び出し）

const Airtable = require('airtable');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.handler = async (event, context) => {
  console.log('🔔 期限切れ通知システム開始');

  try {
    // Airtable設定
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);

    // 今日の日付取得
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 期限切れユーザー検索（ExpiryDateが今日以前）
    const records = await base('Customers')
      .select({
        filterByFormula: `AND(
          {ExpiryDate},
          IS_BEFORE({ExpiryDate}, TODAY()),
          {プラン} != 'Free',
          NOT({ExpiryNotificationSent})
        )`,
        maxRecords: 100
      })
      .firstPage();

    console.log(`📊 期限切れユーザー: ${records.length}件`);

    let notifications = [];

    for (const record of records) {
      const email = record.get('Email');
      const plan = record.get('プラン');
      const expiryDate = record.get('ExpiryDate');

      console.log(`📧 期限切れ通知送信: ${email} (${plan}, 期限: ${expiryDate})`);

      // お客様への通知メール
      const customerEmail = {
        to: email,
        from: 'nankan-analytics@keiba.link',
        subject: '【重要】プランの有効期限が切れました - NANKANアナリティクス',
        html: generateCustomerEmail(email, plan, expiryDate),
        tracking_settings: {
          click_tracking: { enable: false, enable_text: false },
          open_tracking: { enable: false },
          subscription_tracking: { enable: false },
          ganalytics: { enable: false }
        }
      };

      // マコさんへの通知メール
      const adminEmail = {
        to: 'nankan-analytics@keiba.link',
        from: 'nankan-analytics@keiba.link',
        subject: `[管理者通知] ${email} 様のプランが期限切れになりました`,
        html: generateAdminEmail(email, plan, expiryDate),
        tracking_settings: {
          click_tracking: { enable: false, enable_text: false },
          open_tracking: { enable: false },
          subscription_tracking: { enable: false },
          ganalytics: { enable: false }
        }
      };

      try {
        // お客様への通知
        await sgMail.send(customerEmail);
        console.log(`✅ お客様通知送信成功: ${email}`);

        // マコさんへの通知
        await sgMail.send(adminEmail);
        console.log(`✅ 管理者通知送信成功: ${email}`);

        // Airtableに通知済みフラグを設定
        await base('Customers').update(record.id, {
          'ExpiryNotificationSent': true,
          'ExpiryNotificationDate': new Date().toISOString().split('T')[0]
        });

        notifications.push({
          email,
          plan,
          expiryDate,
          status: 'success'
        });

      } catch (emailError) {
        console.error(`❌ メール送信エラー (${email}):`, emailError);
        notifications.push({
          email,
          plan,
          expiryDate,
          status: 'error',
          error: emailError.message
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `期限切れ通知処理完了: ${notifications.length}件`,
        notifications
      }, null, 2)
    };

  } catch (error) {
    console.error('🚨 期限切れ通知システムエラー:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};

// お客様向けメール本文生成
function generateCustomerEmail(email, plan, expiryDate) {
  const planNames = {
    'Premium': 'プレミアム',
    'premium': 'プレミアム',
    'Standard': 'スタンダード',
    'standard': 'スタンダード'
  };

  const planName = planNames[plan] || plan;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .expiry-box { background: white; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .action-card { background: white; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 15px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 10px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ プランの有効期限が切れました</h1>
    </div>
    <div class="content">
      <p>いつもNANKANアナリティクスをご利用いただきありがとうございます。</p>

      <div class="expiry-box">
        <h3>有効期限情報</h3>
        <p><strong>お客様メールアドレス:</strong> ${email}</p>
        <p><strong>プラン:</strong> ${planName}会員</p>
        <p><strong>有効期限:</strong> ${expiryDate}</p>
        <p style="color: #ef4444; font-weight: bold;">現在は無料会員としてご利用いただけます。</p>
      </div>

      <h3>🔄 継続をご希望の場合</h3>
      <div class="action-card">
        <p>クレジットカード登録で自動更新（おすすめ）</p>
        <a href="https://nankan-analytics.keiba.link/pricing/" class="btn">今すぐプランを更新</a>
      </div>

      <h3>🚪 退会をご希望の場合</h3>
      <p>マイページの「退会処理」ボタンから退会申請を行ってください。</p>
      <p><a href="https://nankan-analytics.keiba.link/dashboard/">マイページへ</a></p>

      <div class="footer">
        <p>NANKANアナリティクス<br>
        Email: nankan-analytics@keiba.link</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

// 管理者向けメール本文生成
function generateAdminEmail(email, plan, expiryDate) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: monospace; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f3f4f6; }
    .info-box { background: white; border-left: 4px solid #3b82f6; padding: 15px; margin: 10px 0; }
    h2 { color: #1f2937; }
  </style>
</head>
<body>
  <div class="container">
    <h2>📊 期限切れ通知（管理者用）</h2>

    <div class="info-box">
      <p><strong>メールアドレス:</strong> ${email}</p>
      <p><strong>プラン:</strong> ${plan}</p>
      <p><strong>期限切れ日:</strong> ${expiryDate}</p>
      <p><strong>通知日時:</strong> ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
    </div>

    <h3>対応事項</h3>
    <ul>
      <li>お客様に期限切れ通知メールを自動送信しました</li>
      <li>Airtableの ExpiryNotificationSent フィールドをTRUEに更新しました</li>
      <li>必要に応じてフォローアップをご検討ください</li>
    </ul>

    <p>---<br>
    NANKANアナリティクス 期限切れ通知システム</p>
  </div>
</body>
</html>
  `;
}
