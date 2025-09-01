# 環境設定チェックリスト

## ❌ 混同しやすい設定パターン

### 間違い例1: 環境変数名の混同
```
❌ STRIPE_SECRET_KEY (テストと本番で同じ名前)
✅ STRIPE_SECRET_KEY_TEST / STRIPE_SECRET_KEY_LIVE
```

### 間違い例2: 価格IDのハードコード
```
❌ priceId: 'price_1234...' (固定値)
✅ priceId: config.priceStandard (環境別)
```

### 間違い例3: URL混同
```
❌ success_url: 'http://localhost:4321/success' (本番でも)
✅ success_url: config.successUrl (環境別)
```

## ✅ 正しい設定方法

### 1. 環境変数設定
**開発環境 (.env.local):**
```
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_WEBHOOK_SECRET_TEST=whsec_...
STRIPE_PRICE_STANDARD_TEST=price_test_...
STRIPE_PRICE_PREMIUM_TEST=price_test_...
SENDGRID_API_KEY=SG.test...
```

**本番環境 (Netlify):**
```
STRIPE_SECRET_KEY_LIVE=sk_live_...
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...
STRIPE_PRICE_STANDARD_LIVE=price_live_...
STRIPE_PRICE_PREMIUM_LIVE=price_live_...
SENDGRID_API_KEY=SG.live...
```

### 2. コードでの使用方法
```javascript
import { getStripeConfig } from '../lib/stripe-config.js';

const config = getStripeConfig();
const stripe = new Stripe(config.secretKey); // 自動で環境判定
```

### 3. 設定検証コマンド
```javascript
import { validateConfig } from '../lib/stripe-config.js';
validateConfig(); // コンソールで設定状況確認
```

## 🚨 実装前チェック

### Phase 1: 設定確認
- [ ] 開発環境の環境変数設定済み
- [ ] 本番環境の環境変数設定済み  
- [ ] validateConfig()で設定確認済み

### Phase 2: テスト実装
- [ ] 開発環境でStripe決済テスト
- [ ] テストカード 4242 4242 4242 4242 で成功確認
- [ ] Webhook受信確認

### Phase 3: 本番リリース
- [ ] 本番環境変数の最終確認
- [ ] 実際のカードでテスト決済
- [ ] メール送信確認

---

**このチェックリストを完了してから実装開始**