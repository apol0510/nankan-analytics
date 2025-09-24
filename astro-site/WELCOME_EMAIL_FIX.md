# 🔧 ウェルカムメール修正ガイド

## 🚨 問題の詳細

### 不正なドメインエラー
- **問題のURL**: `8912keibalink.keiba.link`
- **エラー**: DNS解決エラー (ERR_NAME_NOT_RESOLVED)
- **原因**: 存在しないサブドメインが使用されている

### 影響範囲
- 無料会員登録後のウェルカムメール
- ユーザーがログインリンクをクリックできない

---

## 📋 修正手順

### Step 1: Zapierの問題メール配信を無効化

1. **Zapierにログイン**
   - [zapier.com](https://zapier.com)にアクセス

2. **問題のあるZapを見つける**
   - 「8912keibalink」が含まれるZapを検索
   - または無料登録関連のZapを確認

3. **一時停止**
   - 該当Zapの「ON/OFF」スイッチをOFFに切り替え
   - これで問題のあるメールが送信されなくなります

### Step 2: 正しいウェルカムメール設定

#### 正しいドメイン設定
```yaml
正しいURL: https://nankan-analytics.keiba.link/dashboard
間違ったURL: https://8912keibalink.keiba.link/... (削除必要)
```

#### 修正版ウェルカムメール内容
```html
件名: 🎉 NANKANアナリティクス無料登録完了！

本文:
{{Customer Name}}様

この度はNANKANアナリティクスにご登録いただき、
誠にありがとうございます！

📊 無料会員特典
✨ メインレース（11R）の詳細予想
🤖 AI分析による予想データ
🎯 基本的な競馬情報
🎁 毎日ログインでポイント獲得

🔗 マイページにログイン
https://nankan-analytics.keiba.link/dashboard

📱 今すぐご利用いただけます
- メールアドレス: {{Customer Email}}
- 登録日: {{Registration Date}}

ご不明な点がございましたら、お気軽にお問い合わせください。

NANKANアナリティクス
support@nankan-analytics.keiba.link
```

### Step 3: Zapier設定修正

#### 無料登録用Zap設定
```yaml
Trigger:
  - フォーム送信（無料登録）
  - またはAirtable新規レコード作成

Action 1: Airtable
  - テーブル: 顧客管理
  - Email: {{フォームEmail}}
  - プラン: free
  - 登録日: {{Today}}
  - ポイント: 1

Action 2: SendGrid
  - To: {{フォームEmail}}
  - From: nankan-analytics@keiba.link
  - From Name: NANKANアナリティクス
  - Subject: 🎉 NANKANアナリティクス無料登録完了！
  - HTML: [上記の修正版メール内容]
```

---

## 🔧 緊急対応手順

### 即座に実施すべき修正

1. **Zapier無効化**
   - 問題のあるZapを即座に停止
   - エラーメール送信の停止

2. **既存ユーザーへの対応**
   - 正しいログインURLを手動送信（必要に応じて）
   - カスタマーサポート対応準備

3. **新規登録フロー確認**
   - 登録フォーム → Zapier → メール送信の全フローをテスト
   - 正しいドメインでのリンク動作確認

### テスト手順

1. **テスト登録**
   ```
   - テスト用メールアドレスで無料登録
   - ウェルカムメール受信確認
   - リンククリックで正常アクセス確認
   ```

2. **ドメイン確認**
   ```bash
   # コマンドでDNS確認
   nslookup nankan-analytics.keiba.link
   # 正常に解決されることを確認

   nslookup 8912keibalink.keiba.link
   # エラーが出ることを確認
   ```

---

## 💡 予防策

### 今後の設定時の注意点

1. **ドメイン統一**
   - 常に `nankan-analytics.keiba.link` を使用
   - サブドメインは作成しない

2. **テスト必須**
   - 新しいメール設定は必ずテスト送信
   - リンクの動作確認を必須とする

3. **設定文書化**
   - 正しいURL・設定を明文化
   - チェックリスト作成

---

## 📞 復旧完了の確認方法

### 確認項目
- [ ] 問題のあるZap停止完了
- [ ] 新しいウェルカムメール設定完了
- [ ] テスト登録でメール受信確認
- [ ] リンクをクリックして正常アクセス確認
- [ ] 既存ユーザーへのフォローアップ完了

### 動作確認用テストアドレス
```
test-free@example.com
test-welcome@example.com
```

---

**最終更新**: 2025-09-24
**緊急度**: 高（即座対応必要）
**影響**: 新規ユーザーのログイン不可