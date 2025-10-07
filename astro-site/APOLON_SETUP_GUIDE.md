# 🐴 Apolonメルマガ配信システム セットアップガイド

**作成日**: 2025-10-07
**対象**: apolon.keibanahibi.com メール配信
**配信先**: 14,000名
**月間配信**: 8回

---

## 📋 システム構成

```
┌─────────────────────────────────────────────────┐
│         Airtable (Team Plan)                    │
│  ├── Apolon_Customers (会員DB)                  │
│  └── Apolon_ScheduledEmails (予約配信)          │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│    Netlify Functions (Pro Plan)                 │
│  ├── send-apolon-newsletter.js                  │
│  ├── schedule-apolon-email.js                   │
│  └── execute-apolon-scheduled-emails.js         │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│      SendGrid (Pro 300K Plan)                   │
│  送信元: apolon@nankankeiba.jp                  │
│  月間上限: 300,000通                            │
└─────────────────────────────────────────────────┘
```

---

## ✅ 実装済みファイル

### **Netlify Functions**
- ✅ `/netlify/functions/send-apolon-newsletter.js` - メール配信
- ✅ `/netlify/functions/schedule-apolon-email.js` - 予約登録
- ✅ `/netlify/functions/execute-apolon-scheduled-emails.js` - 予約実行

### **管理画面**
- ✅ `/src/pages/admin-apolon-newsletter.astro` - 配信管理画面

### **設定ファイル**
- ✅ `/netlify.toml` - Cron設定追加済み

---

## 🔧 セットアップ手順

### **ステップ1: SendGrid設定**

#### **1-A. プラン変更**
```
1. SendGridダッシュボードにログイン
   https://app.sendgrid.com/

2. Settings > Account Details > Plan & Billing

3. 「Upgrade Plan」クリック

4. Pro 300K プラン選択
   - $89.95/月
   - 300,000 emails/month
   - Dedicated IP included

5. 支払い情報確認・アップグレード実行
```

#### **1-B. ドメイン認証（nankankeiba.jp）**
```
1. SendGrid > Settings > Sender Authentication

2. 「Authenticate Your Domain」クリック

3. ドメイン入力: nankankeiba.jp

4. DNS設定値を取得（3つのCNAMEレコード）

5. ドメイン管理画面でDNS設定追加
   CNAMEレコード1: em1234.nankankeiba.jp
   CNAMEレコード2: s1._domainkey.nankankeiba.jp
   CNAMEレコード3: s2._domainkey.nankankeiba.jp

6. SendGridで認証確認（24-48時間以内）
```

#### **1-C. Single Sender認証**
```
1. Settings > Sender Authentication > Single Sender Verification

2. 情報入力:
   From Email: apolon@nankankeiba.jp
   From Name: アポロン競馬
   Reply To: apolon@nankankeiba.jp

3. 認証メールが届く → リンククリックで認証完了
```

---

### **ステップ2: Airtable設定**

#### **2-A. Apolon_Customersテーブル作成**
```
1. Airtable > nankan-analytics Base にアクセス

2. 「+」ボタンで新規テーブル作成

3. テーブル名: Apolon_Customers

4. フィールド追加:
```

| フィールド名 | 型 | 設定 |
|-------------|-----|------|
| Email | Email | Required |
| Name | Single line text | |
| Status | Single select | active / unsubscribed |
| Source | Single select | 配配メール移行 / 新規登録 / 手動追加 |
| CreatedAt | Created time | Auto-set |
| LastSentAt | Date & time | |
| LastOpenedAt | Date & time | |
| UnsubscribedAt | Date & time | |
| Notes | Long text | |

#### **2-B. Apolon_ScheduledEmailsテーブル作成**
```
1. 同じBase内に新規テーブル作成

2. テーブル名: Apolon_ScheduledEmails

3. フィールド追加:
```

| フィールド名 | 型 | 設定 |
|-------------|-----|------|
| Subject | Single line text | Required |
| Content | Long text | Required |
| Recipients | Long text | JSON文字列 |
| ScheduledFor | Date & time | Required |
| Status | Single select | PENDING / EXECUTING / SENT / FAILED |
| JobId | Formula | `RECORD_ID()` |
| CreatedBy | Single line text | |
| CreatedAt | Created time | Auto-set |
| SentAt | Date & time | |
| FailedAt | Date & time | |
| ErrorMessage | Long text | |
| MessageId | Single line text | |
| RetryCount | Number | Default: 0 |

---

### **ステップ3: 配配メールからデータ移行**

#### **3-A. データエクスポート**
```
1. 配配メール管理画面にログイン

2. 読者リスト > エクスポート

3. 以下の項目を含むCSVをダウンロード:
   - メールアドレス（必須）
   - 氏名（あれば）
   - 登録日（あれば）
   - 配信状態（配信中/停止）
```

#### **3-B. Airtableにインポート**
```
1. Airtable > Apolon_Customersテーブル

2. 「+」 > 「Import data」 > 「CSV file」

3. CSVファイル選択

4. フィールドマッピング:
   - Email → Email
   - 氏名 → Name
   - 配信状態 → Status (active / unsubscribed)

5. Source欄は全て「配配メール移行」に設定

6. インポート実行
```

---

### **ステップ4: Netlify環境変数設定**

#### **Netlify管理画面で設定**
```
既存の環境変数（確認のみ）:
- SENDGRID_API_KEY: SendGrid APIキー
- AIRTABLE_API_KEY: Airtable APIキー
- AIRTABLE_BASE_ID: Base ID

新規追加は不要（既存の環境変数を共用）
```

---

### **ステップ5: デプロイ**

#### **GitHubにプッシュ**
```bash
cd /Users/apolon/Library/Mobile\ Documents/com~apple~CloudDocs/WorkSpace/nankan-analytics/astro-site

git add .
git commit -m "🐴 Apolonメルマガ配信システム実装完了

- Netlify Functions追加（send/schedule/execute）
- 管理画面実装（admin-apolon-newsletter.astro）
- Cron設定追加（5分ごと自動実行）
- 完全分離アーキテクチャ（NANKANと独立）"

git push origin main
```

#### **Netlifyデプロイ確認**
```
1. Netlifyダッシュボードで自動デプロイ確認

2. デプロイ完了後、管理画面にアクセス:
   https://nankan-analytics.keiba.link/admin-apolon-newsletter

3. Apolon会員統計が表示されることを確認
```

---

## 🧪 テスト手順

### **テスト1: 自分のメールのみ**

#### **準備**
```
1. Airtable > Apolon_Customersに自分のメールアドレス追加
   Email: your-email@example.com
   Status: active
   Source: 手動追加
```

#### **テスト配信**
```
1. https://nankan-analytics.keiba.link/admin-apolon-newsletter にアクセス

2. 件名入力: 【テスト】Apolonメルマガ配信テスト

3. 本文入力:
   <h1>テスト配信</h1>
   <p>これはApolonメルマガ配信システムのテストです。</p>

4. 「配信開始」クリック

5. 確認事項:
   ✅ From: apolon@nankankeiba.jp で届く
   ✅ Reply-To: apolon@nankankeiba.jp で返信可能
   ✅ HTMLが正しく表示される
```

### **テスト2: 予約配信**

```
1. 「予約配信」チェックボックスON

2. 配信時刻: 5分後に設定

3. 「配信開始」クリック

4. Airtable > Apolon_ScheduledEmails で確認:
   ✅ Status: PENDING
   ✅ ScheduledFor: 指定時刻

5. 5分後にメール届くことを確認

6. Airtable再確認:
   ✅ Status: SENT
   ✅ SentAt: 配信時刻記録
```

### **テスト3: 小規模テスト（50名）**

```
1. Airtable > Apolon_Customersで50名のテストグループ作成
   - テスト用メールアドレス50件追加
   - または既存データから50件抽出

2. 管理画面から本番同様の配信実行

3. 確認事項:
   ✅ 50通すべて配信成功
   ✅ SendGridダッシュボードで配信ログ確認
   ✅ エラーがないこと
```

---

## 📊 本番運用開始

### **完全移行フロー**

#### **移行日前日**
```
1. 配配メールから最新の読者リストをエクスポート

2. Airtableに全14,000件インポート

3. Email重複チェック実行

4. Status = active の件数確認（14,000件前後）
```

#### **移行日当日**
```
1. 小規模テスト（100名程度）で最終確認

2. 本番配信実行:
   - 件名: 実際の配信内容
   - 本文: HTML本文
   - 配信対象: 14,000名（Status = active）

3. SendGridダッシュボードで配信状況監視:
   - Delivered: 配信成功数
   - Bounced: バウンス数
   - Opened: 開封率

4. エラー発生時:
   - エラーメールアドレスをCSVエクスポート
   - Airtableで Status = unsubscribed に更新
```

#### **配配メール契約終了**
```
1. SendGrid配信が安定稼働確認（1週間程度）

2. 配配メール契約解約手続き

3. 解約前に最終データエクスポート（バックアップ）

4. 解約完了
```

---

## 💰 コスト比較

### **移行前（配配メール）**
```
推定費用: ¥20,000 - ¥30,000/月
年間費用: ¥240,000 - ¥360,000
```

### **移行後（SendGrid）**
```
SendGrid Pro 300K: $89.95/月（¥13,493/月）
年間費用: ¥161,916

年間削減額: ¥78,084 - ¥198,084
```

---

## 🔧 トラブルシューティング

### **問題: 配信が届かない**
```
原因:
- SendGridドメイン認証未完了
- Single Sender認証未完了
- Airtable Status が unsubscribed

対策:
1. SendGrid認証状況確認
2. Airtable Status確認
3. SendGrid Activity Feed確認
```

### **問題: 予約配信が実行されない**
```
原因:
- Netlify Functions Cron設定ミス
- Airtable Status が PENDING のまま

対策:
1. netlify.toml のCron設定確認
2. Netlifyダッシュボードで Functions ログ確認
3. Airtable ScheduledFor 時刻確認（過去の時刻か？）
```

### **問題: NANKAN会員にApolon配信が届く**
```
原因:
- テーブル名間違い
- Function呼び出しURL間違い

対策:
1. 管理画面URL確認:
   - NANKAN: /admin-newsletter-simple
   - Apolon: /admin-apolon-newsletter

2. Function URL確認:
   - NANKAN: /.netlify/functions/send-newsletter
   - Apolon: /.netlify/functions/send-apolon-newsletter
```

---

## 📞 サポート連絡先

**SendGrid**: https://support.sendgrid.com/
**Airtable**: https://support.airtable.com/
**Netlify**: https://www.netlify.com/support/

---

## ✅ チェックリスト

### **事前準備**
- [ ] SendGrid Pro 300Kプランアップグレード完了
- [ ] nankankeiba.jp ドメイン認証完了
- [ ] apolon@nankankeiba.jp Single Sender認証完了
- [ ] Airtable Apolon_Customersテーブル作成完了
- [ ] Airtable Apolon_ScheduledEmailsテーブル作成完了

### **実装**
- [x] Netlify Functions実装完了
- [x] 管理画面実装完了
- [x] netlify.toml Cron設定完了

### **テスト**
- [ ] 自分のメールのみテスト配信成功
- [ ] 予約配信テスト成功
- [ ] 小規模50名テスト配信成功

### **本番移行**
- [ ] 配配メールから14,000件データ移行完了
- [ ] 本番配信テスト（100名）成功
- [ ] 全14,000名への本番配信成功
- [ ] 配配メール契約終了完了

---

**🎉 セットアップ完了後、年間約8-20万円のコスト削減達成！**
