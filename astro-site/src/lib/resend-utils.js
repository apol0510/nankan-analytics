// Resend統一メール送信システム
// マジックリンク認証とお問い合わせフォーム用

// メールアドレスバリデーション
function validateEmail(email) {
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    return emailRegex.test(email?.trim() || '');
}

// 統一メール送信関数（Resend API）
export async function sendEmail({ to, subject, html, replyTo, fromName = "NANKANアナリティクス" }) {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL || 'nankan-analytics@keiba.link';
    
    if (!apiKey) {
        console.error('RESEND_API_KEY環境変数が設定されていません');
        return { success: false, error: 'RESEND_API_KEY環境変数が設定されていません' };
    }
    
    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: `${fromName} <${fromEmail}>`,
                to: to,
                subject: subject,
                html: html,
                reply_to: replyTo || 'nankan.analytics@gmail.com'
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Resend APIエラー:', error);
            return { success: false, error: 'メール送信に失敗しました' };
        }

        const result = await response.json();
        console.log('✅ Resendメール送信成功:', result.id);
        return { success: true, id: result.id };
        
    } catch (error) {
        console.error('Resend送信エラー:', error);
        return { success: false, error: 'メール送信に失敗しました' };
    }
}

// お問い合わせメール送信
export async function sendContactEmail({ name, email, subject, message }) {
    if (!validateEmail(email)) {
        return { success: false, error: '有効なメールアドレスを入力してください' };
    }

    try {
        // 管理者向けメール
        const adminResult = await sendEmail({
            to: 'nankan.analytics@gmail.com',
            subject: `【お問い合わせ】${subject}`,
            replyTo: email,
            fromName: 'NANKANアナリティクス システム',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: sans-serif; line-height: 1.6; color: #333; }
                        .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 20px; text-align: center; }
                        .content { padding: 30px; background: #f9fafb; }
                        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
                        .message-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; }
                        pre { white-space: pre-wrap; word-wrap: break-word; font-family: monospace; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>🤖 NANKANアナリティクス</h1>
                        <p>新しいお問い合わせが届きました</p>
                    </div>
                    <div class="content">
                        <div class="info-box">
                            <h2>📧 送信者情報</h2>
                            <p><strong>お名前:</strong> ${name || '(未入力)'}</p>
                            <p><strong>メールアドレス:</strong> <a href="mailto:${email}">${email}</a></p>
                            <p><strong>件名:</strong> ${subject}</p>
                            <p><strong>受信日時:</strong> ${new Date().toLocaleString('ja-JP')}</p>
                        </div>
                        <div class="message-box">
                            <h3>📝 お問い合わせ内容</h3>
                            <pre>${message}</pre>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        // 自動返信メール
        const userResult = await sendEmail({
            to: email,
            subject: '【NANKANアナリティクス】お問い合わせを受け付けました',
            replyTo: 'nankan.analytics@gmail.com',
            fromName: 'NANKANアナリティクス',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
                        .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { padding: 30px; background: #f9fafb; }
                        .message-copy { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
                        .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px; }
                        pre { white-space: pre-wrap; word-wrap: break-word; }
                        .button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>🤖 NANKANアナリティクス</h1>
                        <p>お問い合わせありがとうございます</p>
                    </div>
                    <div class="content">
                        <p>${name || 'お客'}様</p>
                        
                        <p>この度はNANKANアナリティクスへお問い合わせいただき、誠にありがとうございます。</p>
                        <p>以下の内容でお問い合わせを受け付けました。</p>
                        
                        <div class="message-copy">
                            <h3>📝 お問い合わせ内容</h3>
                            <p><strong>件名:</strong> ${subject}</p>
                            <hr style="border: none; border-top: 1px solid #e5e7eb;">
                            <pre>${message}</pre>
                        </div>
                        
                        <p>担当者より<strong>2営業日以内</strong>にご返信させていただきます。</p>
                        <p>しばらくお待ちくださいませ。</p>
                        
                        <center>
                            <a href="https://nankan-analytics.keiba.link" class="button">
                                🏇 サイトトップへ
                            </a>
                        </center>
                    </div>
                    <div class="footer">
                        <p>NANKANアナリティクス - AI競馬予想システム</p>
                        <p>© 2025 NANKANアナリティクス. All rights reserved.</p>
                    </div>
                </body>
                </html>
            `
        });

        return {
            success: adminResult.success && userResult.success,
            adminResult,
            userResult
        };
        
    } catch (error) {
        console.error('お問い合わせメール送信エラー:', error);
        return {
            success: false,
            error: 'メール送信に失敗しました',
            adminResult: { success: false, error: error.message },
            userResult: { success: false, error: 'Failed to send auto-reply' }
        };
    }
}

// ウェルカムメール送信
export async function sendWelcomeEmail(userEmail) {
    return await sendEmail({
        to: userEmail,
        subject: '🤖 NANKANアナリティクスへようこそ！',
        replyTo: 'nankan.analytics@gmail.com',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: sans-serif; max-width: 600px; margin: 0 auto; }
                    .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; text-align: center; padding: 40px; }
                    .content { padding: 30px; background: #f9fafb; }
                    .button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; }
                    .features { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .feature-item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                    .feature-item:last-child { border-bottom: none; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🤖 NANKANアナリティクス</h1>
                    <p>AI技術で競馬予想を科学する</p>
                </div>
                <div class="content">
                    <h2>ようこそ、${userEmail}さん！</h2>
                    <p>NANKANアナリティクスにご登録いただき、ありがとうございます。</p>
                    
                    <div class="features">
                        <h3>🎁 ご利用可能なサービス</h3>
                        <div class="feature-item">📊 AIによる競馬予想</div>
                        <div class="feature-item">📈 データ分析レポート</div>
                        <div class="feature-item">🏇 無料予想の閲覧</div>
                        <div class="feature-item">💎 プレミアム機能へのアップグレード</div>
                    </div>
                    
                    <center style="margin: 30px 0;">
                        <a href="https://nankan-analytics.keiba.link/dashboard" class="button">
                            🏇 ダッシュボードを開く
                        </a>
                    </center>
                    
                    <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
                </div>
            </body>
            </html>
        `
    });
}