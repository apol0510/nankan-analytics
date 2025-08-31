// src/pages/api/stripe/create-checkout.ts
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

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const body = await request.json().catch(() => ({}));
    let { plan, planId, email, userEmail } = body ?? {};
    plan = (plan || planId || '').toString().trim().toLowerCase();
    email = (email || userEmail || '').toString().trim();

    if (!['standard','premium'].includes(plan)) return badRequest('Invalid plan');
    if (!email) return badRequest('Missing email');

    const selected = PLANS[plan as PlanType];
    const priceId = selected?.priceId || '';
    if (!priceId) {
      const mode = (import.meta.env.STRIPE_MODE ?? 'test').toLowerCase();
      const required =
        plan === 'standard'
          ? (mode === 'live' ? 'STRIPE_STANDARD_PRICE_ID_LIVE' : 'STRIPE_STANDARD_PRICE_ID_TEST')
          : (mode === 'live' ? 'STRIPE_PREMIUM_PRICE_ID_LIVE' : 'STRIPE_PREMIUM_PRICE_ID_TEST');
      return badRequest(`Price not configured for plan=${plan}. Set ${required}`);
    }

    const successUrl = `${url.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl  = `${url.origin}/pricing`;

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
        customer_email: email,
        subscription_data: { metadata: { plan, email } },
        metadata: { plan, email },
      },
      { idempotencyKey: `checkout:${email}:${plan}:${Date.now()}` }
    );

    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (e: any) {
    // ← ここで Stripe の詳細を返す（フロントで見えるように）
    const details = e?.raw?.message || e?.message || 'unknown';
    console.error('[create-checkout] 500', details);
    const code = Number.isInteger(e?.statusCode) ? e.statusCode : 500;
    return new Response(JSON.stringify({ error: 'create_session_failed', details }), {
      status: code, headers: { 'Content-Type': 'application/json' },
    });
  }
};

// JSフォールバック（JSなしでもAPIを試せるように）
export const GET: APIRoute = async (ctx) =>
  POST({
    ...ctx,
    request: new Request(ctx.request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: ctx.url.searchParams.get('plan'),
        email: ctx.url.searchParams.get('email')
      })
    })
  } as any);