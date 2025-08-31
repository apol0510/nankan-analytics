// Simple Stripe Webhook
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
    console.log('[webhook-simple] Received POST request');
    
    try {
        // 基本チェック
        const sig = request.headers.get('stripe-signature');
        console.log('[webhook-simple] Signature header:', sig ? 'present' : 'missing');
        
        if (!sig) {
            console.log('[webhook-simple] Returning 400 - missing signature');
            return new Response('missing signature', { status: 400 });
        }
        
        // 環境変数チェック
        const secret = import.meta.env.STRIPE_WEBHOOK_SECRET_TEST;
        console.log('[webhook-simple] Secret:', secret ? 'configured' : 'missing');
        
        if (!secret) {
            console.log('[webhook-simple] Returning 500 - missing secret');
            return new Response('missing STRIPE_WEBHOOK_SECRET', { status: 500 });
        }
        
        // Body読み取りテスト
        console.log('[webhook-simple] Reading body...');
        const body = await request.text();
        console.log('[webhook-simple] Body length:', body.length);
        
        // 成功レスポンス
        console.log('[webhook-simple] Returning 200 OK');
        return new Response(JSON.stringify({ 
            received: true, 
            bodyLength: body.length,
            timestamp: new Date().toISOString()
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('[webhook-simple] Error:', error);
        return new Response(`Error: ${error.message}`, { status: 500 });
    }
};