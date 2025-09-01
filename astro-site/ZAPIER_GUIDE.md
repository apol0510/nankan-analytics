# ⚡ Zapier完全自動化ガイド

## Zapierで実現する完全自動化

**これまでの苦労:**
- 😰 Webhook署名検証でエラー
- 😰 非同期処理のタイムアウト
- 😰 データベース接続エラー
- 😰 環境変数の設定ミス

**Zapierなら:**
- 😊 ビジュアルエディタで設定
- 😊 エラーは自動リトライ
- 😊 ログが見やすい
- 😊 テストが簡単

---

## 📝 事前準備

### 必要なアカウント
1. **Zapier** (無料プランでOK、後で有料推奨)
2. **Stripe** (Payment Links設定済み)
3. **Airtable** (無料プランでスタート)
4. **Brevo** (無料で月300通)

### API Key準備
```yaml
Stripe:
  場所: ダッシュボード → 開発者 → APIキー
  必要: Restricted keyを作成（読み取りのみ）

Airtable:
  場所: Account → API → Personal access tokens
  スコープ: data.records:write

Brevo:
  場所: Settings → API Keys
  権限: Send campaigns
```

---

## 🎯 Zap 1: 決済完了 → 顧客登録

### Step 1: Trigger設定（Stripe）

#### アプリ選択
```
App: Stripe
Event: New Payment Intent Succeeded
```

#### アカウント接続
1. 「Connect Account」
2. APIキー入力（Restricted key推奨）
3. テスト接続

#### フィルター設定（重要！）
```javascript
// Only Continue If...
Metadata Plan Type | (Text) Exists
Payment Status | (Text) Exactly matches: succeeded
Amount | (Number) Greater than: 0
```

### Step 2: Airtableで顧客検索

#### アプリ選択
```
App: Airtable
Event: Find Record
```

#### 設定
```yaml
Base: NANKANアナリティクス
Table: 顧客管理
Search Formula: {Email} = "{{Stripe Customer Email}}"
```

### Step 3: 条件分岐（Paths）

#### Path A: 新規顧客
**条件:** Airtable Record が存在しない

**Action: Create Record**
```yaml
Base: NANKANアナリティクス
Table: 顧客管理

フィールド:
  Email: {{Stripe Customer Email}}
  顧客ID: {{Stripe Customer ID}}
  名前: {{Stripe Customer Name}}
  プラン: {{Stripe Metadata Plan Type}}
  開始日: {{Stripe Created Date}}
  有効期限: {{Stripe Current Period End}}
  ステータス: アクティブ
  支払い金額: {{Stripe Amount}} / 100
  通貨: JPY
```

#### Path B: 既存顧客
**条件:** Airtable Record が存在する

**Action: Update Record**
```yaml
Record: {{Airtable Record ID}}

更新フィールド:
  プラン: {{Stripe Metadata Plan Type}}
  更新日: {{Stripe Created Date}}
  有効期限: {{Stripe Current Period End}}
  ステータス: アクティブ
  最終支払い額: {{Stripe Amount}} / 100
```

### Step 4: ウェルカムメール送信

#### アプリ選択
```
App: Brevo (Sendinblue)
Event: Send Email
```

#### テンプレート設定
```yaml
To: {{Stripe Customer Email}}
From Name: NANKANアナリティクス
From Email: support@nankan-analytics.keiba.link
Subject: 【NANKANアナリティクス】{{Plan Type}}会員登録完了のお知らせ

本文（HTML）:
```
```html
<h2>{{Customer Name}}様</h2>

<p>この度は、NANKANアナリティクス {{Plan Type}}会員にご登録いただき、
誠にありがとうございます。</p>

<h3>📊 ご利用可能なコンテンツ</h3>
<ul>
  {{#if plan_type == "premium"}}
    <li>全レース予想データ</li>
    <li>AI詳細分析レポート</li>
    <li>過去データアーカイブ</li>
  {{else if plan_type == "standard"}}
    <li>後半3レース予想データ</li>
    <li>基礎分析レポート</li>
  {{/if}}
</ul>

<h3>🔗 アクセス方法</h3>
<p>
  <a href="https://nankan-analytics.keiba.link/?token={{Generated Token}}" 
     style="background: #3b82f6; color: white; padding: 10px 20px; 
            text-decoration: none; border-radius: 5px;">
    会員ページへログイン
  </a>
</p>

<h3>📅 次回請求日</h3>
<p>{{Current Period End}}</p>

<hr>
<p style="font-size: 12px; color: #666;">
  プラン変更・解約はカスタマーポータルから：<br>
  <a href="{{Customer Portal URL}}">カスタマーポータル</a>
</p>
```

### Step 5: アクセストークン生成

#### Code by Zapier
```javascript
// トークン生成
const crypto = require('crypto');
const email = inputData.email;
const plan = inputData.plan;
const expiry = inputData.expiry;

// シンプルなトークン生成
const token = crypto
  .createHash('sha256')
  .update(email + plan + expiry)
  .digest('hex')
  .substring(0, 32);

// Base64エンコード
const accessToken = Buffer.from(JSON.stringify({
  email: email,
  plan: plan,
  expiry: expiry,
  token: token
})).toString('base64');

output = {accessToken: accessToken};
```

---

## 🔄 Zap 2: サブスクリプション更新

### Trigger: Stripe
```
Event: Invoice Payment Succeeded
```

### Action: Airtable Update
```yaml
検索: Email = {{Customer Email}}
更新:
  有効期限: {{Current Period End}}
  更新回数: {{Previous Value}} + 1
  最終更新: {{Today}}
```

---

## ❌ Zap 3: 解約処理

### Trigger: Stripe
```
Event: Customer Subscription Deleted
```

### Action 1: Airtable Update
```yaml
検索: 顧客ID = {{Customer ID}}
更新:
  ステータス: 解約
  解約日: {{Today}}
  プラン: 無料
```

### Action 2: 解約メール
```yaml
件名: 【重要】解約手続き完了のお知らせ
本文: 解約理由アンケートリンク付き
```

---

## 📊 Zap 4: Airtable → Brevo リスト同期

### Trigger: Airtable
```
Event: New or Updated Record
Table: 顧客管理
```

### Filter
```
プラン | Changed
```

### Action: Brevo Update Contact
```yaml
Email: {{Email}}
リスト:
  - Remove from: 全リスト
  - Add to: {{プラン}}会員リスト
属性:
  PLAN: {{プラン}}
  EXPIRY: {{有効期限}}
```

---

## 🧪 テスト手順

### 1. 個別ステップテスト
各アクションで「Test」ボタンをクリック

### 2. エンドツーエンドテスト
1. Stripe Payment Linkでテスト決済
2. Zapier Historyで実行確認
3. Airtableでデータ確認
4. メール受信確認

### 3. エラーハンドリングテスト
- 無効なメールアドレス
- Airtable接続エラー
- メール送信失敗

---

## 📈 高度な自動化

### 売上レポート自動生成
```yaml
Schedule: 毎月1日 9:00
Action:
  1. Airtableから当月データ取得
  2. 集計処理
  3. Googleスプレッドシート更新
  4. Slackに通知
```

### チャーン予測アラート
```yaml
Trigger: 有効期限3日前
Action:
  1. 更新促進メール送信
  2. 限定クーポン発行
  3. 管理者に通知
```

### A/Bテスト自動化
```yaml
新規登録を2グループに分割:
  A: 通常ウェルカムメール
  B: 特典付きウェルカムメール
30日後にコンバージョン率比較
```

---

## 💰 料金とプラン選択

### Zapier料金プラン
```yaml
Free:
  - 100タスク/月
  - 5 Zaps
  - 15分間隔

Starter ($19.99/月):
  - 750タスク/月
  - 20 Zaps
  - 15分間隔

Professional ($49/月):
  - 2,000タスク/月
  - 無制限 Zaps
  - 2分間隔
  - Premium Apps

推奨: Starterプランで開始
```

### コスト計算例
```
月間新規登録: 50人
更新処理: 100人
解約: 10人
合計タスク: 160 × 4ステップ = 640タスク
→ Starterプランで十分
```

---

## ⚠️ トラブルシューティング

### Zapが動かない
1. Trigger接続を再認証
2. フィルター条件を確認
3. History でエラーログ確認

### Airtableエラー
- API制限（5リクエスト/秒）
- レコード数上限（Free: 1,200）
- 解決：Delay追加 or 有料プラン

### メールが届かない
- SPF/DKIM設定確認
- Brevoの送信者認証
- 迷惑メールフォルダ確認

### タイムアウト
- Code stepを分割
- Webhookの代わりにPolling使用

---

## 🎯 ベストプラクティス

### 1. エラー通知設定
```yaml
Zapier Manager:
  - Zap エラー時にメール通知
  - 月次レポート送信
```

### 2. バックアップZap
重要な処理は複製して予備を作成

### 3. ログ保存
```yaml
全処理をGoogleスプレッドシートに記録:
  - タイムスタンプ
  - 顧客情報
  - 処理結果
```

### 4. 定期メンテナンス
- 月1回: Historyチェック
- 四半期: 不要Zap削除
- 年1回: API Key更新

---

## 🚀 次のステップ

1. **基本Zap作成**（今日）
2. **テスト実行**（明日）
3. **本番稼働**（3日後）
4. **追加自動化**（1週間後）

---

## 📞 サポート

### Zapier Help
- Help Center: help.zapier.com
- Community: community.zapier.com
- 日本語対応: なし（英語のみ）

### よくある質問
- Q: 無料プランの制限は？
- A: 月100タスク、単純な2ステップZapなら50回実行可能

- Q: 複数アカウント連携は？
- A: 可能。Multi-Step Zapで最大100ステップ

---

**Zapierなら、コード不要で完全自動化が実現！もう深夜のエラー対応は不要です！** 🎉