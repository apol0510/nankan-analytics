import sgMail from '@sendgrid/mail';

export async function POST({ request }) {
    try {
        const { email } = await request.json();
        
        console.log('=== SendGrid テスト開始 ===');
        console.log('テスト用メールアドレス:', email);
        
        // APIキーの確認
        const apiKey = process.env.SMTP_PASS;
        console.log('APIキーの形式:', apiKey ? `${apiKey.substring(0, 10)}...` : '未設定');
        
        if (!apiKey || !apiKey.startsWith('SG.')) {
            return new Response(
                JSON.stringify({
                    error: 'SendGrid APIキーが設定されていません',
                    debug: {
                        keyExists: !!apiKey,
                        keyFormat: apiKey ? apiKey.substring(0, 3) : 'なし'
                    }
                }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // SendGrid設定
        sgMail.setApiKey(apiKey);
        console.log('SendGrid APIキー設定完了');

        // シンプルなテストメール
        const testMsg = {
            to: email || 'support@keiba.link',
            from: 'support@keiba.link',
            subject: 'SendGrid テストメール',
            text: 'これはSendGridのテストメールです。正常に動作しています。',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3b82f6;">SendGrid テスト成功</h2>
                    <p>このメールが届いていれば、SendGridの設定は正常に動作しています。</p>
                    <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>テスト情報:</strong></p>
                        <ul>
                            <li>送信時刻: ${new Date().toLocaleString('ja-JP')}</li>
                            <li>送信先: ${email || 'support@keiba.link'}</li>
                            <li>送信元: support@keiba.link</li>
                        </ul>
                    </div>
                </div>
            `
        };

        console.log('メール送信準備完了:', {
            to: testMsg.to,
            from: testMsg.from,
            subject: testMsg.subject
        });

        // メール送信実行
        const result = await sgMail.send(testMsg);
        console.log('SendGrid レスポンス:', {
            statusCode: result[0].statusCode,
            headers: result[0].headers
        });

        // 成功レスポンス
        return new Response(
            JSON.stringify({
                success: true,
                message: 'テストメール送信成功',
                details: {
                    statusCode: result[0].statusCode,
                    messageId: result[0].headers['x-message-id'],
                    to: testMsg.to,
                    sentAt: new Date().toISOString()
                }
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('=== SendGrid テストエラー ===');
        console.error('エラー詳細:', error);
        
        let errorInfo = {
            message: error.message,
            code: error.code,
            statusCode: error.response?.status || 'unknown'
        };

        // SendGridの詳細エラー情報
        if (error.response && error.response.body) {
            console.error('SendGrid エラーボディ:', error.response.body);
            errorInfo.sendgridError = error.response.body;
        }

        return new Response(
            JSON.stringify({
                error: 'SendGrid テスト失敗',
                details: errorInfo,
                timestamp: new Date().toISOString()
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

export async function GET() {
    // 環境変数確認用
    const debug = {
        hasApiKey: !!process.env.SMTP_PASS,
        keyFormat: process.env.SMTP_PASS ? process.env.SMTP_PASS.substring(0, 10) + '...' : 'なし',
        nodeEnv: process.env.NODE_ENV,
        netlifyEnv: process.env.NETLIFY
    };

    return new Response(
        JSON.stringify({
            message: 'SendGrid テストエンドポイント',
            usage: 'POST { "email": "test@example.com" }',
            debug
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
}