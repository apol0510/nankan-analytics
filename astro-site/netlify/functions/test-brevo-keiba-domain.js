// Brevo keiba.linkドメイン送信テスト
import { sendTransactionalEmail } from '../../src/lib/brevo-utils.js';

export const handler = async (event, context) => {
    console.log('📧 Brevo keiba.linkドメイン送信テスト開始');
    
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
            subject: `🏇【keiba.linkドメイン】Brevo送信テスト - ${currentTime}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3b82f6;">🏇 NANKANアナリティクス keiba.linkテスト</h2>
                    
                    <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                        <h3>📧 keiba.linkドメイン送信テスト</h3>
                        <p><strong>送信時刻:</strong> ${currentTime}</p>
                        <p><strong>期待される送信者:</strong> nankan-analytics@keiba.link</p>
                        <p><strong>Reply-To:</strong> nankan.analytics@gmail.com</p>
                    </div>
                    
                    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>⚠️ DNS設定確認済み</h3>
                        <ul>
                            <li>✅ SPF: include:spf.sendinblue.com 設定済み</li>
                            <li>✅ Brevo認証コード: 設定済み</li>
                            <li>❌ DKIM: mail._domainkey.keiba.link 未設定</li>
                        </ul>
                    </div>
                    
                    <div style="background: #dcfce7; padding: 15px; border-radius: 8px;">
                        <p><strong>🧪 テスト内容:</strong></p>
                        <ol>
                            <li>送信者がnankan-analytics@keiba.linkになるか確認</li>
                            <li>メールが正常に届くか確認</li>
                            <li>DKIMレコード未設定の影響を確認</li>
                        </ol>
                    </div>
                    
                    <p>このメールが届いていれば、keiba.linkドメインでの送信が可能です！</p>
                    
                    <hr style="margin: 30px 0;">
                    <p style="font-size: 12px; color: #666;">
                        NANKANアナリティクス - keiba.linkドメインテスト<br>
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
                message: 'Brevo keiba.linkドメインテスト送信成功！',
                timestamp: new Date().toISOString(),
                domain: 'keiba.link',
                details: {
                    messageId: result.messageId,
                    to: testEmail.to,
                    subject: testEmail.subject,
                    expectedSender: 'nankan-analytics@keiba.link',
                    replyTo: testEmail.replyTo,
                    dns_status: {
                        spf: '✅ 設定済み',
                        brevo_code: '✅ 設定済み', 
                        dkim: '❌ 未設定'
                    }
                }
            }, null, 2)
        };
        
    } catch (error) {
        console.error('❌ メール送信エラー:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'keiba.linkドメインでのメール送信に失敗しました',
                details: error.message,
                timestamp: new Date().toISOString(),
                possible_cause: 'DKIMレコードが未設定のためメール認証に失敗している可能性があります'
            })
        };
    }
};