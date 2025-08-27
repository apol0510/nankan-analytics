// メール通知システム
// Resend APIを使用してメール送信を行う

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
const FROM_EMAIL = import.meta.env.FROM_EMAIL || 'noreply@nankan-analytics.com';

// メールテンプレート定義
const EMAIL_TEMPLATES = {
    WELCOME: {
        subject: '🤖 NANKANアナリティクスへようこそ！AI競馬予想の世界へ',
        getHtml: (userData) => `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                <!-- ヘッダー -->
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🤖</div>
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">NANKANアナリティクス</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">AI技術で競馬予想を科学する</p>
                </div>
                
                <!-- メインコンテンツ -->
                <div style="padding: 40px 30px;">
                    <h2 style="color: #1e293b; margin: 0 0 24px; font-size: 24px;">ようこそ、${userData.email}さん！</h2>
                    
                    <p style="color: #64748b; line-height: 1.8; margin: 0 0 20px;">
                        NANKANアナリティクスにご登録いただき、ありがとうございます。<br>
                        AI・機械学習技術を活用した競馬予想の世界へようこそ！
                    </p>
                    
                    <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; margin: 24px 0;">
                        <h3 style="color: #1e293b; margin: 0 0 16px; font-size: 18px;">🎯 無料でできること</h3>
                        <ul style="color: #64748b; margin: 0; padding-left: 20px; line-height: 1.8;">
                            <li>メインレース（11R）のAI予想閲覧</li>
                            <li>基本的な分析データの確認</li>
                            <li>週1回のメールマガジン受信</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="https://nankan-analytics.keiba.link/free-prediction" 
                           style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            🏇 今日の無料予想を見る
                        </a>
                    </div>
                    
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 32px;">
                        <h3 style="color: #1e293b; margin: 0 0 16px; font-size: 18px;">⚡ さらに詳細な予想をお求めの方へ</h3>
                        <p style="color: #64748b; line-height: 1.8; margin: 0 0 16px;">
                            スタンダード・プレミアムプランで、より高精度なAI予想をご利用いただけます。
                        </p>
                        <a href="https://nankan-analytics.keiba.link/pricing" 
                           style="color: #3b82f6; text-decoration: underline; font-weight: 600;">
                            料金プランを確認する →
                        </a>
                    </div>
                </div>
                
                <!-- フッター -->
                <div style="background: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #64748b; margin: 0 0 8px; font-size: 14px;">
                        ご質問やサポートが必要でしたら、お気軽にお問い合わせください。
                    </p>
                    <p style="color: #64748b; margin: 0; font-size: 14px;">
                        📧 <a href="mailto:support@nankan-analytics.com" style="color: #3b82f6;">support@nankan-analytics.com</a>
                    </p>
                </div>
            </div>
        </div>`
    },

    PAYMENT_SUCCESS: {
        subject: '✅ 決済完了のお知らせ - NANKANアナリティクス',
        getHtml: (userData) => `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                <!-- ヘッダー -->
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">決済が完了しました</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">プレミアム機能をお楽しみください</p>
                </div>
                
                <!-- メインコンテンツ -->
                <div style="padding: 40px 30px;">
                    <h2 style="color: #1e293b; margin: 0 0 24px; font-size: 24px;">ありがとうございます！</h2>
                    
                    <p style="color: #64748b; line-height: 1.8; margin: 0 0 24px;">
                        ${userData.planName}プランへのアップグレードが完了しました。<br>
                        より高精度なAI予想をご利用いただけます。
                    </p>
                    
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin: 24px 0;">
                        <h3 style="color: #166534; margin: 0 0 16px; font-size: 18px;">🎉 ご利用いただける機能</h3>
                        <div style="color: #166534;">${userData.features}</div>
                    </div>
                    
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="https://nankan-analytics.keiba.link/dashboard" 
                           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; margin-right: 12px;">
                            📊 ダッシュボード
                        </a>
                        <a href="${userData.planName === 'プレミアム' ? 'https://nankan-analytics.keiba.link/premium-predictions' : 'https://nankan-analytics.keiba.link/standard-predictions'}" 
                           style="display: inline-block; background: transparent; color: #10b981; border: 2px solid #10b981; text-decoration: none; padding: 12px 26px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            🏇 ${userData.planName}予想
                        </a>
                    </div>
                    
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 32px;">
                        <h3 style="color: #1e293b; margin: 0 0 16px; font-size: 18px;">📋 プラン詳細</h3>
                        <p style="color: #64748b; margin: 0 0 8px;">プラン: <strong>${userData.planName}</strong></p>
                        <p style="color: #64748b; margin: 0 0 8px;">金額: <strong>¥${userData.amount}</strong></p>
                        <p style="color: #64748b; margin: 0;">次回請求日: <strong>${userData.nextBillingDate}</strong></p>
                    </div>
                </div>
                
                <!-- フッター -->
                <div style="background: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #64748b; margin: 0 0 12px; font-size: 14px;">
                        <a href="https://nankan-analytics.keiba.link/account" style="color: #3b82f6;">アカウント管理</a> | 
                        <a href="mailto:support@nankan-analytics.com" style="color: #3b82f6;">サポート</a>
                    </p>
                </div>
            </div>
        </div>`
    },

    NEWSLETTER: {
        subject: '📊 今週のAI競馬予想レポート - NANKANアナリティクス',
        getHtml: (newsletterData) => `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 40px 20px;">
            <div style="background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                <!-- ヘッダー -->
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
                    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">週間AI予想レポート</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">${newsletterData.date}</p>
                </div>
                
                <!-- メインコンテンツ -->
                <div style="padding: 30px;">
                    <h2 style="color: #1e293b; margin: 0 0 20px; font-size: 20px;">今週のハイライト</h2>
                    
                    <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 20px 0;">
                        <h3 style="color: #1e293b; margin: 0 0 12px; font-size: 16px;">🎯 的中実績</h3>
                        <p style="color: #64748b; margin: 0; line-height: 1.6;">${newsletterData.results}</p>
                    </div>
                    
                    <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0;">
                        <h3 style="color: #166534; margin: 0 0 12px; font-size: 16px;">💰 収益実績</h3>
                        <p style="color: #166534; margin: 0; line-height: 1.6;">${newsletterData.profits}</p>
                    </div>
                    
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="https://nankan-analytics.keiba.link/free-prediction" 
                           style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                            今日の予想を確認
                        </a>
                    </div>
                </div>
            </div>
        </div>`
    }
};

// メール送信関数（Resend API使用）
export async function sendEmail(to, templateType, data = {}) {
    if (!RESEND_API_KEY) {
        console.warn('RESEND_API_KEY is not configured');
        return { success: false, error: 'Email service not configured' };
    }

    const template = EMAIL_TEMPLATES[templateType];
    if (!template) {
        return { success: false, error: 'Invalid template type' };
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [to],
                subject: template.subject,
                html: template.getHtml(data),
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to send email');
        }

        return { success: true, messageId: result.id };
    } catch (error) {
        console.error('Email sending error:', error);
        return { success: false, error: error.message };
    }
}

// 便利な送信関数
export const emailService = {
    // ウェルカムメール
    async sendWelcomeEmail(userEmail) {
        return await sendEmail(userEmail, 'WELCOME', { email: userEmail });
    },

    // 決済完了メール
    async sendPaymentSuccessEmail(userEmail, planName, amount) {
        const features = planName === 'プレミアム' 
            ? '• 全12レース完全予想<br>• XGBoost×LSTM詳細分析<br>• 全期間データアクセス<br>• 毎日のメールマガジン'
            : '• 後半3レース予想<br>• AI信頼度スコア<br>• 過去30日データ<br>• 週2回メールマガジン';

        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        return await sendEmail(userEmail, 'PAYMENT_SUCCESS', {
            planName,
            amount,
            features,
            nextBillingDate: nextBillingDate.toLocaleDateString('ja-JP'),
        });
    },

    // ニュースレター送信
    async sendNewsletter(userEmail, weeklyData) {
        return await sendEmail(userEmail, 'NEWSLETTER', {
            date: new Date().toLocaleDateString('ja-JP'),
            results: weeklyData.results || '今週の的中率: 87%、回収率: 156%',
            profits: weeklyData.profits || '推奨投資額10,000円で15,600円のリターンを達成',
        });
    }
};

// バルクメール送信（複数の宛先）
export async function sendBulkEmails(recipients, templateType, data = {}) {
    const results = [];
    
    for (const recipient of recipients) {
        const result = await sendEmail(recipient, templateType, data);
        results.push({
            email: recipient,
            ...result
        });
        
        // APIレート制限対策（少し待機）
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
}