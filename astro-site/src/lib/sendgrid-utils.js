// SendGrid共通送信ユーティリティ
// 全てのメール送信でReply-To設定を統一

import sgMail from '@sendgrid/mail';

// SendGrid初期化
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * SendGrid管理者向けメール送信（Reply-Toトリプル設定）
 * @param {Object} options - メール送信オプション
 * @param {string} options.name - 送信者名
 * @param {string} options.email - 送信者メールアドレス（Reply-To用）
 * @param {string} options.subject - 件名
 * @param {string} options.htmlBody - HTML本文
 * @returns {Promise<Object>} 送信結果
 */
async function sendAdmin({ name, email, subject, htmlBody }) {
    // バリデーション（空・不正なメールを弾く）
    const customerEmail = (email || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customerEmail)) {
        throw new Error('invalid customer email for replyTo');
    }

    const msg = {
        from: { email: 'support@keiba.link', name: 'NANKANアナリティクス システム' },
        to: 'nankan.analytics@gmail.com',
        subject: `【お問い合わせ】${subject}`,
        html: htmlBody,

        // ① トップレベル（@sendgrid/mail が正式対応）
        replyTo: { email: customerEmail, name: name || undefined },

        // ② personalizations 側にも明示（転送系や一部MTA対策の"保険"）
        personalizations: [{
            to: [{ email: 'nankan.analytics@gmail.com' }],
            reply_to: { email: customerEmail, name: name || undefined },
        }],

        // ③ 生ヘッダにもダブル指定（環境依存の最終保険）
        headers: { 'Reply-To': customerEmail },
        trackingSettings: { clickTracking: { enable: false, enableText: false } },
    };

    await sgMail.send(msg);
}

/**
 * SendGrid共通送信関数
 * @param {Object} options - メール送信オプション
 * @param {string} options.to - 送信先メールアドレス
 * @param {string} options.subject - 件名
 * @param {string} options.html - HTML本文
 * @param {string} options.replyTo - 返信先メールアドレス（任意）
 * @param {string} options.fromName - 送信者名（任意、デフォルト: "NANKANアナリティクス"）
 * @returns {Promise<Object>} 送信結果
 */
export async function sendEmail({ to, subject, html, replyTo, fromName = "NANKANアナリティクス" }) {
    if (!process.env.SENDGRID_API_KEY) {
        console.error('SENDGRID_API_KEY is not configured');
        return { 
            success: false, 
            error: 'メール送信設定が不完全です。管理者にお問い合わせください。' 
        };
    }

    try {
        // 基本メール設定（統一ポリシー: from=自ドメイン）
        const mailOptions = {
            to,
            from: { 
                email: 'support@keiba.link', 
                name: fromName 
            },
            subject,
            html,
        };

        // Reply-To設定（指定がある場合のみ）
        if (replyTo) {
            mailOptions.replyTo = { email: replyTo };
            mailOptions.headers = { 'Reply-To': replyTo }; // 保険として明示
        }

        console.log('SendGrid送信開始:', { to, subject, replyTo });
        await sgMail.send(mailOptions);
        console.log('SendGrid送信完了');

        return { success: true };
    } catch (error) {
        console.error('SendGrid送信エラー:', error?.response?.body || error);
        return { 
            success: false, 
            error: 'メール送信中にエラーが発生しました',
            details: error.message 
        };
    }
}

/**
 * お問い合わせメール送信（管理者向け + 自動返信）
 * @param {Object} contactData - お問い合わせデータ
 * @param {string} contactData.name - 送信者名
 * @param {string} contactData.email - 送信者メールアドレス
 * @param {string} contactData.subject - 件名
 * @param {string} contactData.message - メッセージ
 * @returns {Promise<Object>} 送信結果
 */
export async function sendContactEmail({ name, email, subject, message }) {
    // 管理者向けメール（トリプル設定で確実なReply-To）
    try {
        await sendAdmin({
            name,
            email,
            subject,
            htmlBody: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
                    新しいお問い合わせがありました
                </h2>
                
                <div style="background: #ff4444; color: white; padding: 15px; border-radius: 8px; margin: 10px 0; text-align: center;">
                    <p style="margin: 0; font-size: 16px; font-weight: bold;">
                        📧 返信先: ${email}
                    </p>
                    <p style="margin: 5px 0 0; font-size: 14px;">
                        このメールアドレスにコピー&ペーストして返信してください
                    </p>
                </div>
                
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
            `
        });

        const adminResult = { success: true };

        // お客様向け自動返信
        const userResult = await sendEmail({
            to: email,
            subject: '【自動返信】お問い合わせを受け付けました',
            replyTo: 'nankan.analytics@gmail.com', // ★管理者に返信が飛ぶ
            fromName: 'NANKANアナリティクス お問い合わせ窓口',
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
            `
        });

        return {
            success: adminResult.success && userResult.success,
            adminResult,
            userResult
        };
    } catch (error) {
        console.error('SendGrid contact email error:', error);
        return {
            success: false,
            error: error.message,
            adminResult: { success: false, error: error.message },
            userResult: { success: false, error: 'Admin email failed' }
        };
    }
}

/**
 * ウェルカムメール送信
 * @param {string} userEmail - ユーザーメールアドレス
 * @returns {Promise<Object>} 送信結果
 */
export async function sendWelcomeEmail(userEmail) {
    return await sendEmail({
        to: userEmail,
        subject: '🤖 NANKANアナリティクスへようこそ！AI競馬予想の世界へ',
        replyTo: 'nankan.analytics@gmail.com',
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
                <div style="background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 16px;">🤖</div>
                        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">NANKANアナリティクス</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">AI技術で競馬予想を科学する</p>
                    </div>
                    
                    <div style="padding: 40px 30px;">
                        <h2 style="color: #1e293b; margin: 0 0 24px; font-size: 24px;">ようこそ、${userEmail}さん！</h2>
                        
                        <p style="color: #64748b; line-height: 1.8; margin: 0 0 20px;">
                            NANKANアナリティクスにご登録いただき、ありがとうございます。<br>
                            AI・機械学習技術を活用した競馬予想の世界へようこそ！
                        </p>
                        
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="https://nankan-analytics.keiba.link/free-prediction" 
                               style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                🏇 今日の無料予想を見る
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `
    });
}