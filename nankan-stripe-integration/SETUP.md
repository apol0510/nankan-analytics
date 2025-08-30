# 🚀 NANKAN Stripe Integration - セットアップガイド

## 📋 6ステップで本番まで

### 1️⃣ 依存関係インストール
```bash
npm install
```

### 2️⃣ 環境変数設定
```bash
cp .env.example .env
```

`.env`を編集して以下を設定：

#### Stripe設定
1. [Stripe Dashboard](https://dashboard.stripe.com) にログイン
2. **Test Mode** が有効になっていることを確認
3. **Products** から料金作成：
   - Standard: ¥5,980/月
   - Premium: ¥9,980/月
4. **API Keys** から取得：
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
5. **Webhooks** でエンドポイント作成：
   - URL: `http://localhost:4321/api/stripe/webhook`
   - イベント: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`
   - `STRIPE_WEBHOOK_SECRET_TEST=whsec_...` をコピー

#### Supabase設定
1. [Supabase](https://app.supabase.com) でプロジェクト作成
2. **Settings > API** から取得：
   - `PUBLIC_SUPABASE_URL=https://xxx.supabase.co`
   - `PUBLIC_SUPABASE_ANON_KEY=eyJ...`
   - `SUPABASE_SERVICE_ROLE_KEY=eyJ...`

#### SendGrid設定
1. [SendGrid](https://app.sendgrid.com) でAPI Key作成
2. `SENDGRID_API_KEY=SG...`

### 3️⃣ データベースセットアップ
1. Supabase SQL Editorにアクセス
2. `supabase/migrations/003_payment_system_upgrade.sql` の内容をコピー
3. SQLを実行してテーブル・RLSを作成

### 4️⃣ Stripe Webhook（ローカル開発）
別ターミナルで実行：
```bash
stripe listen --forward-to http://localhost:4321/api/stripe/webhook
```

### 5️⃣ 開発サーバー起動
```bash
npm run dev
```

### 6️⃣ テスト実行
1. http://localhost:4321 にアクセス
2. 「料金プラン」→「スタンダードプランを始める」
3. テスト用クレジットカード: `4242 4242 4242 4242`
4. 決済完了を確認
5. Supabase → profiles テーブルで `active_plan` が `standard` に更新されていることを確認

## 🔧 トラブルシューティング

### Webhook が受信されない
- Stripe CLI が起動しているか確認
- `.env` の `STRIPE_WEBHOOK_SECRET_TEST` が正しいか確認
- ポート4321が使用可能か確認

### データベース接続エラー
- Supabase の URL・キーが正しいか確認
- Service Role Key を使用しているか確認（Anon Key ではない）
- RLS ポリシーが正しく設定されているか確認

### 決済が失敗する
- Stripe の Test Mode が有効か確認
- Price ID が正しく設定されているか確認
- テスト用クレジットカード番号を使用しているか確認

## 🚢 本番デプロイ準備

### 1. 本番環境変数設定
- Stripe を Live Mode に切り替え
- 本番用 Price ID・Webhook Secret に変更
- 本番用 Supabase URL・キー に変更

### 2. Webhook URL更新
```
本番用: https://yourdomain.com/api/stripe/webhook
```

### 3. 本番テスト
- 実際の低額決済（¥100など）でテスト
- Webhook が正常に受信されることを確認
- DB更新が正しく行われることを確認

---

**完了！これで完全自動化決済システムが動作します** 🎉