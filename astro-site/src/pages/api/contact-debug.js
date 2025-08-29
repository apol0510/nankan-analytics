// デバッグ用お問い合わせAPI
export async function POST({ request }) {
    try {
        const { name, email, subject, message } = await request.json();

        // 基本的なバリデーション
        if (!name || !email || !subject || !message) {
            return new Response(
                JSON.stringify({ error: '必須項目を入力してください' }),
                { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // 環境変数の詳細確認
        const envInfo = {
            SMTP_HOST: process.env.SMTP_HOST || '未設定',
            SMTP_PORT: process.env.SMTP_PORT || '未設定', 
            SMTP_USER: process.env.SMTP_USER || '未設定',
            SMTP_PASS: process.env.SMTP_PASS ? '設定済み（' + process.env.SMTP_PASS.substring(0, 10) + '...)' : '未設定',
            NODE_ENV: process.env.NODE_ENV || '未設定',
            NETLIFY: process.env.NETLIFY || '未設定'
        };

        console.log('=== デバッグ情報 ===');
        console.log('受信データ:', { name, email, subject, message });
        console.log('環境変数:', envInfo);

        // SendGrid接続テスト（nodemailerなしで）
        try {
            // 簡単なSMTP接続チェック
            const testResult = {
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                user: process.env.SMTP_USER,
                authConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
            };

            console.log('SMTP設定テスト:', testResult);

            // SendGrid Web APIを使用したテスト送信
            if (process.env.SMTP_PASS && process.env.SMTP_PASS.startsWith('SG.')) {
                console.log('SendGrid APIキー検出 - Web API使用を推奨');
                
                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'デバッグモード: データ受信成功',
                        debug: {
                            receivedData: { name, email, subject },
                            environment: envInfo,
                            recommendation: 'SendGrid Web APIの使用を推奨します'
                        }
                    }),
                    { 
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'デバッグモード: 環境確認完了',
                    debug: {
                        receivedData: { name, email, subject },
                        environment: envInfo,
                        smtpTest: testResult
                    }
                }),
                { 
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }
            );

        } catch (testError) {
            console.error('接続テストエラー:', testError);
            
            return new Response(
                JSON.stringify({
                    error: '接続テストに失敗しました',
                    debug: {
                        testError: testError.message,
                        environment: envInfo
                    }
                }),
                { 
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

    } catch (error) {
        console.error('=== デバッグAPIエラー ===');
        console.error('エラー詳細:', error);
        console.error('スタック:', error.stack);

        return new Response(
            JSON.stringify({
                error: 'デバッグAPI内部エラー',
                details: error.message,
                stack: error.stack
            }),
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

export function GET() {
    return new Response(
        JSON.stringify({ 
            message: 'デバッグAPI - POSTメソッドでお問い合わせデータを送信してください',
            endpoints: {
                test: '/api/contact-debug',
                production: '/api/contact'
            }
        }),
        { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        }
    );
}