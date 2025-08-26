// Stripe Webhook 処理
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// 環境変数チェック
const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
}) : null;

const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(
  supabaseUrl,
  supabaseAnonKey
) : null;

// Webhook署名検証用のシークレット（Stripe管理画面から取得）
const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

export const prerender = false;

export async function POST({ request }) {
  if (!stripe || !supabase) {
    return new Response('Configuration error', { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;

  try {
    // Webhook署名を検証
    if (webhookSecret && stripe) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // 開発環境では署名検証をスキップ
      event = JSON.parse(body);
    }
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return new Response('Webhook signature verification failed', {
      status: 400
    });
  }

  try {
    // イベントタイプに応じて処理
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response('Webhook handled successfully', {
      status: 200
    });

  } catch (error) {
    console.error('Webhook handling error:', error);
    return new Response('Webhook handling failed', {
      status: 500
    });
  }
}

// チェックアウト完了処理
async function handleCheckoutCompleted(session) {
  try {
    const userId = session.metadata.user_id;
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    // サブスクリプション詳細を取得
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0].price.id;
    
    // プラン名を特定
    let planName = 'standard';
    if (priceId.includes('premium')) {
      planName = 'premium';
    }

    // ユーザープロフィールを更新
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_plan: planName,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_start_date: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    console.log(`Subscription activated for user: ${userId}`);
  } catch (error) {
    console.error('Checkout completion handling error:', error);
    throw error;
  }
}

// サブスクリプション作成処理
async function handleSubscriptionCreated(subscription) {
  try {
    const userId = subscription.metadata.user_id;
    const customerId = subscription.customer;
    const priceId = subscription.items.data[0].price.id;
    
    let planName = 'standard';
    if (priceId.includes('premium')) {
      planName = 'premium';
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_plan: planName,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        subscription_start_date: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    console.log(`Subscription created for user: ${userId}`);
  } catch (error) {
    console.error('Subscription creation handling error:', error);
    throw error;
  }
}

// サブスクリプション更新処理
async function handleSubscriptionUpdated(subscription) {
  try {
    const userId = subscription.metadata.user_id;
    const priceId = subscription.items.data[0].price.id;
    
    let planName = 'standard';
    if (priceId.includes('premium')) {
      planName = 'premium';
    }

    // ステータスの判定
    let subscriptionStatus = 'inactive';
    if (subscription.status === 'active') {
      subscriptionStatus = 'active';
    } else if (subscription.status === 'past_due') {
      subscriptionStatus = 'past_due';
    } else if (subscription.status === 'canceled') {
      subscriptionStatus = 'canceled';
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: subscriptionStatus,
        subscription_plan: planName,
        subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      throw error;
    }

    console.log(`Subscription updated for subscription: ${subscription.id}`);
  } catch (error) {
    console.error('Subscription update handling error:', error);
    throw error;
  }
}

// サブスクリプション削除処理
async function handleSubscriptionDeleted(subscription) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'canceled',
        subscription_end_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      throw error;
    }

    console.log(`Subscription canceled for subscription: ${subscription.id}`);
  } catch (error) {
    console.error('Subscription deletion handling error:', error);
    throw error;
  }
}

// 支払い成功処理
async function handlePaymentSucceeded(invoice) {
  try {
    const subscriptionId = invoice.subscription;
    
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscriptionId);

      if (error) {
        throw error;
      }

      console.log(`Payment succeeded for subscription: ${subscriptionId}`);
    }
  } catch (error) {
    console.error('Payment success handling error:', error);
    throw error;
  }
}

// 支払い失敗処理
async function handlePaymentFailed(invoice) {
  try {
    const subscriptionId = invoice.subscription;
    
    if (subscriptionId) {
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'past_due',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscriptionId);

      if (error) {
        throw error;
      }

      console.log(`Payment failed for subscription: ${subscriptionId}`);
    }
  } catch (error) {
    console.error('Payment failure handling error:', error);
    throw error;
  }
}