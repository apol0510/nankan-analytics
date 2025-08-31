// src/pages/api/stripe/create-portal-session.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getStore } from '@netlify/blobs';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-04-10'
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, returnUrl } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: 'email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // メンバーシップデータからcustomerIdを取得
    const store = getStore('membership');
    const key = `users/${encodeURIComponent(email.toLowerCase())}.json`;
    const membershipData = await store.get(key, { type: 'json' });

    if (!membershipData || !membershipData.customerId) {
      return new Response(JSON.stringify({ error: 'customer not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Stripe Customer Portalセッションを作成
    const session = await stripe.billingPortal.sessions.create({
      customer: membershipData.customerId,
      return_url: returnUrl || `${new URL(request.url).origin}/dashboard`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[create-portal-session] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'server_error', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};