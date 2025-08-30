import nodemailer from 'nodemailer';

export async function POST({ request }) {
    try {
        const { name, email, subject, message } = await request.json();

        // 入力値の検証
        if (!name || !email || !subject || !message) {
            return new Response(
                JSON.stringify({ error: '必須項目を入力してください' }),
                { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // メールアドレスの形式チェック
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return new Response(
                JSON.stringify({ error: '有効なメールアドレスを入力してください' }),
                { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // 環境変数の確認とログ出力
        console.log('環境変数チェック:', {
            SMTP_HOST: process.env.SMTP_HOST ? '設定済み' : '未設定',
            SMTP_PORT: process.env.SMTP_PORT ? '設定済み' : '未設定',
            SMTP_USER: process.env.SMTP_USER ? '設定済み' : '未設定',
            SMTP_PASS: process.env.SMTP_PASS ? '設定済み' : '未設定'
        });

        // 環境変数が設定されていない場合の処理
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('SMTP認証情報が不完全です。');
            return new Response(
                JSON.stringify({ 
                    error: 'メール送信設定が不完全です。管理者にお問い合わせください。',
                    debug: 'SMTP認証情報が設定されていません'
                }),
                { 
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // SendGrid SMTP設定（より確実な設定）
        const transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false, // SendGridは587ポートでstarttls
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            // SendGrid用の追加設定
            requireTLS: true,
            connectionTimeout: 10000,
            socketTimeout: 10000,
            logger: true,
            debug: true
        });

        // SMTP接続テスト
        try {
            await transporter.verify();
            console.log('SMTP接続成功');
        } catch (error) {
            console.error('SMTP接続エラー:', error);
            return new Response(
                JSON.stringify({ 
                    error: 'メール送信サーバーに接続できません',
                    debug: error.message
                }),
                { 
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // SendGridでは認証済みの送信者メールアドレスを使用する必要がある
        const fromEmail = 'support@keiba.link'; // SendGridで認証済みのアドレス

        // 管理者向けメール内容
        const adminMailOptions = {
            from: fromEmail,
            to: 'nankan.analytics@gmail.com',
            replyTo: email, // お客様のメールアドレスを返信先に設定
            subject: `【お問い合わせ】${subject}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
                        新しいお問い合わせがありました
                    </h2>
                    
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 10px 0;"><strong>お名前:</strong> ${name}</p>
                        <p style="margin: 10px 0;"><strong>メールアドレス:</strong> ${email}</p>
                        <p style="margin: 10px 0;"><strong>件名:</strong> ${subject}</p>
                    </div>
                    
                    <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                        <h3 style="color: #333; margin-top: 0;">お問い合わせ内容:</h3>
                        <p style="white-space: pre-wrap; color: #555; line-height: 1.6;">${message}</p>
                    </div>
                    
                    <div style="margin-top: 30px; padding: 15px; background: #e6f2ff; border-radius: 8px;">
                        <p style="margin: 0; color: #666; font-size: 14px;">
                            このメールは NANKANアナリティクス のお問い合わせフォームから送信されました。
                        </p>
                    </div>
                </div>
            `,
        };

        // 送信者への自動返信メール
        const userMailOptions = {
            from: fromEmail,
            to: email,
            subject: '【NANKANアナリティクス】お問い合わせを受け付けました',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
                        お問い合わせありがとうございます
                    </h2>
                    
                    <p style="color: #555; line-height: 1.6;">
                        ${name} 様
                    </p>
                    
                    <p style="color: #555; line-height: 1.6;">
                        この度は、NANKANアナリティクスへお問い合わせいただき、誠にありがとうございます。<br>
                        以下の内容でお問い合わせを受け付けました。
                    </p>
                    
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 10px 0;"><strong>件名:</strong> ${subject}</p>
                        <div style="background: #fff; padding: 15px; border-radius: 4px; margin-top: 10px;">
                            <p style="white-space: pre-wrap; color: #555; line-height: 1.6; margin: 0;">${message}</p>
                        </div>
                    </div>
                    
                    <p style="color: #555; line-height: 1.6;">
                        担当者より2営業日以内にご返信させていただきます。<br>
                        今しばらくお待ちくださいますようお願い申し上げます。
                    </p>
                    
                    <div style="margin-top: 30px; padding: 15px; background: #f0f0f0; border-radius: 8px;">
                        <p style="margin: 5px 0; color: #666; font-size: 14px;">
                            <strong>NANKANアナリティクス カスタマーサポート</strong><br>
                            メール: support@keiba.link<br>
                            営業時間: 平日 10:00 - 18:00
                        </p>
                    </div>
                    
                    <p style="color: #999; font-size: 12px; margin-top: 20px;">
                        ※このメールは自動送信されています。このメールに返信いただいても対応できませんのでご了承ください。
                    </p>
                </div>
            `,
        };

        // メール送信（順次実行で安全に）
        console.log('管理者向けメール送信開始');
        const adminResult = await transporter.sendMail(adminMailOptions);
        console.log('管理者向けメール送信完了:', adminResult.messageId);

        console.log('ユーザー向けメール送信開始');
        const userResult = await transporter.sendMail(userMailOptions);
        console.log('ユーザー向けメール送信完了:', userResult.messageId);

        return new Response(
            JSON.stringify({ success: true, message: 'お問い合わせを送信しました' }),
            { 
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (error) {
        console.error('メール送信エラー:', error);
        
        return new Response(
            JSON.stringify({ 
                error: 'メール送信中にエラーが発生しました',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }),
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// その他のHTTPメソッドは許可しない
export function GET() {
    return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        }
    );
}