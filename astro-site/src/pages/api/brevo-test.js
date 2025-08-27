/**
 * Brevo APIテストエンドポイント
 * GET /api/brevo-test - 接続テストと統計情報取得
 * POST /api/brevo-test - テストメール送信
 */

export async function GET({ request }) {
    try {
        // 環境変数チェック
        const apiKey = import.meta.env.BREVO_API_KEY;
        
        if (!apiKey) {
            return new Response(JSON.stringify({
                success: false,
                message: 'BREVO_API_KEY環境変数が設定されていません'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // アカウント情報取得（接続テスト）
        const accountResponse = await fetch('https://api.brevo.com/v3/account', {
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!accountResponse.ok) {
            const errorText = await accountResponse.text();
            throw new Error(`Brevo API エラー: ${accountResponse.status} - ${errorText}`);
        }

        const accountData = await accountResponse.json();

        // リスト情報取得
        const listsResponse = await fetch('https://api.brevo.com/v3/contacts/lists', {
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        const listsData = listsResponse.ok ? await listsResponse.json() : { lists: [] };

        return new Response(JSON.stringify({
            success: true,
            message: 'Brevo API接続成功',
            data: {
                account: {
                    email: accountData.email,
                    company: accountData.companyName,
                    plan: accountData.plan?.[0]?.type || 'unknown',
                    credits: accountData.plan?.[0]?.credits || 0
                },
                lists: listsData.lists?.map(list => ({
                    id: list.id,
                    name: list.name,
                    totalSubscribers: list.totalSubscribers,
                    totalBlacklisted: list.totalBlacklisted
                })) || [],
                apiKeyMasked: apiKey.substring(0, 20) + '...'
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Brevo APIテストエラー:', error);
        return new Response(JSON.stringify({
            success: false,
            message: error.message,
            error: error.toString()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function POST({ request }) {
    try {
        const apiKey = import.meta.env.BREVO_API_KEY;
        
        if (!apiKey) {
            return new Response(JSON.stringify({
                success: false,
                message: 'BREVO_API_KEY環境変数が設定されていません'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // リクエストボディから送信先メールアドレスを取得
        const body = await request.json();
        const testEmail = body.email || 'test@example.com';

        // トランザクションメール送信
        const emailData = {
            sender: {
                name: 'NANKANアナリティクス',
                email: 'noreply@nankan-analytics.keiba.link'
            },
            to: [
                {
                    email: testEmail,
                    name: 'テストユーザー'
                }
            ],
            subject: 'Brevo API連携テスト',
            htmlContent: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎉 Brevo連携成功！</h1>
                        </div>
                        <div class="content">
                            <h2>テストメール送信完了</h2>
                            <p>NANKANアナリティクスのBrevo API連携が正常に動作しています。</p>
                            
                            <h3>✅ 確認済み項目</h3>
                            <ul>
                                <li>API認証: 成功</li>
                                <li>メール送信: 成功</li>
                                <li>テンプレート表示: 正常</li>
                            </ul>
                            
                            <p>このメールが届いていれば、メール配信システムは正常に動作しています。</p>
                            
                            <a href="https://nankan-analytics.keiba.link" class="button">サイトを見る</a>
                            
                            <div class="footer">
                                <p>© 2025 NANKANアナリティクス. All rights reserved.</p>
                                <p>このメールはテスト送信です。</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `,
            textContent: 'Brevo API連携テスト - このメールが届いていれば、システムは正常に動作しています。'
        };

        const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });

        if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            throw new Error(`メール送信エラー: ${emailResponse.status} - ${errorText}`);
        }

        const result = await emailResponse.json();

        return new Response(JSON.stringify({
            success: true,
            message: `テストメールを ${testEmail} に送信しました`,
            messageId: result.messageId
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Brevoメール送信エラー:', error);
        return new Response(JSON.stringify({
            success: false,
            message: error.message,
            error: error.toString()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}