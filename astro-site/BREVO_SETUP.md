# Brevo API セットアップガイド

## 🚀 移行手順

### 1. Brevoアカウント作成
1. [Brevo公式サイト](https://www.brevo.com/)でアカウント作成
2. プラン選択: **Starter €25/月** (20,000件まで) または **Business €69/月** (無制限)
3. ダッシュボードにログイン

### 2. API設定

#### APIキー取得
1. Brevo管理画面 → **Settings** → **API Keys**
2. **Create a new API key** をクリック
3. 名前: `NANKANアナリティクス`
4. 権限: **Full access** を選択
5. 生成されたAPIキーをコピー

#### リスト作成
以下の3つのリストを作成：

1. **無料会員リスト**
   - 名前: `NANKAN - Free Members`
   - リストID をメモ（例：1）

2. **Standard会員リスト**
   - 名前: `NANKAN - Standard Members` 
   - リストID をメモ（例：2）

3. **Premium会員リスト**
   - 名前: `NANKAN - Premium Members`
   - リストID をメモ（例：3）

### 3. 環境変数設定

#### ローカル開発環境 (.env)
```bash
# Brevo API設定
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxx  # 取得したAPIキー
BREVO_LIST_FREE=1      # 無料会員リストID
BREVO_LIST_STANDARD=2  # Standard会員リストID  
BREVO_LIST_PREMIUM=3   # Premium会員リストID
```

#### 本番環境 (Netlify)
Netlify管理画面 → **Site settings** → **Environment variables** で以下を設定：

- `BREVO_API_KEY`: `xkeysib-xxxxxxxxxxxxxxxx`
- `BREVO_LIST_FREE`: `1`
- `BREVO_LIST_STANDARD`: `2`
- `BREVO_LIST_PREMIUM`: `3`

### 4. 送信者情報設定

Brevo管理画面で送信者設定：
- **送信者名**: `NANKANアナリティクス`
- **送信者メール**: `info@nankan-analytics.keiba.link`
- **返信先**: `info@nankan-analytics.keiba.link`

### 5. SMTP設定（トランザクションメール用）

```bash
# 追加環境変数
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=your-email@domain.com
BREVO_SMTP_PASS=your-smtp-key
```

## 📊 移行後の料金比較

```
ハイハイメール: ¥50,000/月
      ↓
Brevo Business: ¥10,350/月 (€69)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
月額削減額: ¥39,650
年間削減額: ¥475,800
```

## 🔧 テスト手順

1. API接続テスト: `/api/brevo/test-connection`
2. テスト連絡先追加: `/api/brevo/add-contact`
3. リスト確認: Brevo管理画面で連絡先数確認
4. テストメール送信: `/api/brevo/send-test`

## 📋 移行チェックリスト

- [ ] Brevoアカウント作成完了
- [ ] APIキー取得・設定完了
- [ ] 3つのリスト作成完了
- [ ] 環境変数設定完了
- [ ] 送信者情報設定完了
- [ ] API接続テスト成功
- [ ] テストメール送信成功
- [ ] 既存データ移行準備完了

## 🚨 注意事項

1. **APIキー管理**: APIキーは絶対に公開リポジトリに含めない
2. **段階的移行**: 一度にすべてを移行せず、テスト期間を設ける
3. **バックアップ**: 移行前にハイハイメールからデータエクスポート
4. **解約タイミング**: Brevoが安定稼働確認後にハイハイメール解約

## 📞 サポート

- Brevo公式サポート: [help.brevo.com](https://help.brevo.com/)
- 日本語ドキュメント: 一部対応
- APIドキュメント: [developers.brevo.com](https://developers.brevo.com/)