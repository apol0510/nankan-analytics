# 🚀 Zapier自動化セットアップガイド（シンプル版）

## 目標
決済完了後に「自動で顧客情報をAirtableに登録 → ログイン情報メール送信」

## 🔥 STEP 1: Zapierアカウント準備
1. [Zapier.com](https://zapier.com) でアカウント作成
2. 「Create Zap」をクリック

## 🎯 STEP 2: トリガー設定（Stripe決済完了）

### トリガー選択
- **App**: Stripe を検索
- **Event**: `Checkout Session Completed` を選択
- **Continue** をクリック

### Stripe接続
- **Connect Account** でStripeアカウントに接続
- テストモード/本番モード選択（現在はテストモード推奨）

### テスト
- **Test Trigger** で最近の決済データを確認
- データが表示されればOK

## 📊 STEP 3: アクション1設定（Airtable顧客登録）

### アクション追加
- **+ Add Step** → **Action**
- **App**: Airtable を検索
- **Event**: `Create Record` を選択

### Airtable接続とテーブル設定
- **Connect Account** でAirtableアカウントに接続
- **Base**: `NANKANアナリティクス顧客管理` を選択
- **Table**: `顧客` を選択

### データマッピング
以下のようにStripeデータをAirtableフィールドにマッピング:

```
メールアドレス: {{customer_email}} (Stripeから)
顧客名: {{customer_name}} (Stripeから)
決済プラン: {{price_id}} から判定
  - price_1... (Standard) → "Standard"  
  - price_2... (Premium) → "Premium"
決済完了日: {{created}} (Stripeから)
ステータス: "有効" (固定値)
有効期限: {{created}}の30日後を計算
決済ID: {{id}} (Stripeから)
```

## 📧 STEP 4: アクション2設定（Brevo메일送信）

### アクション追加
- **+ Add Step** → **Action**  
- **App**: Brevo (旧Sendinblue) を検索
- **Event**: `Send Transactional Email` を選択

### Brevo接続
- **Connect Account** でBrevoアカウントに接続
- API Key が必要（Brevo管理画面で取得）

### メール設定
```
To Email: {{customer_email}} (Stripe/Airtableから)
From Email: info@nankan-analytics.com (設定済みドメイン)
From Name: NANKANアナリティクス
Subject: 【NANKAN】ログイン情報とご利用開始のご案内

本文テンプレート:
{{customer_name}}様

NANKANアナリティクスにご登録いただき、ありがとうございます！

■ ログイン情報
サイトURL: https://nankan-analytics.keiba.link
メールアドレス: {{customer_email}}
プラン: {{plan_type}}
有効期限: {{expiry_date}}

■ ご利用開始方法
1. 上記URLにアクセス
2. ログインURL: https://nankan-analytics.keiba.link/welcome?email={{customer_email}}&plan={{plan_type}}

ご不明点がございましたら、お気軽にお問い合わせください。

NANKANアナリティクス運営チーム
```

## 🧪 STEP 5: テスト実行

### テスト決済実行
1. Stripe Payment Linkで¥100テスト決済を実行
2. Zapierの実行ログを確認
3. Airtableに顧客データが追加されているか確認
4. メールが正常に送信されているか確認

## 🚀 STEP 6: 本番運用移行

### 価格ID更新
テスト完了後、以下の価格IDに更新:
- Standard: `price_1...` (¥5,980)
- Premium: `price_2...` (¥9,980)

### Zap公開
- **Publish** でZapを有効化
- 自動実行開始

## 🔍 監視・メンテナンス

### 定期チェック項目
- [ ] Zapier実行ログの確認（週1回）
- [ ] Airtable顧客データの整合性確認
- [ ] メール配信状況の確認
- [ ] エラー通知設定

### エラー対応
- Zapier管理画面でエラーログを確認
- 必要に応じてマッピングを調整
- テスト決済で動作確認

---

**所要時間**: 約30分
**難易度**: ★★☆☆☆（シンプル）
**自動化完了後**: 決済 → 顧客登録 → メール送信が完全自動