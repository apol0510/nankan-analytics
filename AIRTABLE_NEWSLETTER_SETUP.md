# Airtableテーブル設定ガイド - Queue方式メルマガ配信システム

## 🎯 概要
PayPal Webhook Phase 7の冪等性設計を応用した、重複配信が構造的に起きないメルマガ配信システム

---

## 📋 テーブル1: NewsletterJobs（配信ジョブ）

### **作成手順**
1. Airtable → NANKANアナリティクス Base
2. 「Add a table」→ テーブル名: `NewsletterJobs`
3. 以下のフィールドを作成：

### **フィールド一覧**

| フィールド名 | 型 | 設定 | 説明 |
|------------|-----|------|------|
| JobId | Single line text | Primary Field | 主キー（例: JOB-2026-01-11-001） |
| Subject | Single line text | Required | 件名 |
| Content | Long text | Required | 本文HTML |
| TemplateId | Single line text | Optional | テンプレートID |
| TargetPlan | Single line text | Optional | 対象プラン（ALL/Standard/Premium等） |
| Status | Single select | Required | draft / queued / sending / completed / paused / failed |
| TotalRecipients | Number | Required | 総配信数（スナップショット） |
| SentSuccess | Number | Required, Default: 0 | 送信成功数 |
| SentFailed | Number | Required, Default: 0 | 送信失敗数 |
| CreatedAt | Date | Required | 作成日時（ISO 8601形式） |
| QueuedAt | Date | Optional | Queue生成完了日時 |
| CompletedAt | Date | Optional | 配信完了日時 |

### **フィールド詳細設定**

#### **JobId（Primary Field）**
- Type: Single line text
- 形式: `JOB-YYYY-MM-DD-NNN`
- 例: `JOB-2026-01-11-001`

#### **Status（Single select）**
選択肢を以下の順序で追加：
1. `draft`（下書き）- 色: グレー
2. `queued`（Queue生成完了）- 色: 青
3. `sending`（送信中）- 色: オレンジ
4. `completed`（完了）- 色: 緑
5. `paused`（一時停止）- 色: 黄色
6. `failed`（失敗）- 色: 赤

#### **TotalRecipients / SentSuccess / SentFailed（Number）**
- Number format: Integer
- Precision: 0
- Default value: 0（SentSuccess, SentFailedのみ）

#### **CreatedAt / QueuedAt / CompletedAt（Date）**
- Date format: ISO（YYYY-MM-DDTHH:mm:ss.sssZ）
- Time zone: JST (UTC+9)
- Include time: Yes

---

## 📋 テーブル2: NewsletterQueue（受信者キュー）

### **作成手順**
1. Airtable → NANKANアナリティクス Base
2. 「Add a table」→ テーブル名: `NewsletterQueue`
3. 以下のフィールドを作成：

### **フィールド一覧**

| フィールド名 | 型 | 設定 | 説明 |
|------------|-----|------|------|
| Key | Formula | Primary Field | **主キー**: `{JobId} & ":" & LOWER({Email})` |
| JobId | Link to another record | Required | NewsletterJobsへのリンク |
| Email | Email | Required | 送信先メールアドレス |
| Status | Single select | Required | pending / sending / success / failed / skipped |
| LastError | Long text | Optional | エラー内容（失敗時のみ） |
| SentAt | Date | Optional | 送信日時 |
| RetryCount | Number | Required, Default: 0 | リトライ回数 |

### **フィールド詳細設定**

#### **Key（Formula - 最重要！）**
- Type: Formula
- Formula: `{JobId} & ":" & LOWER({Email})`
- 例: `JOB-2026-01-11-001:customer@example.com`
- **⚠️ 重要**: このフィールドがPrimary Fieldになります
- **冪等性保証の核**: 同じKeyは二重作成できない

**設定手順:**
1. フィールド名: `Key`
2. Type: `Formula`
3. Formula入力欄に以下をコピー:
   ```
   {JobId} & ":" & LOWER({Email})
   ```
4. 「Make this field the primary field」にチェック

#### **JobId（Link to another record）**
- Link to: `NewsletterJobs`
- Allow linking to multiple records: No
- Linked record display field: JobId

#### **Email（Email）**
- Type: Email
- Required: Yes

#### **Status（Single select）**
選択肢を以下の順序で追加：
1. `pending`（送信待ち）- 色: 青
2. `sending`（送信中）- 色: オレンジ
3. `success`（送信成功）- 色: 緑
4. `failed`（送信失敗）- 色: 赤
5. `skipped`（スキップ）- 色: グレー

#### **RetryCount（Number）**
- Number format: Integer
- Precision: 0
- Default value: 0

#### **SentAt（Date）**
- Date format: ISO（YYYY-MM-DDTHH:mm:ss.sssZ）
- Time zone: JST (UTC+9)
- Include time: Yes

---

## 📊 テーブル関係図

```
NewsletterJobs (1)
  ↓ Link
NewsletterQueue (Many)

例:
JOB-2026-01-11-001
  ├─ JOB-2026-01-11-001:customer1@example.com (Status: success)
  ├─ JOB-2026-01-11-001:customer2@example.com (Status: pending)
  └─ JOB-2026-01-11-001:customer3@example.com (Status: failed)
```

---

## 🔍 View設定（推奨）

### **NewsletterJobs - 配信一覧View**
- Filter: Status is not "completed"
- Sort: CreatedAt (descending)
- Group: Status

### **NewsletterQueue - 送信待ちView**
- Filter: Status is "pending"
- Sort: JobId (ascending)

### **NewsletterQueue - 失敗View**
- Filter: Status is "failed"
- Sort: RetryCount (descending)

---

## ✅ 作成確認チェックリスト

### **NewsletterJobs**
- [ ] JobId（Primary Field）
- [ ] Subject
- [ ] Content
- [ ] Status（6つの選択肢）
- [ ] TotalRecipients（デフォルト0）
- [ ] SentSuccess（デフォルト0）
- [ ] SentFailed（デフォルト0）
- [ ] CreatedAt

### **NewsletterQueue**
- [ ] Key（Formula・Primary Field）← **最重要！**
- [ ] JobId（Link to NewsletterJobs）
- [ ] Email
- [ ] Status（5つの選択肢）
- [ ] RetryCount（デフォルト0）
- [ ] SentAt

---

## 🚀 次のステップ

テーブル作成完了後、クロちゃんに以下を報告してください：

「Airtableテーブル作成完了しました」

→ クロちゃんがNetlify Functionsの実装を開始します

---

## 📝 注意事項

1. **Keyフィールドは必ずFormulaで作成**
   - 手動入力ではなく、自動生成される設定にする
   - これが冪等性保証の核です

2. **StatusのDefault値は設定しない**
   - コード側で明示的に設定します

3. **テーブル名は大文字小文字を正確に**
   - `NewsletterJobs`（Jは大文字）
   - `NewsletterQueue`（Qは大文字）

4. **Linkフィールドは必ず双方向**
   - Airtableが自動で逆方向のLinkを作成します

---

**作成日**: 2026-01-11
**設計者**: マコ&クロ 最強コンビ 💖
**設計原則**: PayPal Webhook Phase 7の冪等性設計応用
