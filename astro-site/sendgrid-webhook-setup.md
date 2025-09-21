# SendGrid Webhook設定ガイド

## 📋 **設定概要**
SendGridからリアルタイムでバウンス・配信失敗通知を受け取るためのWebhook設定手順です。

## 🔗 **Webhook URL**
```
https://nankan-analytics.netlify.app/.netlify/functions/sendgrid-webhook
```

## ⚙️ **SendGrid設定手順**

### 1. SendGridダッシュボードにログイン
https://app.sendgrid.com/

### 2. Settings → Mail Settings → Event Webhook
左側メニューの「Settings」→「Mail Settings」→「Event Webhook」を選択

### 3. Event Webhook設定
- **Status**: ON（有効化）
- **HTTP Post URL**: `https://nankan-analytics.netlify.app/.netlify/functions/sendgrid-webhook`
- **HTTP Method**: POST

### 4. 監視するイベント選択
以下のイベントにチェックを入れる：

#### **🚨 必須イベント（ドメイン保護用）**
- ✅ **Bounced** - バウンス（Hard/Soft）
- ✅ **Blocked** - ブロック
- ✅ **Dropped** - ドロップ
- ✅ **Spam Report** - スパム報告
- ✅ **Unsubscribe** - 配信停止

#### **📊 オプション（統計用）**
- □ Delivered - 配信成功
- □ Opened - 開封
- □ Clicked - クリック

### 5. Test Your Integration
「Test Your Integration」ボタンでテスト送信を実行

## 🛡️ **セキュリティ設定（推奨）**

### Webhook Signature Verification
SendGridの署名検証を有効化する場合：

1. **Verification Key**を生成
2. Webhook URLに署名検証ロジックを追加
3. `req.headers['x-twilio-email-event-webhook-signature']`で検証

## 📊 **期待される動作**

### バウンス発生時
1. **SendGrid**: メール配信失敗を検知
2. **Webhook**: リアルタイムで通知送信
3. **システム**: 自動的にAirtableのEmailBlacklistに記録
4. **保護**: 次回送信時に自動的にフィルタリング

### Hard Bounce即座ブロック
```
Hard Bounce検知 → 即座にHARD_BOUNCEステータス → 永続ブロック
```

### Soft Bounce累積管理
```
Soft Bounce → BounceCount +1 → 5回到達 → HARD_BOUNCEに昇格
```

## 🔍 **動作確認方法**

### 1. 無効メールアドレステスト
```bash
# 管理画面からテストメール送信
# 対象: invalid@nonexistentdomain.invalid
```

### 2. Netlify Function Logsで確認
```
Netlify Dashboard → Functions → sendgrid-webhook → View function logs
```

### 3. AirtableのEmailBlacklistテーブル確認
新しいレコードが自動作成されることを確認

## ⚠️ **注意事項**

### 開発環境制限
- Webhookは本番URL（https://nankan-analytics.netlify.app）でのみ動作
- ローカル開発（localhost）では受信不可

### 処理タイミング
- **即座**: 明らかな形式エラー（API応答400）
- **遅延**: 実際の配信失敗（Webhook経由・数分～数時間後）

### データ重複防止
- 既存レコードは更新（BounceCount +1）
- 新規の場合のみレコード作成

## 🚀 **設定完了後の効果**

### 完全なドメイン保護
1. **API即座検知**: 形式エラー等
2. **Webhook遅延検知**: 実際の配信失敗
3. **自動ブロック**: 5回失敗で永続ブロック
4. **統計管理**: 詳細なバウンス分析

### 運用の自動化
- 手動でのブラックリスト管理不要
- リアルタイム保護
- 詳細なログ・統計情報

## 💡 **トラブルシューティング**

### Webhookが届かない場合
1. SendGrid Event Webhookが有効になっているか確認
2. URL形式が正確か確認
3. Netlify Function Logsでエラー確認

### バウンス検知されない場合
1. 対象メールアドレスが実際に無効か確認
2. SendGrid Activity Feedで配信状況確認
3. Webhook設定のイベント選択確認

---

## ✅ **設定チェックリスト**

- [ ] SendGrid Event Webhook有効化
- [ ] Webhook URL設定
- [ ] 必須イベント（Bounced, Blocked, Dropped, Spam Report, Unsubscribe）選択
- [ ] Test Your Integration実行
- [ ] テストメール送信でバウンス確認
- [ ] AirtableのEmailBlacklistレコード作成確認
- [ ] Netlify Function Logs確認

**設定完了後、リアルタイムドメイン保護システムが稼働開始します！** 🛡️✨