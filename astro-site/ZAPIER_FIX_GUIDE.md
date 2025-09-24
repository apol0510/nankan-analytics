# 🔧 Zapier Airtable連携エラー修正ガイド

## 🚨 現在のエラー状況

### エラーメッセージ
```
Airtable
Required field "Email" (fields__fldiu5xrNdkbWzleT) is missing.
```

### 問題の原因
Checkout Session CompletedイベントではEmailが直接含まれていない。Customer EmailフィールドやCustomer Detailsは存在するが、emailの具体的な値が見つからない。

---

## 📋 修正手順

### Step 1: Zapierにログインして該当Zapを編集

1. [Zapier](https://zapier.com)にログイン
2. 「[PROD] Stripe→Airtable→SendGrid」Zapを開く
3. 「Edit」ボタンをクリック

### Step 2: Stripeトリガーのデータ構造確認

スクリーンショットから確認できる利用可能なフィールド：
- **Customer Email** - 空の値
- **Customer Details** - オブジェクトだがemail値が見えない
- **Customer** - CustomerID（cus_から始まる文字列）

### Step 2.1: 別のテストレコードを試す

1. 「Find new records」をクリック
2. より新しいCheckout Sessionを選択
3. 実際にEmailが含まれているレコードを探す

### Step 3: 解決策1 - Customer IDからEmailを取得

Checkout SessionにEmailが含まれていない場合、Customer IDを使って顧客情報を取得します。

#### Step 3.1: Stripe Find Customerアクションを追加

1. **「+」ボタン**をクリックして新しいステップを追加
2. **App**: Stripe
3. **Action**: Find Customer
4. **Customer ID**: `{{1.Customer}}`（Step 1のCustomerフィールド）

#### Step 3.2: Airtableマッピング修正

AirtableのEmailフィールドに以下をマッピング：
```
{{2.Email}}  // Step 2（Find Customer）のEmailフィールド
```

### Step 4: 解決策2 - Stripe Retrieve Sessionを使用

より詳細な情報を取得するため：

1. **新しいアクション追加**: Stripe - Retrieve Session
2. **Session ID**: `{{1.ID}}`
3. **Expand**: `customer`を含める
4. 取得したデータからEmailをマッピング

### Step 4: カスタムマッピング（必要に応じて）

もしEmailが複数の場所に存在する場合：

1. 「Custom」タブをクリック
2. 以下の式を入力：
```
{{1.customer_details.email||1.charges.0.billing_details.email||1.receipt_email||1.customer_email}}
```

これにより、最初に見つかったEmailが使用されます。

### Step 5: その他の必須フィールド確認

Airtableの他の必須フィールドも確認：

| フィールド | Stripeからのマッピング |
|---------|-----------------|
| **顧客ID** | `{{1.Customer}}` または `{{1.ID}}` |
| **プラン** | `{{1.Metadata Plan Type}}` または 固定値 |
| **支払い金額** | `{{1.Amount}} / 100` |
| **通貨** | `{{1.Currency}}` または `JPY` |
| **有効期限** | `{{1.Lines Data 0 Period End}}` |

### Step 6: フィルター設定確認

Zapに「Filter」ステップがある場合：

1. **条件1**: Payment Status = `succeeded`
2. **条件2**: Amount > 0
3. **条件3**: Emailフィールドが存在する

フィルター追加方法：
```javascript
// Only Continue If...
1.customer_details.email | (Text) Exists
// OR
1.charges.0.billing_details.email | (Text) Exists
```

### Step 7: テスト実行

1. 各ステップで「Test」ボタンをクリック
2. 成功したら「Continue」
3. 全ステップ完了後、「Publish」

---

## 🧪 デバッグ方法

### 方法1: Zapier History確認

1. Zapier Dashboard → History
2. 失敗したZap実行を見つける
3. 詳細を開く
4. 各ステップのInput/Outputを確認

### 方法2: Stripe Webhookログ確認

1. Stripe Dashboard → Developers → Webhooks
2. 該当のWebhookをクリック
3. 「Webhook attempts」で送信データを確認
4. Emailフィールドの場所を特定

### 方法3: テストモードで検証

1. Stripeテストモードに切り替え
2. テスト決済を実行：
```
カード番号: 4242 4242 4242 4242
有効期限: 任意の未来の日付
CVC: 任意の3桁
Email: test@example.com
```

---

## 💡 よくある原因と対策

### 原因1: Payment LinksでEmailが任意になっている

**対策**: Stripe Payment Links設定でEmailを必須にする
1. Stripe Dashboard → Payment Links
2. 該当のPayment Linkを編集
3. 「Collect customer details」→「Email」を必須に

### 原因2: Airtableフィールド名の不一致

**対策**: Airtableで実際のフィールド名を確認
1. Airtableを開く
2. テーブルのフィールド名を確認（大文字小文字も含む）
3. Zapierで正確なフィールド名を使用

### 原因3: Stripeイベントタイプの違い

**対策**: 適切なイベントタイプを使用
- `payment_intent.succeeded` → Payment Intents用
- `checkout.session.completed` → Checkout Sessions用（推奨）
- `invoice.payment_succeeded` → Subscriptions用

---

## 🎯 推奨設定（修正版）

### 最も確実な方法：2ステップ構成

```yaml
Step 1: Stripe Trigger
Event: Checkout Session Completed

Step 2: Stripe Find Customer
Customer ID: {{1.Customer}}
↓
これでEmailが取得できる

Step 3: Airtable Create/Update Record
Email: {{2.Email}}  # Step 2から取得
名前: {{2.Name}}
金額: {{1.Amount Total}} / 100
プラン: {{1.Metadata Plan Type}}
顧客ID: {{1.Customer}}
```

### 重要な注意点
Checkout Session CompletedイベントではEmailが直接含まれていないため、Customer IDを使って顧客情報を別途取得する必要があります。

---

## 📞 サポート

### 追加サポートが必要な場合

1. **Zapier Support**: https://zapier.com/app/get-help
2. **エラーの詳細スクリーンショット**を準備
3. **Zap History URL**をコピー

### テスト用データ

テスト実行用のサンプルEmailアドレス：
- test-standard@example.com
- test-premium@example.com
- test-free@example.com

---

## ✅ チェックリスト

修正完了確認：

- [ ] Stripeトリガーの出力にEmailが含まれている
- [ ] AirtableのEmailフィールドにマッピング済み
- [ ] テストが成功した
- [ ] 本番モードで動作確認
- [ ] Airtableに新規レコードが作成された
- [ ] SendGridでメールが送信された

---

**最終更新**: 2025-09-24
**作成者**: マコ&クロ