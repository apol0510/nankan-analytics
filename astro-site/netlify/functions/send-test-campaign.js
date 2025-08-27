/**
 * Netlify Function: キャンペーンメール送信テスト
 * POST /.netlify/functions/send-test-campaign
 */

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // OPTIONS リクエストの処理（CORS対応）
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Method not allowed'
            })
        };
    }

    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'BREVO_API_KEY環境変数が設定されていません'
            })
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { email, plan = 'free' } = body;

        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'メールアドレスが必要です'
                })
            };
        }

        // トランザクションメール送信
        const emailData = {
            sender: {
                name: 'NANKANアナリティクス',
                email: 'test@nankan-analytics.keiba.link'
            },
            to: [{
                email: email,
                name: 'テストユーザー'
            }],
            subject: '【NANKAN】会員登録完了のお知らせ',
            htmlContent: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                        .plan-badge { display: inline-block; background: #10b981; color: white; padding: 5px 15px; border-radius: 20px; margin: 10px 0; }
                        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
                        .feature-list { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
                        .feature-list li { margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🏇 NANKANアナリティクス</h1>
                            <p>AI予想プラットフォームへようこそ</p>
                        </div>
                        <div class="content">
                            <h2>会員登録が完了しました</h2>
                            <div class="plan-badge">${plan.toUpperCase()}プラン</div>
                            
                            <p>この度はNANKANアナリティクスにご登録いただき、誠にありがとうございます。</p>
                            
                            <div class="feature-list">
                                <h3>ご利用可能な機能：</h3>
                                <ul>
                                    ${plan === 'free' ? `
                                        <li>メインレース（11R）のAI予想</li>
                                        <li>基本的な予想データ閲覧</li>
                                    ` : ''}
                                    ${plan === 'standard' ? `
                                        <li>後半3レース（10R-12R）のAI予想</li>
                                        <li>詳細な予想データ</li>
                                        <li>投資戦略情報</li>
                                    ` : ''}
                                    ${plan === 'premium' ? `
                                        <li>全レースのAI予想</li>
                                        <li>完全な予想データアクセス</li>
                                        <li>投資戦略情報</li>
                                        <li>優先サポート</li>
                                    ` : ''}
                                </ul>
                            </div>
                            
                            <a href="https://nankan-analytics.keiba.link" class="button">サイトにアクセス</a>
                            
                            <div class="footer">
                                <p>© 2025 NANKANアナリティクス. All rights reserved.</p>
                                <p>お問い合わせ: support@nankan-analytics.keiba.link</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `,
            textContent: `NANKANアナリティクスへようこそ！\n\n会員登録が完了しました。\nプラン: ${plan.toUpperCase()}\n\nサイトURL: https://nankan-analytics.keiba.link`
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

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `テストキャンペーンを送信しました`,
                data: {
                    email: {
                        messageId: result.messageId,
                        to: email
                    },
                    senderUsed: 'test@nankan-analytics.keiba.link',
                    plan: plan
                }
            })
        };

    } catch (error) {
        console.error('キャンペーン送信エラー:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: error.message,
                error: error.toString()
            })
        };
    }
};