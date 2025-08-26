import { loadStripe } from '@stripe/stripe-js'

const stripePublishableKey = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY

if (!stripePublishableKey) {
  throw new Error('Stripe Publishable Key must be provided')
}

// Stripeインスタンスを取得
export const getStripe = () => loadStripe(stripePublishableKey)

// 料金プラン設定 - デモ用（実際の決済はされません）
export const PRICING_PLANS = {
  STANDARD: {
    name: 'スタンダード（デモ）',
    description: '全レース予想閲覧・過去30日分のデータ',
    price: 1000, // デモ用価格
    stripePriceId: 'price_1HdT7vFA5w33p4WyDdH1VWwg', // Stripeの標準テストPrice ID
    features: [
      '全レース予想閲覧',
      '過去30日分のデータ',
      'AI分析レポート',
      'メール配信'
    ]
  },
  PREMIUM: {
    name: 'プレミアム（デモ）',
    description: '全機能・過去データ無制限・優先サポート',
    price: 2000, // デモ用価格
    stripePriceId: 'price_1HdT8lFA5w33p4WyDdH1VWwh', // Stripeの標準テストPrice ID
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