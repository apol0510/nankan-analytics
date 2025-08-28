import { loadStripe } from '@stripe/stripe-js'

const stripePublishableKey = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY

if (!stripePublishableKey) {
  throw new Error('Stripe Publishable Key must be provided')
}

// Stripeインスタンスを取得
export const getStripe = () => loadStripe(stripePublishableKey)

// 料金プラン設定
const isTestMode = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_')
console.log('Stripe key:', import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 8) + '...')
console.log('isTestMode:', isTestMode)

export const PRICING_PLANS = {
  STANDARD: {
    name: 'スタンダード',
    description: '後半レース予想・基礎コンテンツ',
    price: 100, // 月額100円
    // テストモードと本番モードで価格IDを切り替え
    stripePriceId: isTestMode 
      ? 'price_1RzEMaFA5w33p4Wycj2oSBOz' // テストモード: スタンダード
      : 'price_1S14mjFA5w33p4WyV9ZZVSqj', // 本番モード: NANKANアナリティクス(スタンダード) 100円
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
    // テストモードと本番モードで価格IDを切り替え
    stripePriceId: isTestMode
      ? 'price_1RzEVfFA5w33p4Wy7GPtIHfv' // テストモード: プレミアム
      : 'price_1S0YUfFA5w33p4WyVImKgx4c', // 本番モード: NANKANアナリティクス(プレミアム)
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
    // タイムアウト設定付きのfetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト
    
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
      signal: controller.signal
    })
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const session = await response.json()
    
    if (!response.ok) {
      throw new Error(session.error || 'チェックアウトセッションの作成に失敗しました')
    }

    return session
  } catch (error) {
    console.error('Checkout session creation error:', error)
    
    if (error.name === 'AbortError') {
      throw new Error('リクエストがタイムアウトしました。再度お試しください。')
    }
    
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