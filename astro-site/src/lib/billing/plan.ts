// Billing plan definitions and utilities
export type PlanType = 'free' | 'standard' | 'premium';

export interface Plan {
  id: PlanType;
  name: string;
  displayName: string;
  price: number;
  priceId: string;
  features: string[];
  description: string;
}

// Plan configurations
export const PLANS: Record<PlanType, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    displayName: '無料プラン',
    price: 0,
    priceId: '',
    features: [
      'メインレース（11R）の予想',
      '基本的な競馬情報',
      '予想結果の確認'
    ],
    description: '南関競馬のメインレースを無料で予想'
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    displayName: 'スタンダードプラン',
    price: 5980,
    priceId: getStripePrice('standard'),
    features: [
      '後半3レースの予想（10R、11R、12R）',
      'AI予想の詳細分析',
      '投資戦略の提案',
      'メール通知'
    ],
    description: '後半レースで勝負したい方におすすめ'
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    displayName: 'プレミアムプラン',
    price: 9980,
    priceId: getStripePrice('premium'),
    features: [
      '全レース（1R〜12R）の予想',
      '高精度AI予想',
      '詳細な投資戦略',
      '優先サポート',
      'データエクスポート機能'
    ],
    description: '全レースを網羅したい本格派向け'
  }
};

// Get Stripe price ID based on environment
function getStripePrice(planType: 'standard' | 'premium'): string {
  const mode = (import.meta.env.STRIPE_MODE ?? 'test').toLowerCase();
  console.log('[plan.ts] Mode:', mode, 'Plan:', planType);
  
  const key = planType === 'standard' 
    ? (mode === 'live' ? 'STRIPE_STANDARD_PRICE_ID_LIVE' : 'STRIPE_STANDARD_PRICE_ID_TEST')
    : (mode === 'live' ? 'STRIPE_PREMIUM_PRICE_ID_LIVE' : 'STRIPE_PREMIUM_PRICE_ID_TEST');
  
  const priceId = import.meta.env[key] || '';
  console.log(`[plan.ts] ENV ${key}:`, priceId || 'UNDEFINED');
  console.log('[plan.ts] Final price ID:', priceId);
  return priceId;
}

// Utility functions
export function getPlanById(planId: PlanType): Plan {
  return PLANS[planId];
}

export function getPlanByPriceId(priceId: string): Plan | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.priceId === priceId) {
      return plan;
    }
  }
  return null;
}

export function isPaidPlan(planId: PlanType): boolean {
  return planId !== 'free';
}

export function canAccessRace(planId: PlanType, raceNumber: number, totalRaces: number = 12): boolean {
  switch (planId) {
    case 'free':
      // メインレース（最終レースの1つ前）のみ
      return raceNumber === totalRaces - 1;
    
    case 'standard':
      // 後半3レース
      return raceNumber >= totalRaces - 2; // 10R, 11R, 12R (12レース開催時)
    
    case 'premium':
      // 全レース
      return true;
    
    default:
      return false;
  }
}

// Race access configuration
export function getRaceAccessConfig(totalRaces: number = 12) {
  const mainRace = totalRaces - 1; // メインレース（最終の1つ前）
  const standardRaces = [totalRaces - 2, totalRaces - 1, totalRaces]; // 後半3レース
  
  return {
    free: {
      races: [`${mainRace}R`],
      description: `${mainRace}R（メインレース）`
    },
    standard: {
      races: standardRaces.map(r => `${r}R`),
      description: `後半3レース（${standardRaces.join('R、')}R）`
    },
    premium: {
      races: Array.from({ length: totalRaces }, (_, i) => `${i + 1}R`),
      description: `全レース（1R〜${totalRaces}R）`
    }
  };
}

// Plan upgrade/downgrade logic
export function getUpgradePath(currentPlan: PlanType): PlanType[] {
  const upgrades: Record<PlanType, PlanType[]> = {
    free: ['standard', 'premium'],
    standard: ['premium'],
    premium: []
  };
  
  return upgrades[currentPlan] || [];
}

export function getDowngradePath(currentPlan: PlanType): PlanType[] {
  const downgrades: Record<PlanType, PlanType[]> = {
    free: [],
    standard: ['free'],
    premium: ['standard', 'free']
  };
  
  return downgrades[currentPlan] || [];
}