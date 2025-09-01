// Stripe Webhook処理（Netlify Blobs対応版）
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { saveMembershipData } from '../../../lib/membership/store.js';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY as string, { apiVersion: '2024-04-10' });


export const POST: APIRoute = async ({ request }) => {
    try {
        console.log('[webhook] Received request');
        
        // Webhook署名検証
        const sig = request.headers.get('stripe-signature');
        if (!sig) {
            console.log('[webhook] Missing stripe-signature header');
            return new Response('missing signature', { status: 400 });
        }

        const secret = import.meta.env.STRIPE_WEBHOOK_SECRET_TEST || import.meta.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) {
            console.log('[webhook] Missing STRIPE_WEBHOOK_SECRET environment variable');
            return new Response('missing STRIPE_WEBHOOK_SECRET', { status: 500 });
        }

        // ❗ここは必ず raw body。json() や formData() は使わない
        const raw = await request.text();
        
        // 署名検証とイベント処理
        const event = stripe.webhooks.constructEvent(raw, sig, secret);
        console.log('[webhook] Event type:', event.type);
        
        // イベントタイプに応じた処理
        switch (event.type) {
            case 'checkout.session.completed':
                console.log('[webhook] Processing checkout.session.completed');
                await handleCheckoutCompleted(event.data.object);
                break;
                
            case 'invoice.payment_succeeded':
                console.log('[webhook] Processing invoice.payment_succeeded');
                await handlePaymentSucceeded(event.data.object);
                break;
                
            case 'invoice.payment_failed':
                console.log('[webhook] Processing invoice.payment_failed');
                await handlePaymentFailed(event.data.object);
                break;
                
            case 'customer.subscription.updated':
                console.log('[webhook] Processing customer.subscription.updated');
                await handleSubscriptionUpdated(event.data.object);
                break;
                
            case 'customer.subscription.deleted':
                console.log('[webhook] Processing customer.subscription.deleted');
                await handleSubscriptionDeleted(event.data.object);
                break;
                
            default:
                console.log(`[webhook] Unhandled event type: ${event.type}`);
        }
        
        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Webhook error:', error);
        return new Response(`Webhook error: ${error.message}`, { status: 500 });
    }
}

// Checkoutセッション完了処理（Netlify Blobs版）
async function handleCheckoutCompleted(session) {
    try {
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const customerEmail = session.customer_details?.email || session.customer_email;

        if (!customerId || !subscriptionId) {
            console.error('Missing customer or subscription ID');
            return;
        }

        // サブスクリプション情報を取得
        const subscription = await getSubscription(subscriptionId);
        if (!subscription) {
            console.error('Failed to retrieve subscription');
            return;
        }

        const priceId = subscription.items.data[0]?.price?.id;
        const planName = getPlanFromPriceId(priceId);

        // Netlify Blobsに会員情報を保存
        await saveMembershipData(customerEmail, {
            plan: planName,
            status: subscription.status,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            currentPeriodStart: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
            currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
            cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            createdAt: new Date().toISOString()
        });

        console.log(`[webhook] Subscription activated for ${customerEmail}: ${planName}`);
    } catch (error) {
        console.error('Error handling checkout completion:', error);
    }
}

// 決済成功処理（Netlify Blobs版）
async function handlePaymentSucceeded(invoice) {
    try {
        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;
        const customerEmail = invoice.customer_email;

        if (!subscriptionId || !customerEmail) return;

        const subscription = await getSubscription(subscriptionId);
        if (!subscription) return;

        const priceId = subscription.items.data[0]?.price?.id;
        const planName = getPlanFromPriceId(priceId);

        // Netlify Blobsに会員情報を更新
        await saveMembershipData(customerEmail, {
            plan: planName,
            status: 'active',
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            currentPeriodStart: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
            currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
            lastPaymentDate: new Date().toISOString()
        });

        console.log(`[webhook] Payment succeeded for ${customerEmail}: ${planName}`);
    } catch (error) {
        console.error('Error handling payment success:', error);
    }
}

// 決済失敗処理（Netlify Blobs版）
async function handlePaymentFailed(invoice) {
    try {
        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;
        const customerEmail = invoice.customer_email;

        if (!customerEmail) return;

        if (subscriptionId) {
            const subscription = await getSubscription(subscriptionId);
            if (subscription) {
                const priceId = subscription.items.data[0]?.price?.id;
                const planName = getPlanFromPriceId(priceId);

                // Netlify Blobsに会員情報を更新（past_due状態）
                await saveMembershipData(customerEmail, {
                    plan: planName,
                    status: 'past_due',
                    stripeCustomerId: customerId,
                    stripeSubscriptionId: subscriptionId,
                    stripePriceId: priceId,
                    paymentFailedAt: new Date().toISOString()
                });
            }
        }

        console.log(`[webhook] Payment failed for ${customerEmail}`);
    } catch (error) {
        console.error('Error handling payment failure:', error);
    }
}

// サブスクリプション更新処理（Netlify Blobs版）
async function handleSubscriptionUpdated(subscription) {
    try {
        const customerId = subscription.customer;
        const priceId = subscription.items.data[0]?.price?.id;
        const planName = getPlanFromPriceId(priceId);
        
        // Stripe APIから顧客のメールアドレスを取得
        const customer = await stripe.customers.retrieve(customerId);
        const customerEmail = customer.email;
        
        if (!customerEmail) {
            console.error('[webhook] No email found for customer:', customerId);
            return;
        }

        // Netlify Blobsに会員情報を更新
        await saveMembershipData(customerEmail, {
            plan: planName,
            status: subscription.status,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            currentPeriodStart: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
            currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
            cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
            cancelAtPeriodEnd: subscription.cancel_at_period_end
        });

        console.log(`[webhook] Subscription updated for ${customerEmail}: ${planName}`);
    } catch (error) {
        console.error('Error handling subscription update:', error);
    }
}

// サブスクリプション削除処理（Netlify Blobs版）
async function handleSubscriptionDeleted(subscription) {
    try {
        const customerId = subscription.customer;
        
        // Stripe APIから顧客のメールアドレスを取得
        const customer = await stripe.customers.retrieve(customerId);
        const customerEmail = customer.email;
        
        if (!customerEmail) {
            console.error('[webhook] No email found for customer:', customerId);
            return;
        }

        // Netlify Blobsに会員情報を更新（キャンセル状態）
        await saveMembershipData(customerEmail, {
            plan: 'free',
            status: 'canceled',
            stripeCustomerId: customerId,
            canceledAt: new Date().toISOString(),
            previousPlan: getPlanFromPriceId(subscription.items.data[0]?.price?.id)
        });

        console.log(`[webhook] Subscription canceled for ${customerEmail}`);
    } catch (error) {
        console.error('Error handling subscription deletion:', error);
    }
}

// ヘルパー関数：サブスクリプション取得
async function getSubscription(subscriptionId: string) {
    try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        return subscription;
    } catch (error) {
        console.error('Failed to retrieve subscription:', error);
        return null;
    }
}

// ヘルパー関数：価格IDからプラン名を取得
function getPlanFromPriceId(priceId: string): string {
    const standardPriceId = import.meta.env.STRIPE_STANDARD_PRICE_ID_TEST || import.meta.env.STRIPE_STANDARD_PRICE_ID_LIVE;
    const premiumPriceId = import.meta.env.STRIPE_PREMIUM_PRICE_ID_TEST || import.meta.env.STRIPE_PREMIUM_PRICE_ID_LIVE;
    
    if (priceId === standardPriceId) return 'standard';
    if (priceId === premiumPriceId) return 'premium';
    return 'free';
}

// 削除: Supabase関連の関数は不要
/*
async function upsertSubscriptionAndSnapshot({
    subscriptionId,
    profileId = null,
    customerId,
    priceId,
    plan,
    status,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAt = null,
    cancelAtPeriodEnd = false,
    defaultPaymentMethod = null,
    latestInvoice = null
}) {
    try {
        // profileId が提供されていない場合は customer_id から取得
        if (!profileId) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('stripe_customer_id', customerId)
                .single();
            
            if (!profile) {
                console.error(`Profile not found for customer: ${customerId}`);
                return;
            }
            profileId = profile.id;
        }

        // subscriptionsテーブルを更新/挿入
        const { error: subscriptionError } = await supabase
            .from('subscriptions')
            .upsert({
                id: subscriptionId,
                profile_id: profileId,
                customer_id: customerId,
                price_id: priceId,
                plan,
                status,
                current_period_start: currentPeriodStart ? new Date(currentPeriodStart * 1000).toISOString() : null,
                current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
                cancel_at: cancelAt ? new Date(cancelAt * 1000).toISOString() : null,
                cancel_at_period_end: cancelAtPeriodEnd,
                default_payment_method: defaultPaymentMethod,
                latest_invoice: latestInvoice,
                updated_at: new Date().toISOString()
            });

        if (subscriptionError) {
            console.error('Failed to upsert subscription:', subscriptionError);
            return;
        }

        // profilesテーブルを更新（スナップショット情報）
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                stripe_customer_id: customerId,
                active_plan: plan,
                active_status: status,
                active_subscription_id: subscriptionId,
                subscription_current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null
            })
            .eq('id', profileId);

        if (profileError) {
            console.error('Failed to update profile:', profileError);
        }

        console.log(`Successfully synced subscription ${subscriptionId} for profile ${profileId}`);
    } catch (error) {
        console.error('Error in upsertSubscriptionAndSnapshot:', error);
    }
}
*/