# Brevo メール配信設定ガイド

## 迷惑メールフォルダ回避のための設定

### 1. Brevoダッシュボードでの設定

#### A. ドメイン認証（最重要）
1. Brevoログイン → Settings → Senders & Domains
2. 「Add a domain」で`keiba.link`を追加
3. 提供されたDNSレコードを設定

#### B. 送信者アドレスの登録
Settings → Senders & Domainsで以下を追加：
- noreply@keiba.link（メイン送信用）
- info@keiba.link（情報配信用）
- support@keiba.link（サポート用）

### 2. DNS設定（Netlify DNSまたはドメインレジストラ）

```dns
# SPFレコード（TXT）
keiba.link IN TXT "v=spf1 include:sendinblue.com ~all"

# DKIMレコード（TXT） - Brevoから提供される値
mail._domainkey.keiba.link IN TXT "k=rsa; p=[Brevoから提供される公開鍵]"

# DMARCレコード（TXT）
_dmarc.keiba.link IN TXT "v=DMARC1; p=none; rua=mailto:admin@keiba.link"
```

### 3. メールコンテンツの最適化

#### 避けるべきこと：
- 全て大文字の件名
- 過度な「!」や絵文字
- 「無料」「今すぐ」などのスパムトリガー単語
- HTMLのみでテキスト版がない

#### 推奨事項：
- 明確で簡潔な件名
- HTMLとテキスト両方のバージョンを用意
- 適切な画像とテキストのバランス
- 配信停止リンクの明記

### 4. 送信レピュテーション向上

1. **ウォームアップ期間**
   - 最初は少量から送信開始
   - 徐々に送信量を増やす

2. **エンゲージメント向上**
   - 開封率の高いユーザーから送信
   - 定期的にリストをクリーンアップ

3. **モニタリング**
   - Brevoダッシュボードで配信統計を確認
   - バウンス率を5%以下に維持

### 5. テスト方法

```javascript
// 送信前チェックリスト
const checkList = {
  domain_auth: "SPF/DKIM/DMARC設定済み",
  sender_verified: "送信者アドレス認証済み", 
  content_balanced: "HTML/テキスト両対応",
  unsubscribe_link: "配信停止リンクあり",
  spam_score: "スパムスコアチェック済み"
};
```

### 6. トラブルシューティング

| 問題 | 原因 | 解決策 |
|------|------|--------|
| 迷惑メールフォルダ | ドメイン未認証 | SPF/DKIM設定 |
| 配信されない | 送信者未確認 | Brevoで送信者追加 |
| 開封率が低い | 件名が不適切 | A/Bテスト実施 |

## 環境変数

```env
# Netlifyに設定
BREVO_API_KEY=your_api_key_here
BREVO_LIST_FREE=1
BREVO_LIST_STANDARD=2
BREVO_LIST_PREMIUM=3
BREVO_SENDER_EMAIL=noreply@keiba.link
BREVO_SENDER_NAME=NANKANアナリティクス
```

## 実装済みエンドポイント

- `/.netlify/functions/brevo-test` - API接続テスト
- `/.netlify/functions/send-test-campaign` - キャンペーン送信テスト

## 次のステップ

1. ✅ Brevoアカウント作成
2. ✅ APIキー取得と設定
3. ✅ Netlify Functions実装
4. 📋 ドメイン認証設定（SPF/DKIM/DMARC）
5. 📋 送信者アドレスの認証
6. 📋 本番メール配信テスト

---
最終更新: 2025-08-27