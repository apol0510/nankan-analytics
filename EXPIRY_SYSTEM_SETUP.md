# 🗓️ 有効期限システム完全実装ガイド

## 📋 実装日: 2025-10-10

## 🎯 解決する問題

### ❌ 現在の問題
1. **Stripe定期支払いキャンセル後もアクセス可能**
   - Airtableの「プラン」を手動で変更しないと、いつまでもアクセスできてしまう

2. **次回更新日までの期間管理ができない**
   - クレカ決済: 本来は次回更新日まで利用可能であるべき
   - 銀行振込: 管理者が手動で期限を設定する必要がある

3. **運用負荷が高い**
   - 退会のたびに手動でプラン変更が必要
   - 期限管理が属人化

---

## ✅ 新システムの特徴

### 1. **自動期限管理**
- ログイン時に有効期限を自動チェック
- 期限切れなら自動的にFreeプランに降格
- 管理者の手動操作不要

### 2. **透明性の向上**
- ダッシュボードに有効期限を表示
- 期限切れ前に警告表示（7日前から）
- メール通知に期限を明記

### 3. **柔軟な期限設定**
- クレカ決済: 次回更新日を自動設定
- 銀行振込: 管理画面から手動設定
- 特別延長: 管理画面から個別調整可能

---

## 🔧 Airtable設定確認

### ✅ 既存フィールド確認（Customersテーブル）

| フィールド名 | タイプ | 説明 |
|------------|------|------|
| `有効期限` | Date | 有効期限日時（この日までアクセス可能） |

### 📋 フィールド情報

**確認済み**:
- Airtableには既に**日本語フィールド名「有効期限」**が存在
- 新規フィールド追加は不要
- システムは「有効期限」フィールドを自動検出・使用

**互換性対応**:
- システムは以下の優先順位でフィールドを検索:
  1. `有効期限` (日本語フィールド)
  2. `ValidUntil` (英語フィールド)
  3. `ExpiryDate` (旧フィールド)

**推奨設定**:
- **Field type**: Date
- **Include a time field**: Yes
- **Date format**: ISO (2025-10-10)
- **Time format**: 24 hour (14:30)
- **GMT/Timezone**: Asia/Tokyo（日本時間）

---

## 📊 システムフロー

### **1. 新規登録時**
```
Stripe決済完了
  ↓
Zapier → Airtable登録
  ↓
ValidUntilに次回更新日を自動設定（例：30日後）
  ↓
ウェルカムメール送信（有効期限を明記）
```

### **2. ログイン時**
```
ユーザーログイン
  ↓
auth-user.jsでAirtableから情報取得
  ↓
ValidUntilをチェック:
  ├─ 期限切れ → プランをFreeに自動降格
  └─ 期限内 → 現在のプランでログイン
  ↓
ダッシュボード表示（有効期限を表示）
```

### **3. 退会申請時**
```
退会申請
  ↓
process-withdrawal.js実行
  ↓
ValidUntilに次回更新日を設定（または現在の値を維持）
  ↓
メール通知「〇〇年〇〇月〇〇日まで利用可能」
  ↓
期限日に自動的にFreeプランに降格
```

---

## 🔧 実装内容

### **1. auth-user.js（ログイン認証）**

#### **有効期限チェック機能**
```javascript
// 有効期限チェック
const validUntil = user.get('ValidUntil');
const currentPlan = user.get('プラン') || 'free';

if (validUntil && isPlanExpired(validUntil, currentPlan)) {
    // 期限切れ → Freeプランに自動降格
    await updateUserPlan(userId, 'Free');
    normalizedPlan = 'free';
}
```

#### **期限判定ロジック**
- ValidUntilが現在日時より過去 → 期限切れ
- PremiumまたはStandardプランで期限切れ → Freeに降格
- Freeプランは期限チェックなし

---

### **2. process-withdrawal.js（退会処理）**

#### **有効期限自動設定**
```javascript
// 退会時に有効期限を設定
const validUntil = calculateValidUntil(customerRecord);

await updateCustomerWithdrawalStatus(recordId, {
    withdrawalRequested: true,
    withdrawalDate: new Date().toISOString(),
    withdrawalReason: reason,
    validUntil: validUntil // 追加
});
```

#### **有効期限計算**
- クレカ決済: 現在から30日後（または既存のValidUntilを維持）
- 銀行振込: 既存のValidUntilを維持（管理者が設定済み）

---

### **3. dashboard.astro（ダッシュボード）**

#### **有効期限表示**
```html
<!-- 有効期限表示 -->
<div class="expiry-info">
    <p>有効期限: 2025年11月10日まで</p>
    <!-- 7日前から警告 -->
    <p class="warning">⚠️ あと7日で有効期限が切れます</p>
</div>
```

---

### **4. 管理画面（admin/customer-management.astro）**

#### **有効期限設定機能**
- 顧客一覧表示
- 有効期限の個別設定
- 一括延長機能（全員に+30日など）

---

## 🧪 テストシナリオ

### **1. 有効期限切れの自動降格**
```
1. Airtableで顧客のValidUntilを過去の日付に設定
2. その顧客でログイン
3. Freeプランに降格されることを確認
4. プレミアムコンテンツにアクセスできないことを確認
```

### **2. 退会後の期限内アクセス**
```
1. Premium会員が退会申請
2. ValidUntilに次回更新日（30日後）が設定される
3. その顧客でログイン
4. 30日間はプレミアムコンテンツにアクセス可能
5. 31日後にログイン → Freeプランに降格
```

### **3. 期限表示の確認**
```
1. Premium会員でログイン
2. ダッシュボードに有効期限が表示される
3. 期限7日前 → 警告表示
4. 期限当日 → Freeプランに降格
```

---

## 📧 メール通知の変更

### **退会受付メール**
```
⚠️ 今後の流れ:
- 担当者より2営業日以内に退会処理完了のご連絡をいたします
- Stripe定期支払いの停止処理を行います
- 【有効期限】2025年11月10日までプレミアムコンテンツをご利用いただけます
  ※この日以降は自動的にFreeプランに切り替わります
```

---

## 🛡️ 運用ルール

### **クレジットカード決済の場合**
1. 退会申請時、ValidUntilに次回更新日を自動設定
2. Stripeで定期支払いを手動キャンセル
3. 期限日まで自動的にアクセス可能
4. 期限日に自動的にFreeプランに降格

### **銀行振込の場合**
1. 入金確認後、管理画面からValidUntilを手動設定（例：30日後）
2. 退会申請時、既存のValidUntilを維持
3. 期限日まで自動的にアクセス可能
4. 期限日に自動的にFreeプランに降格

---

## 📋 既存会員への対応

### **ValidUntilが未設定の既存会員**
- 次回ログイン時にデフォルト値を設定
  - Premium: 現在から30日後
  - Standard: 現在から30日後
  - Free: 設定不要

### **移行期間の運用**
1. 既存Premium/Standard会員に一斉メール送信
2. 「有効期限システム導入のお知らせ」
3. デフォルトで30日後に設定されることを通知
4. 問い合わせ対応の準備

---

## 🚀 デプロイ手順

```bash
# 1. Airtableフィールド追加
# → ValidUntilフィールドを追加

# 2. コード変更をコミット
git add .
git commit -m "🗓️ 有効期限システム完全実装"
git push origin main

# 3. Netlifyデプロイ完了待ち

# 4. テスト実行
# → 期限切れ自動降格のテスト
# → 退会時の期限設定テスト

# 5. 既存会員へのメール通知
```

---

## 📝 関連ファイル

- `netlify/functions/auth-user.js`: ログイン時の期限チェック
- `netlify/functions/process-withdrawal.js`: 退会時の期限設定
- `src/pages/dashboard.astro`: 有効期限表示
- `src/pages/admin/customer-management.astro`: 管理画面（新規作成）
- `EXPIRY_SYSTEM_SETUP.md`: 本ドキュメント

---

**✅ 実装完了日**: 2025-10-10
**🎯 実装者**: Claude Code（クロ）
**💖 依頼者**: マコさん
