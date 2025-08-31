// src/pages/api/stripe/create-portal-session.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getMembershipByEmail } from '../../../lib/membership/store';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY as string, { apiVersion: '2024-04-10' });

async function resolveCustomerId(email: string): Promise<string | null> {
  // 1) Blobs から（本番ならここで取れる）
  const m = await getMembershipByEmail(email);
  if (m?.customerId) return m.customerId;

  // 2) ブロブが無い/ローカルでは Stripe から逆引き（テスト鍵でOK）
  const cs = await stripe.customers.list({ email, limit: 1 });
  return cs.data[0]?.id ?? null;
}

export const POST: APIRoute = async ({ request, url, cookies }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || cookies.get?.('na_email')?.value || '').trim().toLowerCase();
    if (!email) return new Response(JSON.stringify({ error: 'missing_email' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    const customerId = await resolveCustomerId(email);
    if (!customerId) return new Response(JSON.stringify({ error: 'no_customer_for_email' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

    const returnUrl = (import.meta.env.SITE_URL || url.origin) + '/dashboard';
    const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });

    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    const details = e?.raw?.message || e?.message || 'unknown';
    const code = Number.isInteger(e?.statusCode) ? e.statusCode : 500;
    console.error('[create-portal-session] Error:', details);
    return new Response(JSON.stringify({ error: 'create_portal_failed', details }), { status: code, headers: { 'Content-Type': 'application/json' } });
  }
};

// 任意: GETでも動かす（ブラウザで直接テスト可）
export const GET: APIRoute = async (ctx) =>
  POST({
    ...ctx,
    request: new Request(ctx.request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ctx.url.searchParams.get('email') || ctx.cookies.get?.('na_email')?.value || '' }),
    }),
  } as any);