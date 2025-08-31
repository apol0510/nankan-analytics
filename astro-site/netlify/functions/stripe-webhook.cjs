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

    // イベント処理（基本ログ）
    console.log('[netlify-webhook] Processing event type:', evt.type);
    
    // TODO: ここで実際のビジネスロジック処理
    // - checkout.session.completed
    // - invoice.paid
    // - customer.subscription.updated
    // etc.
    
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