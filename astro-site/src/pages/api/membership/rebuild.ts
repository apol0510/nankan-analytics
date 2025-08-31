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

export const GET: APIRoute = async ({ url }) => {
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  if (!email) return new Response('missing email', { status: 400 });

  try {
    // 1) 該当顧客を取得
    const customers = await stripe.customers.list({ email, limit: 1 });
    const cust = customers.data[0];
    if (!cust) return new Response('no customer', { status: 404 });

    // 2) 最新サブスクを取得（status: all で拾う）
    const subs = await stripe.subscriptions.list({ customer: cust.id, status: 'all', limit: 1 });
    const sub = subs.data[0];
    if (!sub) return new Response('no subscription', { status: 404 });

    const priceId = sub.items.data[0]?.price?.id || '';
    const store = getStore('membership');
    const key = `users/${encodeURIComponent(email)}.json`;

    // 3) Blobs に再保存
    const body = {
      email,
      plan: priceIdToPlan(priceId),
      priceId,
      subscriptionId: sub.id,
      customerId: String(sub.customer),
      status: sub.status,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      updatedAt: Date.now(),
    };
    await store.set(key, JSON.stringify(body), { contentType: 'application/json' });

    console.log('[membership-rebuild] Successfully rebuilt membership for:', email);
    return new Response(JSON.stringify({ ok: true, data: body }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[membership-rebuild] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'rebuild_failed', 
      details: error?.message || 'unknown' 
    }), {
      status: 500, 
      headers: { 'Content-Type': 'application/json' }
    });
  }
};