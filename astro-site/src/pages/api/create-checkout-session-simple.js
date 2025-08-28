// 簡略化されたStripe Checkout セッション作成API
import Stripe from 'stripe';

const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;
console.log('Stripe key loaded:', !!stripeSecretKey);

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
}) : null;

export const prerender = false;

export async function POST({ request }) {
  console.log('[SIMPLE API] Starting checkout session creation');
  
  if (!stripe) {
    console.error('[SIMPLE API] Stripe not initialized');
    return new Response(JSON.stringify({
      error: 'Stripe not configured'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    console.log('[SIMPLE API] Request body:', body);
    
    const { priceId, userId, customerEmail } = body;

    // 最小限のバリデーション
    if (!priceId || !customerEmail) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[SIMPLE API] Creating customer...');
    
    // シンプルに新規顧客を作成（検索なし）
    const customer = await stripe.customers.create({
      email: customerEmail,
      metadata: { supabase_user_id: userId || 'test' }
    });

    console.log('[SIMPLE API] Customer created:', customer.id);

    // チェックアウトセッション作成
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: 'http://localhost:4321/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:4321/pricing?canceled=true',
      metadata: { user_id: userId || 'test' }
    });

    console.log('[SIMPLE API] Session created:', session.id);

    return new Response(JSON.stringify({ 
      id: session.id,
      url: session.url 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[SIMPLE API] Error:', error);
    
    return new Response(JSON.stringify({
      error: 'Checkout session creation failed',
      message: error.message,
      type: error.type
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}