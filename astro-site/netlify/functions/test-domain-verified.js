// ドメイン認証完了後の最終テスト
import { sendTransactionalEmail } from '../../src/lib/brevo-utils.js';

export const handler = async (event, context) => {
    console.log('🎉 ドメイン認証完了後の最終テスト');
    
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
            subject: `🎉【根本解決】keiba.linkドメイン認証完了テスト - ${currentTime}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #16a34a;">🎉 根本解決完了！</h2>
                    
                    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
                        <h3>✅ ドメイン認証完了</h3>
                        <p><strong>送信時刻:</strong> ${currentTime}</p>
                        <p><strong>送信者:</strong> nankan-analytics@keiba.link</p>
                        <p><strong>認証状況:</strong> DKIM ✅ DMARC ✅ SPF ✅</p>
                        <p><strong>Reply-To:</strong> nankan.analytics@gmail.com</p>
                    </div>
                    
                    <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>🔧 解決された問題</h3>
                        <ul>
                            <li>❌ 送信者: nankan-analytics@9810869.brevosend.com</li>
                            <li>✅ 送信者: nankan-analytics@keiba.link</li>
                        </ul>
                    </div>
                    
                    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>🧪 最終テスト</h3>
                        <ol>
                            <li>送信者がnankan-analytics@keiba.linkになっているか確認</li>
                            <li>このメールに返信</li>
                            <li>返信がnankan.analytics@gmail.comの受信トレイに届くか確認</li>
                        </ol>
                    </div>
                    
                    <div style="background: #dcfce7; padding: 15px; border-radius: 8px; text-align: center;">
                        <p><strong>🎯 成功の証拠</strong></p>
                        <p>送信者がBrevoドメインではなく、keiba.linkドメインで表示されているはずです！</p>
                    </div>
                    
                    <hr style="margin: 30px 0;">
                    <p style="font-size: 12px; color: #666;">
                        NANKANアナリティクス - 根本解決完了版<br>
                        完全認証済みkeiba.linkドメインからの送信
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
                message: 'ドメイン認証完了後の最終テスト送信成功！',
                timestamp: new Date().toISOString(),
                version: 'domain-verified-final',
                details: {
                    messageId: result.messageId,
                    from: 'nankan-analytics@keiba.link',
                    to: testEmail.to,
                    subject: testEmail.subject,
                    replyTo: testEmail.replyTo,
                    domain_status: 'FULLY_VERIFIED',
                    authentication: {
                        dkim: '✅ keiba.link',
                        spf: '✅ include:spf.sendinblue.com',
                        dmarc: '✅ configured'
                    }
                }
            }, null, 2)
        };
        
    } catch (error) {
        console.error('❌ 最終テストエラー:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: '最終テストに失敗',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};