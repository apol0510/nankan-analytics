// Stripe Checkout セッション作成API
import Stripe from 'stripe';

// 環境変数チェック
const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY is not set');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
}) : null;

export const prerender = false;

export async function POST({ request }) {
  let body = null; // スコープを広くして全体でアクセス可能に
  
  try {
    // プロダクションモード: 実際の決済を行う
    const isDemoMode = false; // 本番環境に設定
    
    if (isDemoMode) {
      // デモ用のモック応答
      return new Response(JSON.stringify({ 
        id: 'demo_session_' + Date.now(),
        demo: true,
        message: 'これはデモ版です。実際の決済は行われません。'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!stripe) {
      return new Response(JSON.stringify({
        error: 'Stripe configuration error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // リクエストボディの安全な取得
    try {
      const text = await request.text();
      if (!text.trim()) {
        throw new Error('Empty request body');
      }
      body = JSON.parse(text);
    } catch (parseError) {
      return new Response(JSON.stringify({
        error: 'リクエストボディが無効です'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { priceId, userId, customerEmail } = body;

    // バリデーション
    if (!priceId || !userId || !customerEmail) {
      return new Response(JSON.stringify({
        error: '必要なパラメータが不足しています'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 既存の顧客を検索
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      // 新規顧客作成
      customer = await stripe.customers.create({
        email: customerEmail,
        metadata: {
          supabase_user_id: userId
        }
      });
    }

    // URL設定（明示的にHTTPSスキームを指定）
    const siteUrl = import.meta.env.SITE_URL || 'https://nankan-analytics.keiba.link';
    const successUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
    const cancelUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;

    // Checkout セッション作成
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${successUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cancelUrl}/pricing?canceled=true`,
      metadata: {
        user_id: userId,
      },
      subscription_data: {
        metadata: {
          user_id: userId,
        }
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    return new Response(JSON.stringify({ id: session.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API Endpoint Error:', error);
    console.error('Error stack:', error.stack);
    
    let errorMessage = 'チェックアウトセッションの作成に失敗しました';
    let debugInfo = {};
    
    if (error.code === 'price_not_found') {
      errorMessage = '指定された料金プランが見つかりません';
    } else if (error.code === 'customer_creation_failed') {
      errorMessage = '顧客情報の作成に失敗しました';
    } else if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Stripe設定エラー';
      debugInfo.stripeError = error.message;
    } else if (!stripeSecretKey) {
      errorMessage = 'Stripe設定が不完全です';
      debugInfo.missingEnv = 'STRIPE_SECRET_KEY';
    }
    
    // デバッグ情報を含める（本番環境でも一時的に）
    debugInfo.errorType = error.type;
    debugInfo.errorCode = error.code;
    debugInfo.hasStripeKey = !!stripeSecretKey;
    debugInfo.keyPrefix = stripeSecretKey ? stripeSecretKey.substring(0, 7) + '...' : 'none';
    debugInfo.siteUrl = import.meta.env.SITE_URL;
    debugInfo.resolvedSuccessUrl = `${successUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
    debugInfo.resolvedCancelUrl = `${cancelUrl}/pricing?canceled=true`;
    debugInfo.requestedPriceId = body && body.priceId ? body.priceId : 'unknown';
    
    return new Response(JSON.stringify({
      error: errorMessage,
      debug: debugInfo
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}