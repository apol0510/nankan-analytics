// Browser-compatible Stripe client library using CDN
import { loadStripe } from 'https://cdn.skypack.dev/@stripe/stripe-js'

// Get Stripe publishable key from runtime or meta tag
const getStripePublishableKey = () => {
  // In browser context, the environment variable needs to be passed from server
  // Check for a meta tag containing the key
  const metaKey = document.querySelector('meta[name="stripe-publishable-key"]')?.content
  if (metaKey) return metaKey
  
  // For demo purposes, use test key (should be replaced with actual environment variable)
  return null // Will need to be set via meta tag or passed from server
}

// Stripeインスタンスを取得
export const getStripe = async (publishableKey = null) => {
  const key = publishableKey || getStripePublishableKey()
  if (!key) {
    throw new Error('Stripe publishable key not found. Please set PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable.')
  }
  return await loadStripe(key)
}

// 料金プラン設定 - 本番環境
export const PRICING_PLANS = {
  STANDARD: {
    name: 'スタンダード',
    description: '後半レース予想・基礎コンテンツ',
    price: 100, // 月額100円
    stripePriceId: 'price_1S14mjFA5w33p4WyV9ZZVSqj', // NANKANアナリティクス(スタンダード) 100円
    features: [
      '10R・11R・12R予想閲覧',
      '基礎コンテンツアクセス',
      'メールサポート',
      '過去30日分のデータ'
    ]
  },
  PREMIUM: {
    name: 'プレミアム',
    description: '全レース予想・すべてのコンテンツ',
    price: 9980, // 月額9,980円
    stripePriceId: 'price_1S0YUfFA5w33p4WyVImKgx4c', // NANKANアナリティクス(プレミアム)
    features: [
      '1R-12R 全レース予想閲覧',
      '全コンテンツアクセス',
      '無制限データアクセス',
      '優先サポート',
      'AI分析レポート'
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