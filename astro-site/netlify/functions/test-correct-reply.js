// 正しい返信先設定テスト
import { sendTransactionalEmail } from '../../src/lib/brevo-utils.js';

export const handler = async (event, context) => {
    console.log('📧 正しい返信先設定テスト');
    
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
            subject: `📧 返信先修正版テスト - ${currentTime}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3b82f6;">📧 返信先設定修正版</h2>
                    
                    <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                        <h3>✅ 正しい設定</h3>
                        <p><strong>送信時刻:</strong> ${currentTime}</p>
                        <p><strong>送信者:</strong> nankan-analytics@keiba.link</p>
                        <p><strong>返信先:</strong> nankan-analytics@keiba.link</p>
                        <p><strong>宛先:</strong> nankan.analytics@gmail.com</p>
                    </div>
                    
                    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>🔧 修正内容</h3>
                        <ul>
                            <li>❌ 返信先: nankan.analytics@gmail.com</li>
                            <li>✅ 返信先: nankan-analytics@keiba.link</li>
                        </ul>
                    </div>
                    
                    <div style="background: #dcfce7; padding: 20px; border-radius: 8px;">
                        <h3>🧪 テスト手順</h3>
                        <ol>
                            <li>このメールに返信</li>
                            <li>返信先がnankan-analytics@keiba.linkになっているか確認</li>
                            <li>送信して、Gmail受信確認</li>
                        </ol>
                    </div>
                    
                    <p>返信先がnankan-analytics@keiba.linkになっているはずです！</p>
                    
                    <hr style="margin: 30px 0;">
                    <p style="font-size: 12px; color: #666;">
                        NANKANアナリティクス - 返信先修正版
                    </p>
                </div>
            `,
            // Reply-Toを明示的に指定しない（デフォルトでkeiba.linkになる）
            fromName: 'NANKANアナリティクス'
        };
        
        const result = await sendTransactionalEmail(testEmail);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: '返信先修正版テスト送信成功！',
                timestamp: new Date().toISOString(),
                version: 'correct-reply-to',
                details: {
                    messageId: result.messageId,
                    from: 'nankan-analytics@keiba.link',
                    to: testEmail.to,
                    subject: testEmail.subject,
                    expectedReplyTo: 'nankan-analytics@keiba.link',
                    note: 'Reply-Toは送信者と同じkeiba.linkドメインになります'
                }
            }, null, 2)
        };
        
    } catch (error) {
        console.error('❌ 返信先テストエラー:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: '返信先テストに失敗',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};