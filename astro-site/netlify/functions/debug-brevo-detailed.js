// Brevo詳細デバッグFunction - エラー詳細確認
export const handler = async (event, context) => {
    console.log('🔍 Brevo詳細デバッグ開始');
    
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
        const apiKey = process.env.BREVO_API_KEY;
        if (!apiKey) {
            throw new Error('BREVO_API_KEY環境変数が設定されていません');
        }
        
        const brevoHeaders = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'api-key': apiKey
        };
        
        console.log('📧 詳細メール送信テスト実行中...');
        
        // 詳細なメール送信テスト
        const emailPayload = {
            sender: {
                name: 'NANKANアナリティクス [デバッグ]',
                email: 'nankan.analytics@gmail.com'
            },
            to: [{ 
                email: 'apolone_bkm@yahoo.co.jp',
                name: 'テスト受信者'
            }],
            subject: `🔍【デバッグ】Brevo配信テスト - ${new Date().toLocaleString('ja-JP')}`,
            htmlContent: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #dc2626;">🔍 Brevo詳細デバッグテスト</h2>
                    
                    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
                        <h3>📧 配信テスト詳細</h3>
                        <p><strong>送信時刻:</strong> ${new Date().toLocaleString('ja-JP')}</p>
                        <p><strong>送信者:</strong> nankan.analytics@gmail.com</p>
                        <p><strong>API:</strong> Brevo Transactional Email</p>
                        <p><strong>目的:</strong> 未達原因の特定</p>
                    </div>
                    
                    <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>🔍 チェックポイント</h3>
                        <ul>
                            <li>Yahoo受信トレイ</li>
                            <li>Yahoo迷惑メール/スパムフォルダー</li>
                            <li>受信までの遅延</li>
                            <li>メールヘッダー情報</li>
                        </ul>
                    </div>
                    
                    <p><strong>このメールが届いていれば、Brevo送信は正常です！</strong></p>
                    
                    <hr style="margin: 30px 0;">
                    <p style="font-size: 12px; color: #666;">
                        NANKANアナリティクス - Brevoデバッグテスト
                    </p>
                </div>
            `,
            replyTo: { email: 'nankan.analytics@gmail.com' }
        };
        
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: brevoHeaders,
            body: JSON.stringify(emailPayload)
        });
        
        const responseText = await response.text();
        let responseData;
        
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            responseData = { raw_response: responseText };
        }
        
        const result = {
            timestamp: new Date().toISOString(),
            success: response.ok,
            status_code: response.status,
            status_text: response.statusText,
            response_data: responseData,
            request_payload: {
                sender: emailPayload.sender,
                to: emailPayload.to,
                subject: emailPayload.subject,
                reply_to: emailPayload.replyTo
            },
            debug_info: {
                api_url: 'https://api.brevo.com/v3/smtp/email',
                method: 'POST',
                headers: {
                    'Accept': brevoHeaders['Accept'],
                    'Content-Type': brevoHeaders['Content-Type'],
                    'api-key': '[MASKED]'
                }
            }
        };
        
        if (!response.ok) {
            console.error('❌ Brevo送信エラー:', responseData);
            result.error_analysis = {
                possible_causes: [
                    'APIキーの認証エラー',
                    '送信制限に達している',
                    'メールアドレスが無効',
                    'コンテンツがスパム判定',
                    'アカウント制限'
                ]
            };
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result, null, 2)
        };
        
    } catch (error) {
        console.error('❌ デバッグテストエラー:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'デバッグテストに失敗',
                details: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            })
        };
    }
};