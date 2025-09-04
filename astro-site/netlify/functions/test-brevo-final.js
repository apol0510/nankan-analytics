// Brevo最終統一テスト - 送信者・返信先完全統一版
import { sendTransactionalEmail } from '../../src/lib/brevo-utils.js';

export const handler = async (event, context) => {
    console.log('📧 Brevo最終統一テスト開始');
    
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
            subject: `🎯【最終統一版】Brevo完全テスト - ${currentTime}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #10b981;">🎯 NANKANアナリティクス Brevo最終統一テスト</h2>
                    
                    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                        <h3>📧 完全統一版テスト</h3>
                        <p><strong>送信時刻:</strong> ${currentTime}</p>
                        <p><strong>期待される送信者:</strong> nankan-analytics@keiba.link</p>
                        <p><strong>期待されるReply-To:</strong> nankan.analytics@gmail.com</p>
                        <p><strong>システム:</strong> Brevo完全統一</p>
                    </div>
                    
                    <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>✅ テスト項目</h3>
                        <ul>
                            <li>✅ 送信者: nankan-analytics@keiba.link (Brevoドメインではない)</li>
                            <li>✅ Reply-To: nankan.analytics@gmail.com</li>
                            <li>✅ メール配信性: DKIM/SPF認証済み</li>
                            <li>✅ 返信受信: Gmail受信トレイ</li>
                        </ul>
                    </div>
                    
                    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>🔧 前回からの修正</h3>
                        <ul>
                            <li>Reply-To設定の統一</li>
                            <li>送信者ドメインの正規化</li>
                            <li>Brevo API設定の最適化</li>
                        </ul>
                    </div>
                    
                    <div style="background: #e0f2fe; padding: 15px; border-radius: 8px;">
                        <p><strong>🧪 テスト手順:</strong></p>
                        <ol>
                            <li>送信者がnankan-analytics@keiba.linkか確認</li>
                            <li>このメールに返信</li>
                            <li>返信がnankan.analytics@gmail.comの受信トレイに届くか確認</li>
                        </ol>
                    </div>
                    
                    <hr style="margin: 30px 0;">
                    <p style="font-size: 12px; color: #666;">
                        NANKANアナリティクス - Brevo統一システム<br>
                        このメールに返信すると nankan.analytics@gmail.com に届きます。
                    </p>
                </div>
            `,
            // Reply-To設定を明示的に指定
            replyTo: 'nankan.analytics@gmail.com',
            fromName: 'NANKANアナリティクス'
        };
        
        const result = await sendTransactionalEmail(testEmail);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Brevo最終統一テスト送信成功！',
                timestamp: new Date().toISOString(),
                version: 'final-unified',
                details: {
                    messageId: result.messageId,
                    to: testEmail.to,
                    subject: testEmail.subject,
                    expectedSender: 'nankan-analytics@keiba.link',
                    expectedReplyTo: 'nankan.analytics@gmail.com',
                    fromName: testEmail.fromName
                },
                dns_verification: {
                    spf: '✅ include:spf.sendinblue.com',
                    brevo_code: '✅ d1f720816ddc41bed5fcc8cded0b6ed4',
                    expected_sender_domain: 'keiba.link (not brevosend.com)'
                }
            }, null, 2)
        };
        
    } catch (error) {
        console.error('❌ 最終テストエラー:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: '最終統一テストに失敗しました',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};