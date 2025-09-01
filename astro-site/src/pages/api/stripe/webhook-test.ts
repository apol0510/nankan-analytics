// シンプルなWebhookテストエンドポイント
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
    console.log('[webhook-test] Received request');
    console.log('[webhook-test] Headers:', Object.fromEntries(request.headers.entries()));
    
    const body = await request.text();
    console.log('[webhook-test] Body length:', body.length);
    
    return new Response(JSON.stringify({ 
        received: true,
        timestamp: new Date().toISOString()
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};