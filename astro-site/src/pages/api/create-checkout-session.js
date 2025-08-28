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
  console.log('[API] Checkout session creation started');
  console.log('[API] Environment check:', {
    hasStripeKey: !!import.meta.env.STRIPE_SECRET_KEY,
    keyPrefix: import.meta.env.STRIPE_SECRET_KEY ? import.meta.env.STRIPE_SECRET_KEY.substring(0, 7) + '...' : 'none',
    siteUrl: import.meta.env.SITE_URL
  });
  
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

    // リクエストボディの取得（簡略化）
    console.log('[API] Getting request body...');
    try {
      body = await request.json();
      console.log('[API] Request body parsed:', body);
    } catch (parseError) {
      console.error('[API] Parse error:', parseError);
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

    // 一時的に顧客検索をスキップ（デバッグ用）
    let customer;
    console.log('Creating new customer for:', customerEmail);
    
    try {
      // 新規顧客作成（検索をスキップ）
      customer = await stripe.customers.create({
        email: customerEmail,
        metadata: {
          supabase_user_id: userId
        }
      });
      
      console.log('Customer created:', customer.id);
    } catch (customerError) {
      console.error('Customer creation error:', customerError);
      throw new Error(`顧客作成エラー: ${customerError.message}`);
    }

    // URL設定（環境に応じて自動切り替え）
    const origin = Astro.url.origin;
    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
    
    // 本番環境では常に本番URLを使用、ローカル環境でのみlocalhostを使用
    const baseUrl = isLocal 
      ? origin 
      : 'https://nankan-analytics.keiba.link';
    
    console.log('Environment detection:', {
      origin,
      isLocal,
      baseUrl
    });

    // Checkout セッション作成
    console.log('Creating checkout session with:', {
      customerId: customer.id,
      priceId,
      successUrl: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/pricing?canceled=true`
    });
    
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
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
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
    
    console.log('Session created successfully:', session.id);

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
    debugInfo.origin = Astro.url.origin;
    debugInfo.resolvedSuccessUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
    debugInfo.resolvedCancelUrl = `${baseUrl}/pricing?canceled=true`;
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