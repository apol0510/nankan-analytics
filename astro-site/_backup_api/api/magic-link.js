// マジックリンク送信API（Zapier Webhook経由）
export async function POST({ request }) {
    try {
        const { email } = await request.json();
        
        if (!email) {
            return new Response(JSON.stringify({ error: 'メールアドレスが必要です' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Zapier Webhookにリクエスト送信
        // ZapierでAirtableから顧客データ取得→認証リンク付きメール送信
        const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_MAGIC_LINK_WEBHOOK || 'YOUR_ZAPIER_WEBHOOK_URL';
        
        const response = await fetch(ZAPIER_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                timestamp: new Date().toISOString(),
                action: 'send_magic_link'
            })
        });

        if (!response.ok) {
            throw new Error('Webhook送信失敗');
        }

        return new Response(JSON.stringify({ 
            success: true,
            message: 'マジックリンクをメールで送信しました' 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('マジックリンク送信エラー:', error);
        return new Response(JSON.stringify({ 
            error: '一時的にアクセスできません' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}