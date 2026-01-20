# Airtable 入金確認メール自動送信設定ガイド

## 📋 概要

Airtableで顧客のStatusを "pending" → "active" に変更すると、自動的に「入金ありがとうメール + ログイン情報」が送信されます。

---

## ⚙️ 事前準備: Airtableフィールド追加

### **Customersテーブルに以下のフィールドを追加**

| フィールド名 | 型 | 説明 |
|--------------|-----|------|
| **PaymentEmailSent** | Checkbox | 入金確認メール送信済みフラグ（二重送信防止） |

**追加手順:**
1. Customersテーブルを開く
2. 右上の「+」ボタンをクリック
3. フィールドタイプ: **Checkbox**
4. フィールド名: **PaymentEmailSent**
5. 「Create field」をクリック

---

## 🚀 Airtable Automation設定

### **Step 1: Automations画面を開く**

1. Airtableの左サイドバーで **Automations** をクリック
2. **Create automation** ボタンをクリック
3. Automation名: **入金確認メール自動送信**

---

### **Step 2: Trigger設定（トリガー）**

**トリガー: When record matches conditions**

1. **Trigger**: 「When record matches conditions」を選択
2. **Table**: `Customers` を選択
3. **Conditions**（条件設定）:

```
すべての条件に一致（AND条件）:

1. Status = "active"
2. PaymentEmailSent ≠ true
```

**設定手順:**
- 「Add condition」をクリック
- **Condition 1:**
  - フィールド: `Status`
  - 条件: `is`
  - 値: `active`
- 「Add condition」をクリック（もう一度）
- **Condition 2:**
  - フィールド: `PaymentEmailSent`
  - 条件: `is not` または `does not contain`
  - 値: `true` または チェックを入れない

**重要:**
- 「Match any conditions (OR)」ではなく、**「Match all conditions (AND)」**を選択
- これにより、Statusが "active" かつ PaymentEmailSentがfalseの場合のみトリガー発動

---

### **Step 3: Action設定（アクション）**

**アクション: Run script OR Webhook**

#### **方法A: Webhook（推奨・シンプル）**

1. **Action**: 「Run a script」の代わりに **「Send a webhook」** を選択
2. **Webhook URL**:
```
https://nankan-analytics.keiba.link/.netlify/functions/send-payment-confirmation-auto
```

3. **Method**: `POST`

4. **Headers**:
```
Content-Type: application/json
```

5. **Body** (JSON形式):
```json
{
  "airtableRecordId": "{{record.id}}"
}
```

**設定画面での入力方法:**
- Body欄をクリック
- 「Insert field」をクリック
- `Record ID` を選択
- 以下のように入力:
```json
{
  "airtableRecordId": "XXXXX"
}
```
- `XXXXX` の部分が青いボタン（`Record ID`）になっていればOK

---

#### **方法B: Run script（高度）**

もしWebhookがうまく動かない場合は、以下のスクリプトを使用:

```javascript
// Airtable Automation Script
// 入金確認メール自動送信

const config = input.config();
const recordId = config.recordId;

console.log('🚀 Triggering payment confirmation email for:', recordId);

// Netlify Functionを呼び出し
const response = await fetch('https://nankan-analytics.keiba.link/.netlify/functions/send-payment-confirmation-auto', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    airtableRecordId: recordId
  })
});

const result = await response.json();

if (response.ok) {
  console.log('✅ Email sent successfully:', result);
} else {
  console.error('❌ Email send failed:', result);
  throw new Error('Failed to send payment confirmation email');
}

output.set('result', result);
```

**Input variables設定:**
- Variable name: `recordId`
- Value: `Record ID`（トリガーされたレコードのID）

---

### **Step 4: テスト実行**

1. Automation設定画面の右上で **「Test」** ボタンをクリック
2. テスト用のレコードを選択（Status = "active", PaymentEmailSent = false）
3. 「Run test」をクリック
4. ✅ メールが送信されることを確認
5. ✅ PaymentEmailSentが自動的に `true` に更新されることを確認

---

### **Step 5: Automationを有効化**

1. テストが成功したら、右上の **「Turn on」** ボタンをクリック
2. Automationが有効になります ✅

---

## 📱 運用フロー

### **出先（スマホ）での操作**

1. **銀行アプリで入金確認**
2. **Airtableモバイルアプリを開く**
3. **Customersテーブル**で該当レコードを開く
4. **Status** を "pending" → **"active"** に変更
5. → **自動的にメール送信** ✅

**所要時間: 30秒**

---

### **デスクトップでの操作**

1. **銀行口座で入金確認**（三井住友銀行 洲本支店 普通 5338892）
2. **Airtable Web版を開く**
3. **Customersテーブル**で該当レコードを開く
4. **Status** を "pending" → **"active"** に変更
5. → **自動的にメール送信** ✅

---

## 🔍 動作確認

### **メール送信確認方法**

1. **Airtable Automation Run History**
   - Automations画面 → 該当Automation → **Run history** タブ
   - 成功: 緑色のチェックマーク ✅
   - 失敗: 赤色のエラーマーク ❌

2. **Netlify Functions Logs**
   - Netlify管理画面 → Functions → `send-payment-confirmation-auto`
   - ログで実行履歴を確認

3. **SendGrid Activity**
   - SendGrid管理画面 → Activity
   - メール送信履歴を確認

---

## ⚠️ トラブルシューティング

### **問題1: メールが送信されない**

**確認項目:**
- [ ] Automation が「Turn on」になっているか
- [ ] Status が正しく "active" になっているか
- [ ] PaymentEmailSent が `false` になっているか（チェックが入っていない）
- [ ] Email, 氏名, プラン の3つのフィールドが空でないか

**解決策:**
- Airtable Automation Run History でエラー内容を確認
- Netlify Functions Logs で詳細ログを確認

---

### **問題2: 二重送信される**

**原因:**
- PaymentEmailSent が `true` に更新されていない
- Automationトリガー条件に `PaymentEmailSent ≠ true` が含まれていない

**解決策:**
- Automation条件を再確認
- 手動で PaymentEmailSent を `false` にリセットしてから再テスト

---

### **問題3: Webhook URLが無効**

**確認:**
```bash
curl -X POST https://nankan-analytics.keiba.link/.netlify/functions/send-payment-confirmation-auto \
  -H 'Content-Type: application/json' \
  -d '{"airtableRecordId": "recXXXXXXXXXXXXXX"}'
```

**期待されるレスポンス:**
```json
{
  "success": true,
  "message": "Payment confirmation email sent successfully",
  "email": "example@example.com",
  "productName": "Premium",
  "airtableRecordId": "recXXXXXXXXXXXXXX"
}
```

---

## 📊 フィールド構成まとめ

| フィールド名 | 型 | 用途 |
|--------------|-----|------|
| Email | Email | 顧客メールアドレス（必須） |
| 氏名 | Single line text | 顧客氏名（必須） |
| プラン | Single select | Standard/Premium/Premium Sanrenpuku/Premium Combo/Test |
| Status | Single select | pending/active/cancelled/suspended |
| **PaymentEmailSent** | **Checkbox** | **入金確認メール送信済みフラグ** |

---

## ✅ 完了チェックリスト

- [ ] Customersテーブルに `PaymentEmailSent` フィールド追加
- [ ] Airtable Automation作成（入金確認メール自動送信）
- [ ] Trigger設定: Status = "active" AND PaymentEmailSent ≠ true
- [ ] Action設定: Webhook → Netlify Function
- [ ] テスト実行: メール送信 ✅、PaymentEmailSent更新 ✅
- [ ] Automation有効化（Turn on）

---

## 🎉 完成！

これで、出先でもスマホ1つで「Status変更 → 自動メール送信」が可能です。

**所要時間: 30秒**
**手動作業: Status変更のみ**
**自動処理: メール送信 + PaymentEmailSent更新**

---

**最終更新**: 2026-01-20
**バージョン**: 1.0.0 - 完全自動化対応版
