# 🚨 退会システム完全実装ガイド

## 📋 実装日: 2025-10-10

## 🎯 解決した問題

### ❌ 旧システムの問題点
1. **退会申請が管理者・会員に通知されない**
   - contactフォーム経由で送信されるが、通常のお問い合わせと区別されない
   - Airtableと連携していないため、顧客データが更新されない

2. **Airtable連携なし**
   - 退会申請の記録が残らない
   - 手動で退会処理を行う必要がある
   - 退会理由の分析ができない

3. **フロー不透明**
   - 退会申請後の処理フローが不明確
   - 会員が退会完了を確認できない

---

## ✅ 新システムの特徴

### 1. **退会専用Netlify Function実装**
- **ファイル**: `netlify/functions/process-withdrawal.js`
- **機能**:
  - Airtableから顧客情報を検索
  - 退会フラグ・退会日・退会理由を記録
  - 管理者向け退会通知メール送信
  - 会員向け退会受付確認メール送信

### 2. **Airtable完全連携**
- 退会申請時に自動でAirtableレコードを更新
- 退会理由の蓄積・分析が可能
- 退会日時の正確な記録

### 3. **二重通知システム**
- **管理者向け**: 退会申請通知・対応必要事項リスト
- **会員向け**: 退会受付確認・今後の流れの説明

---

## 🔧 Airtable設定手順

### 必須フィールド追加（Customersテーブル）

Airtableの`Customers`テーブルに以下のフィールドを追加してください：

| フィールド名 | タイプ | 説明 |
|------------|------|------|
| `WithdrawalRequested` | Checkbox | 退会申請フラグ |
| `WithdrawalDate` | Date | 退会申請日時 |
| `WithdrawalReason` | Long text | 退会理由 |

### 設定手順

1. **Airtableにログイン**
   - https://airtable.com/

2. **Customersテーブルを開く**
   - NANKANアナリティクスのBase
   - Customersテーブルを選択

3. **フィールド追加**
   - 右上の「+」ボタンをクリック
   - 各フィールドを以下の設定で追加:

#### WithdrawalRequested
- **Field type**: Checkbox
- **Field name**: WithdrawalRequested
- **Description**: 退会申請があった場合にチェック

#### WithdrawalDate
- **Field type**: Date
- **Field name**: WithdrawalDate
- **Description**: 退会申請日時
- **Include a time field**: Yes（推奨）
- **Date format**: ISO (2025-10-10)
- **Time format**: 24 hour (14:30)

#### WithdrawalReason
- **Field type**: Long text
- **Field name**: WithdrawalReason
- **Description**: 退会理由（ユーザーが入力）
- **Enable rich text formatting**: No

---

## 📧 メール通知の内容

### 管理者向けメール

**件名**: `【退会申請】{email} - {プラン名}`

**内容**:
- 受信日時
- メールアドレス
- 現在のプラン
- 登録日
- 退会理由（ユーザー入力）
- 対応必要事項リスト:
  - Airtableで退会処理完了
  - Stripe定期支払い停止確認
  - 顧客フォローアップ（必要に応じて）

### 会員向けメール

**件名**: `【退会申請受付】NANKANアナリティクス`

**内容**:
- 退会申請受付確認
- 受付日時・メールアドレス・プラン
- 退会理由（確認）
- 今後の流れ:
  - 2営業日以内に退会処理完了連絡
  - Stripe定期支払い停止
  - プレミアムコンテンツアクセス停止

---

## 🔄 退会フロー（新システム）

```
1. ダッシュボード → 退会ボタンクリック
   ↓
2. withdrawal-upsell（アップセルページ）
   ↓
3. 「退会手続きに進む」クリック
   ↓
4. 退会理由入力モーダル表示
   ↓
5. 「退会する」ボタンクリック
   ↓
6. process-withdrawal.js 実行
   ├─ Airtableから顧客情報検索
   ├─ 退会フラグ・日時・理由を記録
   ├─ 管理者向け通知メール送信
   └─ 会員向け確認メール送信
   ↓
7. 成功メッセージ表示 → トップページにリダイレクト
```

---

## 🧪 テスト手順

### 1. ローカル環境でテスト

```bash
# 開発サーバー起動
npm run dev

# ブラウザで http://localhost:4321/dashboard にアクセス
# 退会ボタンをクリック
# withdrawal-upsellページで退会手続きをテスト
```

### 2. 確認項目

- [ ] 退会理由入力モーダルが表示される
- [ ] 退会理由を入力して「退会する」をクリック
- [ ] 「処理中...」表示が出る
- [ ] 成功メッセージが表示される
- [ ] 管理者宛にメールが届く（nankan.analytics@gmail.com）
- [ ] テストユーザー宛にメールが届く
- [ ] Airtableで該当レコードが更新される:
  - WithdrawalRequested: チェック
  - WithdrawalDate: 現在日時
  - WithdrawalReason: 入力した理由

### 3. エラーハンドリング確認

- [ ] メールアドレスが取得できない場合のエラー表示
- [ ] Airtableに該当顧客がない場合のエラー表示
- [ ] ネットワークエラー時のエラー表示

---

## 🚀 デプロイ手順

```bash
# 変更ファイルを確認
git status

# ファイルをステージング
git add netlify/functions/process-withdrawal.js
git add src/pages/withdrawal-upsell.astro
git add WITHDRAWAL_SYSTEM_SETUP.md

# コミット
git commit -m "🚨 退会システム完全実装・Airtable連携・二重通知システム"

# プッシュ
git push origin main
```

**Netlifyで自動デプロイ完了後**:
1. Airtableフィールドを追加（上記手順参照）
2. 本番環境でテスト実行
3. メール受信確認
4. Airtableレコード更新確認

---

## 🛡️ 復活防止対策

### ❌ 絶対に復活させてはいけない要素

1. **contactフォーム経由の退会申請**
   - 退会は専用API（process-withdrawal.js）を使用
   - contactフォームは通常のお問い合わせ専用

2. **Airtable連携なしの退会処理**
   - 必ずAirtableレコードを更新
   - 退会フラグ・日時・理由を記録

3. **通知メールなしの退会処理**
   - 管理者と会員の両方に必ず通知
   - SendGrid追跡機能は無効化（復活防止対策済み）

---

## 📊 今後の改善提案

### オプション機能（将来実装可能）

1. **退会完了処理の自動化**
   - 管理画面から退会完了ボタン
   - Stripe定期支払い自動停止連携
   - プラン自動変更（Premium → Free）

2. **退会理由の分析ダッシュボード**
   - Airtableで退会理由を集計
   - 改善施策の優先順位付け

3. **リマインダーメール**
   - 退会申請から48時間後に処理確認
   - 未処理の場合は管理者にアラート

---

## 📝 関連ファイル

- `netlify/functions/process-withdrawal.js`: 退会処理API
- `src/pages/withdrawal-upsell.astro`: 退会アップセルページ
- `src/pages/dashboard.astro`: ダッシュボード（退会ボタン）
- `WITHDRAWAL_SYSTEM_SETUP.md`: 本ドキュメント

---

**✅ 実装完了日**: 2025-10-10
**🎯 実装者**: Claude Code（クロ）
**💖 依頼者**: マコさん
