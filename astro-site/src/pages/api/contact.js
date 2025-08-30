import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function POST({ request }) {
    try {
        const { name, email, subject, message } = await request.json();

        // 入力バリデーション（最低限）
        if (!email || !subject || !message) {
            return new Response(
                JSON.stringify({ ok: false, error: 'Missing required fields' }),
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
                JSON.stringify({ ok: false, error: '有効なメールアドレスを入力してください' }),
                { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // SendGrid API Key の確認
        if (!process.env.SENDGRID_API_KEY) {
            console.error('SENDGRID_API_KEY is not configured');
            return new Response(
                JSON.stringify({ 
                    ok: false,
                    error: 'メール送信設定が不完全です。管理者にお問い合わせください。'
                }),
                { 
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        console.log('Reply-To設定用email確認:', email);

        // ここを「自ドメインの送信元 + お客様をReply-To」にするのが肝
        // ※ support@keiba.link は SendGrid側で「シングルセンダー」または「ドメイン認証」済みに
        const adminMsg = {
            to: 'nankan.analytics@gmail.com',             // 管理者宛
            from: { email: 'support@keiba.link', name: 'お問い合わせ通知' }, // 送信元は自ドメイン
            subject: `【お問い合わせ】${subject}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
                        新しいお問い合わせがありました
                    </h2>
                    
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 10px 0;"><strong>お名前:</strong> ${name || '(未入力)'}</p>
                        <p style="margin: 10px 0;"><strong>メールアドレス:</strong> ${email}</p>
                        <p style="margin: 10px 0;"><strong>件名:</strong> ${subject}</p>
                    </div>
                    
                    <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                        <h3 style="color: #333; margin-top: 0;">お問い合わせ内容:</h3>
                        <pre style="white-space: pre-wrap; color: #555; line-height: 1.6; font-family: inherit; margin: 0;">${message}</pre>
                    </div>
                    
                    <div style="margin-top: 30px; padding: 15px; background: #e6f2ff; border-radius: 8px;">
                        <p style="margin: 0; color: #666; font-size: 14px;">
                            このメールは NANKANアナリティクス のお問い合わせフォームから送信されました。
                        </p>
                    </div>
                </div>
            `,
            // ★ 返信先を「お客様のメール」に固定
            replyTo: { email, name: name || undefined },

            // 念のための保険（なくてもOKだが、環境やゲートウェイ次第で役立つことがある）
            headers: { 'Reply-To': email },
        };

        // （任意）お客様への自動返信
        const userMsg = {
            to: email,
            from: { email: 'support@keiba.link', name: 'NANKANアナリティクス お問い合わせ窓口' },
            subject: `【自動返信】お問い合わせを受け付けました`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
                        お問い合わせありがとうございます
                    </h2>
                    
                    <p style="color: #555; line-height: 1.6;">
                        ${name || 'お客様'} 様
                    </p>
                    
                    <p style="color: #555; line-height: 1.6;">
                        この度は、NANKANアナリティクスへお問い合わせいただき、誠にありがとうございます。<br>
                        以下の内容でお問い合わせを受け付けました。
                    </p>
                    
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 10px 0;"><strong>件名:</strong> ${subject}</p>
                        <div style="background: #fff; padding: 15px; border-radius: 4px; margin-top: 10px;">
                            <pre style="white-space: pre-wrap; color: #555; line-height: 1.6; font-family: inherit; margin: 0;">${message}</pre>
                        </div>
                    </div>
                    
                    <p style="color: #555; line-height: 1.6;">
                        担当者より2営業日以内にご返信させていただきます。順次ご返信いたします。
                    </p>
                    
                    <div style="margin-top: 30px; padding: 15px; background: #f0f0f0; border-radius: 8px;">
                        <p style="margin: 5px 0; color: #666; font-size: 14px;">
                            <strong>NANKANアナリティクス カスタマーサポート</strong><br>
                            メール: support@keiba.link<br>
                            営業時間: 平日 10:00 - 18:00
                        </p>
                    </div>
                </div>
            `,
            replyTo: { email: 'nankan.analytics@gmail.com', name: 'NANKANアナリティクス サポート' }
        };

        // SendGrid でメール送信
        console.log('管理者向けメール送信開始');
        await sgMail.send(adminMsg);
        console.log('管理者向けメール送信完了');

        console.log('ユーザー向けメール送信開始');
        await sgMail.send(userMsg);
        console.log('ユーザー向けメール送信完了');

        return new Response(
            JSON.stringify({ ok: true, message: 'お問い合わせを送信しました' }),
            { 
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (err) {
        console.error('SendGrid error', err?.response?.body || err);
        return new Response(
            JSON.stringify({ 
                ok: false, 
                error: 'Internal Server Error',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
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
        JSON.stringify({ ok: false, error: 'Method not allowed' }),
        { 
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        }
    );
}