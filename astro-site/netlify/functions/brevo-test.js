/**
 * Netlify Function: Brevo APIテスト
 * GET /.netlify/functions/brevo-test - 接続テスト
 * POST /.netlify/functions/brevo-test - メール送信テスト
 */

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    // GETリクエスト - 接続テスト
    if (event.httpMethod === 'GET') {
        try {
            // アカウント情報取得
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

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
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
                })
            };
        } catch (error) {
            console.error('Brevo APIテストエラー:', error);
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
    }

    // POSTリクエスト - メール送信テスト
    if (event.httpMethod === 'POST') {
        try {
            const body = JSON.parse(event.body || '{}');
            const testEmail = body.email || 'test@example.com';

            // トランザクションメール送信
            const emailData = {
                sender: {
                    name: '南関アナリティクス',
                    email: 'info@keiba.link'  // noreplyではなくinfoを使用
                },
                replyTo: {
                    email: 'info@keiba.link',  // supportよりinfoの方が信頼性高い
                    name: '南関アナリティクス'
                },
                headers: {
                    'X-Priority': '3',  // 通常優先度
                    'List-Unsubscribe': '<mailto:unsubscribe@keiba.link>',  // 配信停止リンク
                    'Precedence': 'bulk'  // 一括送信メールであることを明示
                },
                to: [
                    {
                        email: testEmail,
                        name: 'テストユーザー'
                    }
                ],
                subject: '【南関アナリティクス】システム連携テストのお知らせ',
                htmlContent: `
                    <!DOCTYPE html>
                    <html lang="ja">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>南関アナリティクス - システム連携テスト</title>
                    </head>
                    <body style="margin:0;padding:0;font-family:'メイリオ','Meiryo',sans-serif;background-color:#f5f5f5;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td align="center" style="padding:20px;">
                                    <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border:1px solid #e0e0e0;">
                                        <tr>
                                            <td style="padding:30px;background-color:#4a5568;color:#ffffff;text-align:center;">
                                                <h1 style="margin:0;font-size:24px;">南関アナリティクス</h1>
                                                <p style="margin:10px 0 0 0;font-size:14px;">AI競馬予想プラットフォーム</p>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding:30px;">
                                                <h2 style="color:#2d3748;font-size:20px;margin:0 0 20px 0;">システム連携テスト</h2>
                                                <p style="color:#4a5568;line-height:1.8;margin:0 0 20px 0;">
                                                    いつも南関アナリティクスをご利用いただき、ありがとうございます。<br>
                                                    このメールは、メール配信システムの動作確認のために送信されています。
                                                </p>
                                                <div style="background-color:#f7fafc;border-left:4px solid #4299e1;padding:15px;margin:20px 0;">
                                                    <p style="color:#2b6cb0;font-weight:bold;margin:0 0 10px 0;">確認項目：</p>
                                                    <ul style="color:#4a5568;margin:0;padding-left:20px;">
                                                        <li>メール到達確認</li>
                                                        <li>文字化けの有無</li>
                                                        <li>表示の正常性</li>
                                                    </ul>
                                                </div>
                                                <p style="color:#4a5568;line-height:1.8;margin:20px 0;">
                                                    正常にこのメールが届いていれば、システムは問題なく動作しています。
                                                </p>
                                                <table cellpadding="0" cellspacing="0" border="0" style="margin:30px auto;">
                                                    <tr>
                                                        <td style="background-color:#4299e1;border-radius:5px;text-align:center;">
                                                            <a href="https://nankan-analytics.keiba.link" style="color:#ffffff;text-decoration:none;display:block;padding:12px 30px;font-size:16px;">サイトへアクセス</a>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding:20px;background-color:#f7fafc;border-top:1px solid #e2e8f0;">
                                                <p style="color:#718096;font-size:12px;margin:0;text-align:center;">
                                                    このメールは南関アナリティクスから送信されています。<br>
                                                    お問い合わせ: info@keiba.link<br>
                                                    〒100-0001 東京都千代田区<br>
                                                    <a href="https://nankan-analytics.keiba.link/unsubscribe" style="color:#4299e1;">配信停止</a>
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                `,
                textContent: `南関アナリティクス - システム連携テスト

いつも南関アナリティクスをご利用いただき、ありがとうございます。

このメールは、メール配信システムの動作確認のために送信されています。

【確認項目】
・メール到達確認
・文字化けの有無
・表示の正常性

正常にこのメールが届いていれば、システムは問題なく動作しています。

▼ サイトへアクセス
https://nankan-analytics.keiba.link

────────────────────
南関アナリティクス
AI競馬予想プラットフォーム

お問い合わせ: info@keiba.link
配信停止: https://nankan-analytics.keiba.link/unsubscribe
────────────────────`
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
                    message: `テストメールを ${testEmail} に送信しました`,
                    messageId: result.messageId
                })
            };
        } catch (error) {
            console.error('Brevoメール送信エラー:', error);
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
    }

    // その他のメソッド
    return {
        statusCode: 405,
        headers,
        body: JSON.stringify({
            success: false,
            message: 'Method not allowed'
        })
    };
};