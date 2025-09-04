// Brevoメール送信テスト用Function
import { sendTransactionalEmail } from '../../src/lib/brevo-utils.js';

export const handler = async (event, context) => {
    console.log('📧 Brevoメール送信テスト開始');
    
    // CORSヘッダー設定
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // OPTIONSリクエスト（CORS preflight）
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    try {
        const testEmail = {
            to: 'apolone_bkm@yahoo.co.jp',
            subject: '🧪【テスト】Brevoメール送信統一テスト',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3b82f6;">🧪 NANKANアナリティクス Brevoテスト</h2>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>📧 メール送信統一テスト</h3>
                        <p><strong>送信時刻:</strong> ${new Date().toLocaleString('ja-JP')}</p>
                        <p><strong>送信者:</strong> NANKANアナリティクス</p>
                        <p><strong>Reply-To:</strong> nankan.analytics@gmail.com</p>
                    </div>
                    
                    <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>✅ テスト確認項目</h3>
                        <ul>
                            <li>✅ Brevo API接続</li>
                            <li>✅ メール送信機能</li>
                            <li>✅ HTML形式での配信</li>
                            <li>✅ Reply-To設定（Gmail受信）</li>
                        </ul>
                    </div>
                    
                    <p>このメールが正常に届いていれば、Brevoメール送信統一が完了しています！</p>
                    <p><strong>🔄 Reply-Toテスト:</strong> このメールに返信すると nankan.analytics@gmail.com に届くはずです。</p>
                    
                    <hr style="margin: 30px 0;">
                    <p style="font-size: 12px; color: #666;">
                        NANKANアナリティクス - AI競馬予想システム<br>
                        このメールに返信すると nankan.analytics@gmail.com に届きます。
                    </p>
                </div>
            `,
            replyTo: 'nankan.analytics@gmail.com',
            fromName: 'NANKANアナリティクス'
        };
        
        const result = await sendTransactionalEmail(testEmail);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Brevoテストメール送信成功！',
                timestamp: new Date().toISOString(),
                details: {
                    messageId: result.messageId,
                    to: testEmail.to,
                    subject: testEmail.subject,
                    replyTo: testEmail.replyTo
                }
            }, null, 2)
        };
        
    } catch (error) {
        console.error('❌ メール送信エラー:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'メール送信に失敗しました',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};