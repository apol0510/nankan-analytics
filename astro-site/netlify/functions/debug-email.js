export const handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        console.log('🔍 環境変数デバッグ開始');
        
        const apiKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.FROM_EMAIL;
        
        const debug = {
            hasResendKey: !!apiKey,
            resendKeyLength: apiKey ? apiKey.length : 0,
            resendKeyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : 'なし',
            hasFromEmail: !!fromEmail,
            fromEmail: fromEmail || 'nankan-analytics@keiba.link',
            timestamp: new Date().toISOString()
        };
        
        console.log('Debug info:', debug);
        
        if (!apiKey) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'RESEND_API_KEY環境変数が設定されていません',
                    debug
                })
            };
        }
        
        // 実際のAPI呼び出しテスト
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: `NANKANアナリティクス <${fromEmail || 'nankan-analytics@keiba.link'}>`,
                to: 'nankan.analytics@gmail.com',
                reply_to: 'nankan.analytics@gmail.com',
                subject: 'デバッグテスト - 返信機能確認',
                html: `
                    <h1>🔧 デバッグテストメール</h1>
                    <p>環境変数設定テスト</p>
                    <ul>
                        <li>送信者: ${fromEmail || 'nankan-analytics@keiba.link'}</li>
                        <li>API Key: ${debug.resendKeyPrefix}</li>
                        <li>送信時刻: ${debug.timestamp}</li>
                    </ul>
                    <p><strong>このメールに返信して機能確認をしてください。</strong></p>
                `
            })
        });

        const result = await response.json();
        
        if (!response.ok) {
            console.error('Resend APIエラー:', result);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: result,
                    debug
                })
            };
        }
        
        console.log('✅ デバッグメール送信成功:', result.id);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'デバッグメール送信成功',
                emailId: result.id,
                debug
            })
        };
        
    } catch (error) {
        console.error('デバッグテストエラー:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message,
                stack: error.stack
            })
        };
    }
};