// Brevoメール送信テスト v2 (修正後確認用)
import { sendTransactionalEmail } from '../../src/lib/brevo-utils.js';

export const handler = async (event, context) => {
    console.log('📧 Brevoメール送信テストv2開始 - 送信者ドメイン修正版');
    
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
            to: 'apolone_bkm@yahoo.co.jp',
            subject: `🔧【修正版テスト】Brevo送信者ドメイン修正確認 - ${currentTime}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #10b981;">🔧 NANKANアナリティクス Brevo修正版テスト</h2>
                    
                    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                        <h3>📧 送信者ドメイン修正版テスト</h3>
                        <p><strong>送信時刻:</strong> ${currentTime}</p>
                        <p><strong>期待される送信者:</strong> nankan.analytics@gmail.com</p>
                        <p><strong>Reply-To:</strong> nankan.analytics@gmail.com</p>
                        <p><strong>修正内容:</strong> keiba.linkからgmail.comに変更</p>
                    </div>
                    
                    <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>✅ 確認項目</h3>
                        <ul>
                            <li>✅ 送信者がgmail.comドメインになっているか</li>
                            <li>✅ Brevoの9810869.brevosend.comが表示されていないか</li>
                            <li>✅ Reply-To機能が正常に動作するか</li>
                        </ul>
                    </div>
                    
                    <div style="background: #fef3c7; padding: 15px; border-radius: 8px;">
                        <p><strong>🧪 テスト手順:</strong></p>
                        <ol>
                            <li>この送信者がnankan.analytics@gmail.comになっているか確認</li>
                            <li>返信テストでGmailに届くか確認</li>
                        </ol>
                    </div>
                    
                    <hr style="margin: 30px 0;">
                    <p style="font-size: 12px; color: #666;">
                        NANKANアナリティクス - 送信者ドメイン修正版テスト<br>
                        修正版のテストメールです。
                    </p>
                </div>
            `,
            replyTo: 'nankan.analytics@gmail.com',
            fromName: 'NANKANアナリティクス [修正版]'
        };
        
        const result = await sendTransactionalEmail(testEmail);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Brevo修正版テストメール送信成功！',
                timestamp: new Date().toISOString(),
                version: 'v2 - 送信者ドメイン修正版',
                details: {
                    messageId: result.messageId,
                    to: testEmail.to,
                    subject: testEmail.subject,
                    expectedSender: 'nankan.analytics@gmail.com',
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
                error: '修正版メール送信に失敗しました',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};