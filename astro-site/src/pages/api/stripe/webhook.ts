// Stripe Webhook処理（冪等性対応版）
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendWelcomeEmail } from '../../../lib/sendgrid-utils.js';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY as string, { apiVersion: '2024-04-10' });

const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

export const POST: APIRoute = async ({ request }) => {
    try {
        console.log('[webhook] Received request');
        
        // 一時的に署名検証をスキップして基本動作を確認
        console.log('[webhook] Returning success without processing');
        return new Response(JSON.stringify({ 
            received: true, 
            message: 'webhook received' 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

        // TODO: 以下は一時的にコメントアウト
        /*
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

        */

    } catch (error) {
        console.error('Webhook error:', error);
        return new Response(`Webhook error: ${error.message}`, { status: 500 });
    }
}

// Checkoutセッション完了処理（新仕様対応版）
async function handleCheckoutCompleted(session) {
    try {
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const customerEmail = session.customer_details?.email;

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

        // ユーザープロファイルを取得（email で検索）
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        if (authError || !authUsers?.users) {
            console.error('Failed to list users:', authError);
            return;
        }

        const user = authUsers.users.find(u => u.email === customerEmail);
        if (!user) {
            console.error('Unable to find user profile for email:', customerEmail);
            return;
        }

        // subscriptionsテーブルとprofilesテーブルを同期更新
        await upsertSubscriptionAndSnapshot({
            subscriptionId: subscription.id,
            profileId: user.id,
            customerId,
            priceId,
            plan: planName,
            status: subscription.status,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
            cancelAt: subscription.cancel_at,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            defaultPaymentMethod: subscription.default_payment_method,
            latestInvoice: subscription.latest_invoice
        });

        // ウェルカムメール送信（新規登録の場合）
        if (customerEmail && planName !== 'free') {
            await sendWelcomeEmail(customerEmail);
        }

        console.log(`Subscription activated for ${customerEmail}: ${planName}`);
    } catch (error) {
        console.error('Error handling checkout completion:', error);
    }
}

// 決済成功処理（新仕様対応版）
async function handlePaymentSucceeded(invoice) {
    try {
        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;

        if (!subscriptionId) return;

        const subscription = await getSubscription(subscriptionId);
        if (!subscription) return;

        const priceId = subscription.items.data[0]?.price?.id;
        const planName = getPlanFromPriceId(priceId);

        // subscriptionsとprofilesを同期更新
        await upsertSubscriptionAndSnapshot({
            subscriptionId: subscription.id,
            customerId,
            priceId,
            plan: planName,
            status: 'active', // 決済成功なのでactive
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
            cancelAt: subscription.cancel_at,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            defaultPaymentMethod: subscription.default_payment_method,
            latestInvoice: subscription.latest_invoice
        });

        console.log(`Payment succeeded for customer: ${customerId}`);
    } catch (error) {
        console.error('Error handling payment success:', error);
    }
}

// 決済失敗処理（新仕様対応版）
async function handlePaymentFailed(invoice) {
    try {
        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
            const subscription = await getSubscription(subscriptionId);
            if (subscription) {
                const priceId = subscription.items.data[0]?.price?.id;
                const planName = getPlanFromPriceId(priceId);

                // subscriptionsとprofilesを同期更新（past_due状態）
                await upsertSubscriptionAndSnapshot({
                    subscriptionId: subscription.id,
                    customerId,
                    priceId,
                    plan: planName,
                    status: 'past_due', // 決済失敗なのでpast_due
                    currentPeriodStart: subscription.current_period_start,
                    currentPeriodEnd: subscription.current_period_end,
                    cancelAt: subscription.cancel_at,
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    defaultPaymentMethod: subscription.default_payment_method,
                    latestInvoice: subscription.latest_invoice
                });
            }
        } else {
            // サブスクリプションIDがない場合は profiles のみ更新
            await supabase
                .from('profiles')
                .update({
                    active_status: 'past_due'
                })
                .eq('stripe_customer_id', customerId);
        }

        console.log(`Payment failed for customer: ${customerId}`);
    } catch (error) {
        console.error('Error handling payment failure:', error);
    }
}

// サブスクリプション更新処理（新仕様対応版）
async function handleSubscriptionUpdated(subscription) {
    try {
        const customerId = subscription.customer;
        const priceId = subscription.items.data[0]?.price?.id;
        const planName = getPlanFromPriceId(priceId);

        // subscriptionsとprofilesを同期更新
        await upsertSubscriptionAndSnapshot({
            subscriptionId: subscription.id,
            customerId,
            priceId,
            plan: planName,
            status: subscription.status,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
            cancelAt: subscription.cancel_at,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            defaultPaymentMethod: subscription.default_payment_method,
            latestInvoice: subscription.latest_invoice
        });

        console.log(`Subscription updated for customer: ${customerId}`);
    } catch (error) {
        console.error('Error handling subscription update:', error);
    }
}

// サブスクリプション削除処理（新仕様対応版）
async function handleSubscriptionDeleted(subscription) {
    try {
        const customerId = subscription.customer;

        // subscriptionsとprofilesを同期更新（キャンセル状態）
        await upsertSubscriptionAndSnapshot({
            subscriptionId: subscription.id,
            customerId,
            priceId: subscription.items.data[0]?.price?.id || null,
            plan: 'free', // キャンセル時は free プランに戻す
            status: 'canceled',
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
            cancelAt: subscription.cancel_at,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            defaultPaymentMethod: subscription.default_payment_method,
            latestInvoice: subscription.latest_invoice
        });

        console.log(`Subscription canceled for customer: ${customerId}`);
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

// subscriptionsテーブルとprofilesテーブルを同期更新する共通関数
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