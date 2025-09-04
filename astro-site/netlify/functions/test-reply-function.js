// 返信機能テスト - 前回の状況復元
import { sendTransactionalEmail } from '../../src/lib/brevo-utils.js';

export const handler = async (event, context) => {
    console.log('🔄 返信機能テスト復元版');
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    try {
        const currentTime = new Date().toLocaleString('ja-JP');
        
        const testEmail = {
            to: 'nankan.analytics@gmail.com',
            subject: `🔄 返信機能テスト復元版 - ${currentTime}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3b82f6;">🔄 返信機能テスト復元</h2>
                    
                    <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                        <h3>📧 前回の設定復元</h3>
                        <p><strong>送信時刻:</strong> ${currentTime}</p>
                        <p><strong>送信者:</strong> nankan-analytics@keiba.link</p>
                        <p><strong>Reply-To:</strong> nankan.analytics@gmail.com</p>
                        <p><strong>宛先:</strong> nankan.analytics@gmail.com</p>
                    </div>
                    
                    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>🧪 テスト手順</h3>
                        <ol>
                            <li>このメールが届いているか確認</li>
                            <li>このメールに返信</li>
                            <li>返信先: nankan-analytics@keiba.link</li>
                            <li>返信が nankan.analytics@gmail.com の受信トレイに届くか確認</li>
                        </ol>
                    </div>
                    
                    <div style="background: #dcfce7; padding: 15px; border-radius: 8px;">
                        <p><strong>🎯 期待される動作:</strong></p>
                        <p>返信 → nankan-analytics@keiba.link → 転送 → nankan.analytics@gmail.com 受信トレイ</p>
                    </div>
                    
                    <p>前回のテストの続きです。返信機能が正常に動作するか確認してください。</p>
                    
                    <hr style="margin: 30px 0;">
                    <p style="font-size: 12px; color: #666;">
                        NANKANアナリティクス - 返信機能テスト復元版<br>
                        送信者: nankan-analytics@keiba.link
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
                message: '返信機能テスト復元版送信成功！',
                timestamp: new Date().toISOString(),
                version: 'reply-test-restored',
                details: {
                    messageId: result.messageId,
                    from: 'nankan-analytics@keiba.link',
                    to: testEmail.to,
                    subject: testEmail.subject,
                    replyTo: testEmail.replyTo,
                    expectedFlow: 'nankan.analytics@gmail.com → 返信 → nankan-analytics@keiba.link → 受信トレイ確認'
                }
            }, null, 2)
        };
        
    } catch (error) {
        console.error('❌ 返信テストエラー:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: '返信機能テストに失敗',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};