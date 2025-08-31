// src/pages/api/membership/ensure.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getStore } from '@netlify/blobs';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY as string, { apiVersion: '2024-04-10' });

function priceIdToPlan(priceId: string) {
  const mode = (import.meta.env.STRIPE_MODE ?? 'test').toLowerCase();
  const STD = mode === 'live' ? import.meta.env.STRIPE_STANDARD_PRICE_ID_LIVE : import.meta.env.STRIPE_STANDARD_PRICE_ID_TEST;
  const PRM = mode === 'live' ? import.meta.env.STRIPE_PREMIUM_PRICE_ID_LIVE : import.meta.env.STRIPE_PREMIUM_PRICE_ID_TEST;
  return priceId === PRM ? 'premium' : 'standard';
}

export const GET: APIRoute = async ({ url, cookies }) => {
  const sessionId = url.searchParams.get('session_id') || '';
  if (!sessionId) return new Response('missing session_id', { status: 400 });

  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
    const sub: any = typeof s.subscription === 'object' ? s.subscription : (s.subscription ? await stripe.subscriptions.retrieve(String(s.subscription)) : null);
    const priceId = sub?.items?.data?.[0]?.price?.id || '';
    const email = s.customer_details?.email || '';

    if (!email || !priceId || !sub) return new Response('incomplete', { status: 422 });

    const store = getStore('membership');
    const key = `users/${encodeURIComponent(email.toLowerCase())}.json`;
    const body = {
      email,
      plan: priceIdToPlan(priceId),
      priceId,
      subscriptionId: sub.id,
      customerId: String(s.customer || sub.customer || ''),
      status: sub.status,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      updatedAt: Date.now(),
    };
    await store.set(key, JSON.stringify(body), { contentType: 'application/json' });

    // Cookie もここで保証
    cookies.set('na_email', encodeURIComponent(email), { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
    
    console.log('[membership-ensure] Successfully saved membership for:', email);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('[membership-ensure] Error:', error);
    return new Response('server error', { status: 500 });
  }
};