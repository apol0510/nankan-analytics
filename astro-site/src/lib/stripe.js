import { loadStripe } from '@stripe/stripe-js'

const stripePublishableKey = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY

if (!stripePublishableKey) {
  throw new Error('Stripe Publishable Key must be provided')
}

// Stripeインスタンスを取得
export const getStripe = () => loadStripe(stripePublishableKey)

// 料金プラン設定
export const PRICING_PLANS = {
  STANDARD: {
    name: 'スタンダード',
    description: '全レース予想閲覧・過去30日分のデータ',
    price: 2980,
    stripePriceId: 'price_1RzEMaFA5w33p4Wycj2oSBOz', // スタンダードプラン Price ID
    features: [
      '全レース予想閲覧',
      '過去30日分のデータ',
      'AI分析レポート',
      'メール配信'
    ]
  },
  PREMIUM: {
    name: 'プレミアム',
    description: '全機能・過去データ無制限・優先サポート',
    price: 4980,
    stripePriceId: 'price_1RzEVfFA5w33p4Wy7GPtIHfv', // プレミアムプラン Price ID
    features: [
      '全機能利用可能',
      '過去データ無制限',
      '特別レポート配信',
      '優先サポート',
      '限定コンテンツアクセス'
    ]
  }
}

// Checkoutセッション作成用の関数
export const createCheckoutSession = async (priceId, userId, customerEmail) => {
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        userId,
        customerEmail,
      }),
    })

    const session = await response.json()
    
    if (!response.ok) {
      throw new Error(session.error || 'チェックアウトセッションの作成に失敗しました')
    }

    return session
  } catch (error) {
    console.error('Checkout session creation error:', error)
    throw error
  }
}

// カスタマーポータルセッション作成
export const createPortalSession = async (customerId) => {
  try {
    const response = await fetch('/api/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
      }),
    })

    const session = await response.json()
    
    if (!response.ok) {
      throw new Error(session.error || 'ポータルセッションの作成に失敗しました')
    }

    return session
  } catch (error) {
    console.error('Portal session creation error:', error)
    throw error
  }
}