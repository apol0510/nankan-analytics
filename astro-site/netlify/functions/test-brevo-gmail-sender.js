// Brevo Gmail送信者テスト
import { sendTransactionalEmail } from '../../src/lib/brevo-utils.js';

export const handler = async (event, context) => {
    console.log('📧 Brevo Gmail送信者テスト開始');
    
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
            subject: `📧【Gmail送信者】Brevo一時修正版テスト - ${currentTime}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #059669;">📧 NANKANアナリティクス Gmail送信者テスト</h2>
                    
                    <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
                        <h3>📧 Gmail送信者での一時修正版</h3>
                        <p><strong>送信時刻:</strong> ${currentTime}</p>
                        <p><strong>送信者:</strong> nankan.analytics@gmail.com</p>
                        <p><strong>Reply-To:</strong> nankan.analytics@gmail.com</p>
                        <p><strong>理由:</strong> keiba.linkドメイン認証不完全</p>
                    </div>
                    
                    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>⚠️ 一時的な変更</h3>
                        <ul>
                            <li>送信者: Gmail認証済みアドレス使用</li>
                            <li>Brevoドメイン: brevosend.com ではなくGmail</li>
                            <li>配信性: 大幅に改善されるはず</li>
                        </ul>
                    </div>
                    
                    <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>🔧 今後の予定</h3>
                        <ol>
                            <li>DKIMレコード設定追加</li>
                            <li>keiba.linkドメイン完全認証</li>
                            <li>nankan-analytics@keiba.link での送信に戻す</li>
                        </ol>
                    </div>
                    
                    <p><strong>📨 テスト内容:</strong></p>
                    <p>このメールが正常に届き、返信が nankan.analytics@gmail.com の受信トレイに届くか確認してください。</p>
                    
                    <hr style="margin: 30px 0;">
                    <p style="font-size: 12px; color: #666;">
                        NANKANアナリティクス - Brevo統一システム（一時修正版）<br>
                        送信者・返信先ともに Gmail 統一
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
                message: 'Brevo Gmail送信者テスト成功！',
                timestamp: new Date().toISOString(),
                version: 'gmail-sender-temporary',
                details: {
                    messageId: result.messageId,
                    to: testEmail.to,
                    subject: testEmail.subject,
                    sender: 'nankan.analytics@gmail.com',
                    replyTo: 'nankan.analytics@gmail.com',
                    fromName: testEmail.fromName,
                    note: 'keiba.linkドメイン認証完了後に送信者をkeiba.linkに変更予定'
                }
            }, null, 2)
        };
        
    } catch (error) {
        console.error('❌ Gmail送信者テストエラー:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Gmail送信者テストに失敗',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};