// Netlify Function: Stripe Webhook Handler
// 直接処理版（Astroプロキシなし）

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  console.log('[netlify-webhook] Received request:', event.httpMethod);
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // 署名検証
    const sig = event.headers['stripe-signature'];
    if (!sig) {
      console.log('[netlify-webhook] Missing signature');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing stripe-signature' })
      };
    }

    const secret = process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      console.log('[netlify-webhook] Missing webhook secret');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing STRIPE_WEBHOOK_SECRET' })
      };
    }

    // 署名検証
    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(event.body, sig, secret);
      console.log('[netlify-webhook] Event verified:', stripeEvent.type);
    } catch (err) {
      console.error('[netlify-webhook] Signature verification failed:', err.message);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` })
      };
    }

    // 成功レスポンス（処理ロジックは後で追加）
    console.log('[netlify-webhook] Processing event:', stripeEvent.type);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        received: true,
        eventType: stripeEvent.type,
        eventId: stripeEvent.id
      })
    };

  } catch (error) {
    console.error('[netlify-webhook] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};