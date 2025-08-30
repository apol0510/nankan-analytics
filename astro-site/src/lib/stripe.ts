// Stripe決済システム（サーバーサイド）
import Stripe from 'stripe';

// Stripe初期化
export const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-04-10',
});

/**
 * プラン定義
 */
export const PLANS = {
    free: {
        name: 'Free',
        displayName: '無料プラン',
        price: 0,
        priceId: null,
        features: [
            'メインレース（11R）のみ予想',
            '基本的な分析データ',
            '週1回メールマガジン'
        ]
    },
    standard: {
        name: 'Standard',
        displayName: 'スタンダードプラン',
        price: 5980,
        priceId: import.meta.env.STRIPE_STANDARD_PRICE_ID,
        features: [
            '後半3レース予想',
            'AI信頼度スコア',
            '過去30日間データ',
            '週2回メールマガジン'
        ]
    },
    premium: {
        name: 'Premium',
        displayName: 'プレミアムプラン',
        price: 9980,
        priceId: import.meta.env.STRIPE_PREMIUM_PRICE_ID,
        features: [
            '全12レース完全予想',
            'XGBoost×LSTM詳細分析',
            '全期間データアクセス',
            '毎日メールマガジン',
            'プライベートコミュニティ'
        ]
    }
};

/**
 * Checkoutセッション作成
 */
export async function createCheckoutSession({
    planId,
    successUrl,
    cancelUrl,
    customerEmail,
    customerId = null
}) {
    const plan = PLANS[planId];
    if (!plan || !plan.priceId) {
        throw new Error('Invalid plan selected');
    }

    const sessionParams = {
        mode: 'subscription',
        line_items: [{
            price: plan.priceId,
            quantity: 1,
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            plan: planId,
            source: 'nankan-analytics'
        },
        subscription_data: {
            metadata: {
                plan: planId,
                source: 'nankan-analytics'
            }
        }
    };

    // 既存顧客がある場合
    if (customerId) {
        sessionParams.customer = customerId;
    } else if (customerEmail) {
        sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return session;
}

/**
 * 顧客情報を作成・取得
 */
export async function createCustomer({ email, name, metadata = {} }) {
    // 既存の顧客を検索
    const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1
    });

    if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0];
    }

    // 新規顧客作成
    const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
            source: 'nankan-analytics',
            ...metadata
        }
    });

    return customer;
}

/**
 * サブスクリプション情報を取得
 */
export async function getSubscription(subscriptionId) {
    if (!subscriptionId) return null;
    
    try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        return subscription;
    } catch (error) {
        console.error('Failed to retrieve subscription:', error);
        return null;
    }
}

/**
 * サブスクリプションをキャンセル
 */
export async function cancelSubscription(subscriptionId, immediately = false) {
    try {
        if (immediately) {
            // 即座にキャンセル
            return await stripe.subscriptions.cancel(subscriptionId);
        } else {
            // 期間終了時にキャンセル
            return await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: true
            });
        }
    } catch (error) {
        console.error('Failed to cancel subscription:', error);
        throw error;
    }
}

/**
 * カスタマーポータルセッション作成
 */
export async function createPortalSession(customerId, returnUrl) {
    try {
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });
        return session;
    } catch (error) {
        console.error('Failed to create portal session:', error);
        throw error;
    }
}

/**
 * Webhook署名を検証
 */
export function verifyWebhookSignature(payload, signature, endpointSecret) {
    try {
        return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    } catch (error) {
        console.error('Webhook signature verification failed:', error);
        throw new Error('Invalid webhook signature');
    }
}

/**
 * 価格IDからプラン名を取得
 */
export function getPlanFromPriceId(priceId) {
    for (const [planKey, plan] of Object.entries(PLANS)) {
        if (plan.priceId === priceId) {
            return planKey;
        }
    }
    return 'free';
}

export default stripe;