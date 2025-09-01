# 🔥 完全クリーンスタート計画

## 問題: 古いデータ・コードとの混同リスク
- ✅ 既存のmembership関連API
- ✅ 古いstripe設定ファイル  
- ✅ Supabase関連のmigration
- ✅ 複数のWebhook実装
- ✅ 古いpaymentページ群

## 解決策: 完全隔離開発

### Step 1: 新規ディレクトリ作成
```
src/stripe-v2/          # 完全に分離された新システム
├── api/
│   ├── checkout.ts     # 新規Checkout API
│   ├── webhook.ts      # 新規Webhook
│   └── status.ts       # 新規ステータス確認
├── lib/
│   ├── config.js       # 環境設定
│   ├── storage.js      # データ保存（Netlify Blobs専用）
│   └── mail.js         # メール送信
└── pages/
    ├── buy.astro       # 新規購入ページ  
    ├── check.astro     # 新規確認ページ
    └── done.astro      # 完了ページ
```

### Step 2: 完全独立実装
- ❌ 既存APIを使わない
- ❌ 既存ライブラリを読み込まない  
- ❌ 古い環境変数名を使わない
- ✅ 100%新規コードのみ

### Step 3: 新規URLパターン
```
/stripe-v2/buy          # 新規購入（古い/pricingと分離）
/stripe-v2/check        # 新規確認（古い/dashboardと分離）
/api/stripe-v2/checkout # 新規API（古い/api/stripe/と分離）
```

### Step 4: 新規データキー
```javascript
// 古いキー（使用禁止）
'users/${email}.json'
'membership/${id}'

// 新規キー（混同防止）  
'stripe-v2/users/${email}.json'
'stripe-v2/subscriptions/${id}'
```

### Step 5: 動作確認後の統合
1. 新システム完成・テスト完了
2. 古いシステム完全削除
3. 新システムを本来のパスに移動

---

## 📋 実装前確認

### 質問1: 完全クリーンスタートで進めますか？
- A) はい → 新規ディレクトリで隔離開発
- B) いいえ → 既存コード修正（混同リスク高）

### 質問2: URLパスの分離は必要ですか？
- A) 必要 → `/stripe-v2/buy` 等の新パス
- B) 不要 → 既存パスを上書き（危険）

**どちらを選択しますか？**