// 最小限のWebhookエンドポイント（Netlify Blobs対応）
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { saveMembershipData } from '../../../lib/membership/store.js';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY as string, { 
    apiVersion: '2024-04-10',
    timeout: 10000 // 10秒タイムアウト
});

export const POST: APIRoute = async ({ request }) => {
    try {
        console.log('[webhook-simple2] Received request');
        
        // 署名検証
        const sig = request.headers.get('stripe-signature');
        if (!sig) {
            return new Response('Missing signature', { status: 400 });
        }

        const secret = import.meta.env.STRIPE_WEBHOOK_SECRET_TEST || import.meta.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) {
            return new Response('Missing webhook secret', { status: 500 });
        }

        const body = await request.text();
        console.log('[webhook-simple2] Body received, length:', body.length);
        
        // Stripeイベント検証
        const event = stripe.webhooks.constructEvent(body, sig, secret);
        console.log('[webhook-simple2] Event type:', event.type);
        
        // checkout.session.completedのみ処理
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as any;
            const email = session.customer_details?.email || session.customer_email;
            const metadata = session.metadata || {};
            const plan = metadata.plan || 'standard'; // デフォルトプラン
            
            if (email) {
                console.log('[webhook-simple2] Saving membership for:', email, 'plan:', plan);
                
                // Netlify Blobsに保存（シンプル版）
                await saveMembershipData(email, {
                    plan: plan,
                    status: 'active',
                    stripeCustomerId: session.customer,
                    stripeSessionId: session.id,
                    createdAt: new Date().toISOString()
                });
                
                console.log('[webhook-simple2] Membership saved successfully');
            }
        }
        
        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error: any) {
        console.error('[webhook-simple2] Error:', error.message);
        return new Response(`Webhook error: ${error.message}`, { status: 400 });
    }
};