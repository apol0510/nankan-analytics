// Netlify Function: Stripe Webhook Handler
// 完全版（Base64 + 署名検証 + エラーハンドリング）

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  console.log('[netlify-webhook] Received request:', event.httpMethod);
  
  if (event.httpMethod !== 'POST') {
    console.log('[netlify-webhook] Method not allowed:', event.httpMethod);
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    // 署名とシークレット確認
    const sig = event.headers['stripe-signature'];
    const secret = process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!sig) {
      console.log('[netlify-webhook] Missing stripe-signature header');
      return { statusCode: 400, body: 'Missing signature' };
    }
    
    if (!secret) {
      console.log('[netlify-webhook] Missing webhook secret environment variable');
      return { statusCode: 400, body: 'Missing secret' };
    }

    // Base64デコード対応（Netlify特有の処理）
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : (event.body || '');

    console.log('[netlify-webhook] Body length:', rawBody.length, 'isBase64:', !!event.isBase64Encoded);

    // Stripe署名検証
    let evt;
    try {
      evt = stripe.webhooks.constructEvent(rawBody, sig, secret);
      console.log('[netlify-webhook] ✅ Event verified:', evt.type, evt.id);
    } catch (e) {
      console.error('[netlify-webhook] ❌ Signature verification failed:', e.message);
      return { 
        statusCode: 400, 
        body: `Signature verify failed: ${e.message}` 
      };
    }

    // Netlify Blobs動的インポート
    const { getStore } = await import('@netlify/blobs');

    // メンバーシップ保存関数
    async function saveMembership({ email, priceId, subscription, customerId }) {
      const store = getStore('membership');
      
      // plan 判定（priceId → plan）
      const mode = (process.env.STRIPE_MODE || 'test').toLowerCase();
      const std = mode === 'live' ? process.env.STRIPE_STANDARD_PRICE_ID_LIVE : process.env.STRIPE_STANDARD_PRICE_ID_TEST;
      const prm = mode === 'live' ? process.env.STRIPE_PREMIUM_PRICE_ID_LIVE : process.env.STRIPE_PREMIUM_PRICE_ID_TEST;
      const plan = priceId === prm ? 'premium' : 'standard';

      const body = {
        email,
        plan,
        priceId,
        subscriptionId: subscription.id,
        customerId,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        updatedAt: Date.now(),
      };
      
      await store.set(`users/${encodeURIComponent(email)}.json`, JSON.stringify(body), { 
        contentType: 'application/json' 
      });
      
      console.log('[netlify-webhook] 💾 Saved membership for:', email, 'plan:', plan);
    }

    // イベント処理
    console.log('[netlify-webhook] Processing event type:', evt.type);
    
    // checkout.session.completed処理
    if (evt.type === 'checkout.session.completed') {
      const s = evt.data.object;
      const subId = String(s.subscription || '');
      const subscription = subId ? await stripe.subscriptions.retrieve(subId) : null;
      const customerId = String(s.customer || (subscription && subscription.customer) || '');
      let email = s.customer_details?.email || '';
      
      if (!email && customerId) {
        const c = await stripe.customers.retrieve(customerId);
        if (!c.deleted) email = c.email || '';
      }
      
      const priceId = subscription?.items?.data?.[0]?.price?.id || '';
      
      if (email && priceId && subscription) {
        await saveMembership({ email, priceId, subscription, customerId });
      }
    } 
    // customer.subscription.*処理
    else if (evt.type.startsWith('customer.subscription.')) {
      const sub = evt.data.object;
      const customerId = String(sub.customer);
      const c = await stripe.customers.retrieve(customerId);
      const email = c.deleted ? '' : (c.email || '');
      const priceId = sub.items?.data?.[0]?.price?.id || '';
      
      if (email && priceId) {
        await saveMembership({ email, priceId, subscription: sub, customerId });
      }
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        received: true, 
        eventType: evt.type,
        eventId: evt.id,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('[netlify-webhook] Unexpected error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};