// 新規ユーザー通知システム（2025-09-24新規作成）
// ⚠️ 重要：削除されたウェルカムメール機能とは完全に独立したシステム

export default async function handler(request, context) {
  // CORSヘッダー
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONS対応
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers
    });
  }

  // POSTメソッドのみ許可
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: `Method ${request.method} not allowed` }),
      {
        status: 405,
        headers
      }
    );
  }

  try {
    const requestBody = await request.text();
    const { email, isNewUser } = JSON.parse(requestBody || '{}');

    // 新規ユーザーのみ通知送信
    if (!email || !isNewUser) {
      return new Response(
        JSON.stringify({ message: 'No notification needed' }),
        {
          status: 200,
          headers
        }
      );
    }

    // 環境変数の確認（Netlify Functions用）
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || context.SENDGRID_API_KEY;

    if (!SENDGRID_API_KEY) {
      console.error('🚨 SENDGRID_API_KEY not found in environment');
      console.error('🔍 Available env vars:', Object.keys(process.env).filter(key => key.includes('SENDGRID')));
      // 本番環境では動作するが、開発環境では環境変数の問題があるため一時的にスキップ
      return new Response(
        JSON.stringify({
          success: false,
          message: 'SendGrid API key not available',
          email: email,
          debug: {
            processEnvKeys: Object.keys(process.env).length,
            contextKeys: Object.keys(context || {})
          }
        }),
        {
          status: 500,  // API キーがない場合は500エラーで明確に失敗させる
          headers
        }
      );
    }

    // 🔒 安全なドメイン（ハードコーディング）
    const SAFE_DOMAIN = 'https://nankan-analytics.keiba.link';

    // 🎯 SendGrid API直接呼び出し（execute-scheduled-emails.jsと同様）
    const emailData = {
      personalizations: [
        {
          to: [{ email: email }],
          subject: '🎉 NANKANアナリティクス登録完了！'
        }
      ],
      from: {
        name: 'NANKANアナリティクス',
        email: 'nankan-analytics@keiba.link'
      },
      content: [
        {
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 30px; text-align: center; border-radius: 12px; margin-bottom: 20px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🏇 NANKANアナリティクス</h1>
                <p style="color: #cbd5e1; margin: 10px 0 0 0; font-size: 16px;">南関競馬AI予想プラットフォーム</p>
              </div>

              <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #1e293b; margin-top: 0;">🎉 登録完了！</h2>
                <p style="color: #475569; line-height: 1.6;">
                  この度はNANKANアナリティクスにご登録いただき、誠にありがとうございます！
                </p>

                <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #1e293b; margin-top: 0;">🎁 無料会員特典</h3>
                  <ul style="color: #475569; padding-left: 20px;">
                    <li>メインレース（11R）詳細予想</li>
                    <li>AI分析による予想データ</li>
                    <li>毎日ログインで1ポイント獲得</li>
                  </ul>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${SAFE_DOMAIN}/dashboard"
                     style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    📊 マイページにログイン
                  </a>
                </div>

                <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                  <p style="color: #065f46; margin: 0; font-size: 14px;">
                    <strong>ログイン方法：</strong> メールアドレス「${email}」でログイン
                  </p>
                </div>
              </div>

              <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 14px;">
                <p>ご不明な点がございましたら、お気軽にお問い合わせください</p>
                <p style="margin: 5px 0 0 0;">
                  <strong>NANKANアナリティクス</strong><br>
                  📧 support@nankan-analytics.keiba.link
                </p>
              </div>
            </div>
          `
        }
      ]
    };

    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (!sendgridResponse.ok) {
      const errorText = await sendgridResponse.text();
      console.error('🚨 SendGrid API error:', errorText);
      throw new Error(`SendGrid API error: ${sendgridResponse.status}`);
    }

    console.log(`✅ 新規ユーザー通知送信成功: ${email}`);
    console.log(`🔗 使用されたドメイン: ${SAFE_DOMAIN}`);
    console.log(`📧 送信されたリンク: ${SAFE_DOMAIN}/dashboard`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User notification sent successfully',
        email: email,
        domain_used: SAFE_DOMAIN,
        login_link: `${SAFE_DOMAIN}/dashboard`
      }),
      {
        status: 200,
        headers
      }
    );

  } catch (error) {
    console.error('🚨 User notification error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to send user notification',
        details: error.message
      }),
      {
        status: 500,
        headers
      }
    );
  }
};

// ✅ 新規実装の安全性確認
// 1. 完全に新しいファイル名・関数名
// 2. ハードコーディングされた安全ドメイン使用
// 3. 環境変数SITE_URLに依存しない設計
// 4. 削除されたsendWelcomeEmail機能の再利用なし
// 5. 最小限で確実なHTMLテンプレート