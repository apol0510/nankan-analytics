// Stripe設定テスト用API
import Stripe from 'stripe';

const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;

export const prerender = false;

export async function GET() {
  try {
    // 環境変数の確認
    const response = {
      hasStripeKey: !!stripeSecretKey,
      keyPrefix: stripeSecretKey ? stripeSecretKey.substring(0, 8) + '...' : 'none',
      keyType: stripeSecretKey?.startsWith('sk_test_') ? 'test' : 
               stripeSecretKey?.startsWith('sk_live_') ? 'live' : 'unknown',
      timestamp: new Date().toISOString()
    };

    if (!stripeSecretKey) {
      return new Response(JSON.stringify({
        ...response,
        error: 'STRIPE_SECRET_KEY not found'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Stripeインスタンスの初期化テスト
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // 簡単なStripe APIコール（料金プランの取得）
    const testPriceId = 'price_1RzEMaFA5w33p4Wycj2oSBOz'; // スタンダードプラン
    const price = await stripe.prices.retrieve(testPriceId);

    response.stripeTest = {
      success: true,
      priceId: testPriceId,
      priceAmount: price.unit_amount,
      currency: price.currency
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Stripe test failed',
      message: error.message,
      type: error.type,
      code: error.code,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}