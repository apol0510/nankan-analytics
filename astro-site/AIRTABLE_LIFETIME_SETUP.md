# Airtable Lifetime対応セットアップガイド

## 📅 作成日: 2026-02-09

## 🎯 目的

**買い切り制・Lifetime機能の実装**

### 仕様:
1. **Premium 買い切り（¥78,000）**: 永久アクセス
2. **Sanrenpuku Lifetime 買い切り（¥78,000）**:
   - Sanrenpuku機能の買い切り
   - **Premium期限内のみ有効**
   - Premium買い切りを持っていれば → Sanrenpuku Lifetimeは永久に使える
   - Premium月払い/年払いで期限切れ → Sanrenpuku Lifetime使えなくなる

---

## 📋 Customersテーブル設計

### 既存フィールド

| フィールド名 | 型 | 説明 |
|-------------|-----|------|
| Email | Email | 顧客メールアドレス（Primary Key） |
| Name | Single line text | 顧客氏名 |
| Plan | Single select | プラン名（後述） |
| Status | Single select | active, pending, expired, cancelled |
| ExpirationDate | Date | 有効期限（月払い/年払いのみ） |
| CreatedAt | Date | 登録日時 |
| BlastMailRegistered | Checkbox | BlastMail登録済みフラグ |
| PaymentEmailSent | Checkbox | 入金確認メール送信済みフラグ |

---

## 🆕 新規追加フィールド（Lifetime対応）

### 1. PlanType（支払い種別）

| 設定 | 値 |
|------|-----|
| フィールド名 | PlanType |
| 型 | Single select |
| オプション | `Monthly`, `Annual`, `Lifetime` |
| デフォルト値 | `Monthly` |
| 説明 | 月払い/年払い/買い切りを区別 |

**重要:**
- `Lifetime`: ExpirationDateは空（永久アクセス）
- `Monthly`: ExpirationDate必須（1ヶ月後）
- `Annual`: ExpirationDate必須（1年後）

---

### 2. LifetimeSanrenpuku（Sanrenpuku Lifetime購入フラグ）

| 設定 | 値 |
|------|-----|
| フィールド名 | LifetimeSanrenpuku |
| 型 | Checkbox |
| デフォルト値 | `false` |
| 説明 | Sanrenpuku Lifetime買い切り購入済みフラグ |

**重要:**
- `true`: Sanrenpuku Lifetimeを購入済み
- `false`: 未購入

**アクセス制御ロジック:**
```javascript
// Sanrenpuku機能へのアクセス条件:
if (Plan === "Premium Sanrenpuku" && Status === "active") {
  // アクセス許可
}
else if (Plan === "Premium Combo" && Status === "active") {
  // アクセス許可
}
else if (LifetimeSanrenpuku === true && Plan === "Premium" && Status === "active") {
  // ✅ Sanrenpuku Lifetime購入者（Premium有効中のみ）
  // アクセス許可
}
else {
  // アクセス拒否
}
```

---

## 🔧 Planフィールド設定（2026-02-09更新）

### Single selectオプション

| プラン名 | 説明 | 価格 |
|---------|------|------|
| `Free` | 無料会員 | ¥0 |
| `Standard` | 一時非表示（既存会員のみ） | ¥5,980/月 |
| `Premium` | プレミアム会員 | ¥78,000（買い切り）/ ¥68,000（年払い）/ ¥18,000（月払い） |
| `Premium Sanrenpuku` | 三連複専用（廃止予定） | ¥78,000（買い切り） |
| `Premium Combo` | 馬単+三連複（廃止予定） | ¥78,000（買い切り） |

**⚠️ 重要: 新しいプラン体系**

**買い切り制導入後のプラン構成:**
1. **Premium（基本プラン）**:
   - 買い切り: ¥78,000（永久アクセス）
   - 年払い: ¥68,000/年
   - 月払い: ¥18,000/月
   - PlanType: `Lifetime`, `Annual`, `Monthly`

2. **Sanrenpuku Lifetime（アドオン商品）**:
   - 買い切り: ¥78,000（Premium期限内のみ有効）
   - Plan: `Premium` + LifetimeSanrenpuku: `true`
   - PlanType: （Premiumと同じ）

3. **Premium Plus（単品商品）**:
   - 買い切り: ¥68,000（永久アクセス）
   - Plan: （別テーブルで管理 or 新規フィールド）

---

## 📊 Status判定ロジック（2026-02-09更新）

### active判定

```javascript
function isActive(record) {
  // 1. Statusフィールドが "active" であること
  if (record.Status !== "active") {
    return false;
  }

  // 2. PlanType別の有効期限チェック
  if (record.PlanType === "Lifetime") {
    // 買い切りは常にactive（ExpirationDateなし）
    return true;
  }

  if (record.PlanType === "Monthly" || record.PlanType === "Annual") {
    // 月払い/年払いはExpirationDateチェック
    const now = new Date();
    const expiry = new Date(record.ExpirationDate);
    return expiry > now;
  }

  // PlanTypeが未設定の場合はExpirationDateチェック（互換性）
  if (!record.PlanType && record.ExpirationDate) {
    const now = new Date();
    const expiry = new Date(record.ExpirationDate);
    return expiry > now;
  }

  // その他（ExpirationDateなし・PlanType未設定）
  return true;
}
```

---

## 🔐 アクセス制御ロジック（完全版）

### Sanrenpuku機能へのアクセス

```javascript
function canAccessSanrenpuku(record) {
  // 1. Premium Sanrenpukuプラン（廃止予定だが既存会員対応）
  if (record.Plan === "Premium Sanrenpuku" && isActive(record)) {
    return true;
  }

  // 2. Premium Comboプラン（廃止予定だが既存会員対応）
  if (record.Plan === "Premium Combo" && isActive(record)) {
    return true;
  }

  // 3. ✅ Sanrenpuku Lifetime購入者（新仕様）
  if (record.LifetimeSanrenpuku === true && record.Plan === "Premium" && isActive(record)) {
    // Premium有効中のみSanrenpuku機能が使える
    return true;
  }

  return false;
}
```

### Premium機能へのアクセス（馬単予想）

```javascript
function canAccessPremium(record) {
  // Premium系プラン全て
  if ((record.Plan === "Premium" ||
       record.Plan === "Premium Sanrenpuku" ||
       record.Plan === "Premium Combo") &&
      isActive(record)) {
    return true;
  }

  return false;
}
```

---

## 📝 購入フロー例

### Case 1: Premium買い切り → Sanrenpuku Lifetime追加購入

**ステップ1: Premium買い切り購入**
```json
{
  "Email": "customer@example.com",
  "Name": "田中太郎",
  "Plan": "Premium",
  "PlanType": "Lifetime",
  "Status": "active",
  "ExpirationDate": null,
  "LifetimeSanrenpuku": false
}
```

**ステップ2: Sanrenpuku Lifetime追加購入**
```json
{
  "Email": "customer@example.com",
  "Name": "田中太郎",
  "Plan": "Premium",
  "PlanType": "Lifetime",
  "Status": "active",
  "ExpirationDate": null,
  "LifetimeSanrenpuku": true  // ← 変更
}
```

**アクセス権限:**
- ✅ Premium機能: 永久アクセス（PlanType = Lifetime）
- ✅ Sanrenpuku機能: 永久アクセス（LifetimeSanrenpuku = true + PlanType = Lifetime）

---

### Case 2: Premium月払い → Sanrenpuku Lifetime追加購入

**ステップ1: Premium月払い購入**
```json
{
  "Email": "yamada@example.com",
  "Name": "山田花子",
  "Plan": "Premium",
  "PlanType": "Monthly",
  "Status": "active",
  "ExpirationDate": "2026-03-09",
  "LifetimeSanrenpuku": false
}
```

**ステップ2: Sanrenpuku Lifetime追加購入**
```json
{
  "Email": "yamada@example.com",
  "Name": "山田花子",
  "Plan": "Premium",
  "PlanType": "Monthly",
  "Status": "active",
  "ExpirationDate": "2026-03-09",
  "LifetimeSanrenpuku": true  // ← 変更
}
```

**アクセス権限:**
- ✅ Premium機能: 2026-03-09まで（PlanType = Monthly）
- ✅ Sanrenpuku機能: **2026-03-09まで**（Premium期限内のみ有効）

**ステップ3: Premium期限切れ**
```json
{
  "Email": "yamada@example.com",
  "Name": "山田花子",
  "Plan": "Premium",
  "PlanType": "Monthly",
  "Status": "expired",  // ← 変更
  "ExpirationDate": "2026-03-09",
  "LifetimeSanrenpuku": true
}
```

**アクセス権限:**
- ❌ Premium機能: 期限切れ（Status = expired）
- ❌ Sanrenpuku機能: **使えない**（Premium期限切れのため）

**ステップ4: Premium買い切りにアップグレード**
```json
{
  "Email": "yamada@example.com",
  "Name": "山田花子",
  "Plan": "Premium",
  "PlanType": "Lifetime",  // ← 変更
  "Status": "active",  // ← 変更
  "ExpirationDate": null,  // ← 変更
  "LifetimeSanrenpuku": true
}
```

**アクセス権限:**
- ✅ Premium機能: 永久アクセス（PlanType = Lifetime）
- ✅ Sanrenpuku機能: **永久アクセス**（LifetimeSanrenpuku = true + PlanType = Lifetime）

---

## 🔧 Airtable設定手順

### ステップ1: フィールド追加

1. Customersテーブルを開く
2. 「+」ボタンで新規フィールド追加

**PlanType（Single select）:**
- フィールド名: `PlanType`
- 型: `Single select`
- オプション: `Monthly`, `Annual`, `Lifetime`
- デフォルト値: `Monthly`

**LifetimeSanrenpuku（Checkbox）:**
- フィールド名: `LifetimeSanrenpuku`
- 型: `Checkbox`
- デフォルト値: `false`（チェックなし）

### ステップ2: 既存レコードの一括更新

**⚠️ 重要: 既存データのマイグレーション**

```
既存の全レコードに対して:
- PlanType = "Monthly"（デフォルト値）
- LifetimeSanrenpuku = false
```

**一括更新スクリプト（Airtable Scripting）:**
```javascript
// Customersテーブルの全レコードを取得
let table = base.getTable("Customers");
let records = await table.selectRecordsAsync();

let updates = [];
for (let record of records.records) {
  // 既存レコードはすべてMonthlyとして扱う（互換性）
  updates.push({
    id: record.id,
    fields: {
      "PlanType": "Monthly",
      "LifetimeSanrenpuku": false
    }
  });

  // Airtable APIの50件制限に対応
  if (updates.length === 50) {
    await table.updateRecordsAsync(updates);
    updates = [];
  }
}

// 残りを更新
if (updates.length > 0) {
  await table.updateRecordsAsync(updates);
}

console.log("✅ 既存レコードのマイグレーション完了");
```

### ステップ3: View作成（管理用）

**Lifetime会員View:**
- フィルタ: `PlanType = "Lifetime"`
- ソート: `CreatedAt` 降順

**Sanrenpuku Lifetime会員View:**
- フィルタ: `LifetimeSanrenpuku = true`
- ソート: `CreatedAt` 降順

**期限切れ注意View:**
- フィルタ: `Status = "active" AND PlanType != "Lifetime" AND ExpirationDate < TODAY()`
- ソート: `ExpirationDate` 昇順

---

## 🚀 次のステップ

1. ✅ Airtableフィールド追加（PlanType, LifetimeSanrenpuku）
2. ✅ 既存レコードマイグレーション
3. ⏳ AccessControl.astro修正（Lifetimeロジック実装）
4. ⏳ bank-transfer-application.js修正（productName対応）
5. ⏳ 全ページのプラン名統一（"Sanrenpuku Lifetime"）
6. ⏳ テスト実施

---

## 📚 関連ドキュメント

- `/CLAUDE.md`: プロジェクト全体のルール
- `/AIRTABLE_NEWSLETTER_SETUP.md`: メルマガシステム設計
- `/VSCode-CRASH-FIX.md`: 開発環境トラブルシューティング

---

**🎉 マコ&クロの最強コンビで Lifetime機能を実装！**
