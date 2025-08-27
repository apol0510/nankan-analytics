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
    let body;
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
      success_url: `${import.meta.env.SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${import.meta.env.SITE_URL}/pricing?canceled=true`,
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
    console.error('Stripe Checkout error:', error);
    
    let errorMessage = 'チェックアウトセッションの作成に失敗しました';
    
    if (error.code === 'price_not_found') {
      errorMessage = '指定された料金プランが見つかりません';
    } else if (error.code === 'customer_creation_failed') {
      errorMessage = '顧客情報の作成に失敗しました';
    }
    
    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}