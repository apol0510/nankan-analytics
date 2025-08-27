/**
 * Brevoメールキャンペーン送信テスト
 * 実際の運用に近い形でのテスト
 */

import brevo from '../../lib/brevo.js';

export async function POST({ request }) {
    try {
        const body = await request.json();
        const { email, plan = 'free' } = body;

        if (!email) {
            return new Response(JSON.stringify({
                success: false,
                message: 'メールアドレスが必要です'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 1. 連絡先を追加
        const contactResult = await brevo.addContact(email, plan, {
            firstName: 'テスト',
            lastName: 'ユーザー'
        });

        // 2. トランザクションメール送信（個別送信）
        const apiKey = import.meta.env.BREVO_API_KEY;
        const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
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
                                    <p>〒000-0000 東京都</p>
                                    <p>お問い合わせ: support@nankan-analytics.keiba.link</p>
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
                textContent: `NANKANアナリティクスへようこそ！\n\n会員登録が完了しました。\nプラン: ${plan.toUpperCase()}\n\nサイトURL: https://nankan-analytics.keiba.link`
            })
        });

        const emailData = await emailResponse.json();

        return new Response(JSON.stringify({
            success: true,
            message: 'テストキャンペーンを送信しました',
            data: {
                contact: contactResult,
                email: {
                    messageId: emailData.messageId,
                    to: email
                },
                senderUsed: 'test@nankan-analytics.keiba.link'
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('キャンペーン送信エラー:', error);
        return new Response(JSON.stringify({
            success: false,
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function GET() {
    return new Response(JSON.stringify({
        message: 'POST /api/send-test-campaign',
        params: {
            email: 'required - 送信先メールアドレス',
            plan: 'optional - プラン名 (free/standard/premium)'
        }
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}