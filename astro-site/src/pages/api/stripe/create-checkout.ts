import type { APIRoute } from 'astro';
import { stripe } from '../../../lib/stripe';
import { PLANS, type PlanType } from '../../../lib/billing/plan';

function badRequest(msg: string, extra?: any) {
  console.error('[create-checkout] 400', msg, extra ?? '');
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    console.log('[create-checkout] Request body:', body);
    
    let { planId, plan, userId, userEmail, email } = (body ?? {}) as {
      planId?: string;
      plan?: string;
      userId?: string;
      userEmail?: string;
      email?: string;
    };

    // planId または plan の両方をサポート
    plan = plan || planId;
    email = email || userEmail;

    plan = (plan ?? '').toString().trim().toLowerCase();
    if (!['standard', 'premium'].includes(plan)) {
      return badRequest('Invalid plan param. Use "standard" or "premium".', { plan });
    }
    if (!email) return badRequest('Missing email');

    const selectedPlan = PLANS[plan as PlanType];
    const priceId = selectedPlan?.priceId;
    
    if (!priceId) {
      const mode = import.meta.env.STRIPE_MODE ?? 'test';
      const requiredEnv =
        plan === 'standard'
          ? mode === 'live'
            ? 'STRIPE_STANDARD_PRICE_ID_LIVE'
            : 'STRIPE_STANDARD_PRICE_ID_TEST'
          : mode === 'live'
            ? 'STRIPE_PREMIUM_PRICE_ID_LIVE'
            : 'STRIPE_PREMIUM_PRICE_ID_TEST';
      return badRequest(`Price not configured for plan=${plan}. Set ${requiredEnv} in .env and restart server.`);
    }

    console.log('[create-checkout] Plan:', plan, 'Price ID:', priceId);

    const sessionParams: any = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${import.meta.env.SITE_URL || 'http://localhost:4321'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${import.meta.env.SITE_URL || 'http://localhost:4321'}/payment/cancel`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { plan, email },
      },
      metadata: { plan, email },
    };

    sessionParams.customer_email = email;

    const session = await stripe.checkout.sessions.create(
      sessionParams,
      { idempotencyKey: `checkout:${email}:${plan}:${Date.now()}` }
    );

    console.log('[create-checkout] Success! Checkout URL:', session.url);
    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (e: any) {
    console.error('[create-checkout] 500', e?.message ?? e, e?.stack ?? '');
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: e?.message ?? 'unknown' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};