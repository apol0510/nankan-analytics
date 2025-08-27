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
            to: [{
                email: email,
                name: 'テストユーザー'
            }],
            subject: '【南関】会員登録完了のお知らせ',
            htmlContent: `
                <!DOCTYPE html>
                <html lang="ja">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>南関アナリティクス - 会員登録完了</title>
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
                                            <h2 style="color:#2d3748;font-size:20px;margin:0 0 20px 0;">会員登録ありがとうございます</h2>
                                            
                                            <div style="background-color:#10b981;color:#ffffff;display:inline-block;padding:8px 20px;border-radius:20px;font-size:14px;margin-bottom:20px;">
                                                ${plan.toUpperCase()}プラン
                                            </div>
                                            
                                            <p style="color:#4a5568;line-height:1.8;margin:0 0 20px 0;">
                                                この度は南関アナリティクスにご登録いただき、誠にありがとうございます。<br>
                                                以下の機能がご利用いただけます。
                                            </p>
                                            
                                            <div style="background-color:#f7fafc;border-left:4px solid #4299e1;padding:15px;margin:20px 0;">
                                                <p style="color:#2b6cb0;font-weight:bold;margin:0 0 10px 0;">ご利用可能な機能：</p>
                                                <ul style="color:#4a5568;margin:0;padding-left:20px;">
                                                    ${plan === 'free' ? `
                                                        <li>メインレース（11R）のAI予想閲覧</li>
                                                        <li>基本的な予想データへのアクセス</li>
                                                        <li>競馬場情報の閲覧</li>
                                                    ` : ''}
                                                    ${plan === 'standard' ? `
                                                        <li>後半3レース（10R-12R）のAI予想</li>
                                                        <li>詳細な予想データと分析</li>
                                                        <li>投資戦略情報</li>
                                                        <li>過去の的中実績データ</li>
                                                    ` : ''}
                                                    ${plan === 'premium' ? `
                                                        <li>全レースのAI予想アクセス</li>
                                                        <li>完全な予想データと分析</li>
                                                        <li>高度な投資戦略情報</li>
                                                        <li>優先サポート</li>
                                                        <li>特別レポート配信</li>
                                                    ` : ''}
                                                </ul>
                                            </div>
                                            
                                            <p style="color:#4a5568;line-height:1.8;margin:20px 0;">
                                                今すぐサイトにアクセスして、AI予想をご確認ください。
                                            </p>
                                            
                                            <table cellpadding="0" cellspacing="0" border="0" style="margin:30px auto;">
                                                <tr>
                                                    <td style="background-color:#4299e1;border-radius:5px;text-align:center;">
                                                        <a href="https://nankan-analytics.keiba.link" style="color:#ffffff;text-decoration:none;display:block;padding:12px 30px;font-size:16px;">サイトへアクセス</a>
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            <p style="color:#718096;font-size:14px;margin:20px 0 0 0;">
                                                ※このメールは重要なお知らせです。<br>
                                                迷惑メールフォルダに振り分けられた場合は、<br>
                                                「迷惑メールではない」をクリックしてください。
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:20px;background-color:#f7fafc;border-top:1px solid #e2e8f0;">
                                            <p style="color:#718096;font-size:12px;margin:0;text-align:center;">
                                                このメールは南関アナリティクスから送信されています。<br>
                                                お問い合わせ: info@keiba.link<br>
                                                〒100-0001 東京都千代田区<br>
                                                <a href="https://nankan-analytics.keiba.link/unsubscribe" style="color:#4299e1;">配信停止</a> | 
                                                <a href="https://nankan-analytics.keiba.link/privacy" style="color:#4299e1;">プライバシーポリシー</a>
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
            textContent: `南関アナリティクス - 会員登録完了\n\nこの度は南関アナリティクスにご登録いただき、誠にありがとうございます。\n\n【ご登録プラン】\n${plan.toUpperCase()}プラン\n\n【ご利用可能な機能】\n${plan === 'free' ? '・メインレース（11R）のAI予想\n・基本的な予想データ閲覧\n・競馬場情報' : ''}${plan === 'standard' ? '・後半3レース（10R-12R）のAI予想\n・詳細な予想データ\n・投資戦略情報\n・過去の的中実績' : ''}${plan === 'premium' ? '・全レースのAI予想\n・完全な予想データ\n・高度な投資戦略\n・優先サポート\n・特別レポート' : ''}\n\n▼ サイトへアクセス\nhttps://nankan-analytics.keiba.link\n\n※このメールは重要なお知らせです。\n迷惑メールフォルダに振り分けられた場合は、\n「迷惑メールではない」をクリックしてください。\n\n────────────────────\n南関アナリティクス\nAI競馬予想プラットフォーム\n\nお問い合わせ: info@keiba.link\n配信停止: https://nankan-analytics.keiba.link/unsubscribe\n────────────────────`
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