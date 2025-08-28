// サブスクリプション変更専用API
import Stripe from 'stripe';

const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY is not set');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
}) : null;

export const prerender = false;

export async function POST({ request }) {
  console.log('[CHANGE-SUB] Subscription change started');
  
  if (!stripe) {
    return new Response(JSON.stringify({
      error: 'Stripe configuration error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { customerEmail, newPriceId, currentPlan, targetPlan } = body;

    console.log('[CHANGE-SUB] Request:', { customerEmail, newPriceId, currentPlan, targetPlan });

    // 顧客を検索
    const customers = await stripe.customers.list({
      email: customerEmail,
      limit: 1
    });

    if (customers.data.length === 0) {
      return new Response(JSON.stringify({
        error: 'Customer not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const customer = customers.data[0];
    console.log('[CHANGE-SUB] Customer found:', customer.id);

    // アクティブなサブスクリプションを検索
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      // アクティブなサブスクリプションがない場合は新規作成
      console.log('[CHANGE-SUB] No active subscription, creating new one');
      
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [{
          price: newPriceId,
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: 'https://nankan-analytics.keiba.link/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://nankan-analytics.keiba.link/upgrade?canceled=true',
        metadata: { 
          change_from: currentPlan,
          change_to: targetPlan
        }
      });

      return new Response(JSON.stringify({ 
        type: 'new_subscription',
        checkout_url: session.url 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 既存サブスクリプションを変更
    const subscription = subscriptions.data[0];
    console.log('[CHANGE-SUB] Found subscription:', subscription.id);

    // サブスクリプションアイテムを取得
    const subscriptionItem = subscription.items.data[0];
    
    // サブスクリプション更新
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [{
        id: subscriptionItem.id,
        price: newPriceId,
      }],
      proration_behavior: 'always_invoice', // 日割り計算で即座に請求
      metadata: {
        changed_from: currentPlan,
        changed_to: targetPlan,
        change_timestamp: new Date().toISOString()
      }
    });

    console.log('[CHANGE-SUB] Subscription updated:', updatedSubscription.id);

    return new Response(JSON.stringify({
      type: 'subscription_updated',
      subscription_id: updatedSubscription.id,
      status: updatedSubscription.status,
      current_period_end: updatedSubscription.current_period_end
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[CHANGE-SUB] Error:', error);
    
    return new Response(JSON.stringify({
      error: 'Subscription change failed',
      message: error.message,
      type: error.type,
      debug: {
        errorCode: error.code,
        stripeError: error.message
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}