import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

export const prerender = false;

export async function POST({ request }) {
    try {
        // リクエストボディの安全な取得
        let body;
        try {
            const text = await request.text();
            if (!text.trim()) {
                throw new Error('Empty request body');
            }
            body = JSON.parse(text);
        } catch (parseError) {
            return new Response(JSON.stringify({
                error: 'リクエストボディが無効です'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { customerId, returnUrl } = body;

        if (!customerId) {
            return new Response(
                JSON.stringify({ error: 'Customer ID is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Stripeカスタマーポータルセッションを作成
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl || `${import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321'}/account`,
        });

        return new Response(
            JSON.stringify({ url: portalSession.url }),
            { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            }
        );
    } catch (error) {
        console.error('Customer portal creation error:', error);
        return new Response(
            JSON.stringify({ 
                error: 'Failed to create customer portal session',
                details: error.message 
            }),
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    });
}