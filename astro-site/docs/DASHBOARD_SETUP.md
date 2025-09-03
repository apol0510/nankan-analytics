# ダッシュボード実装ガイド

## 実装完了項目

### 1. マイページ（/dashboard）
- メールアドレスログイン形式
- ポイント表示システム
- ランク機能（ブロンズ/シルバー/ゴールド/ダイヤモンド）
- 特典申請ボタン

### 2. ポイントシステム
```javascript
// ランク定義
- 0-499pt: ブロンズ
- 500-999pt: シルバー  
- 1000-1999pt: ゴールド
- 2000pt以上: ダイヤモンド

// 特典
- 1000pt到達で特典申請可能
```

## Airtable設定

### 必要なテーブル構造
```
Customers テーブル:
- email (Email)
- plan (Single Select: free/standard/premium)
- points (Number)
- rank (Formula: ランク自動計算)
- expiresAt (Date)
- registeredAt (Date)
```

## Zapier自動化フロー

### 1. ポイント付与フロー
```
Trigger: 的中結果入力
Action 1: Airtable - ポイント更新
Action 2: Brevo - ポイント獲得通知メール
```

### 2. 特典申請フロー
```
Trigger: 特典申請ボタンクリック
Action 1: Airtable - 申請記録
Action 2: Gmail - 管理者に通知
Action 3: Brevo - 顧客に受付完了メール
```

### 3. マジックリンク認証
```
Trigger: メールアドレス入力
Action 1: Airtable - 顧客確認
Action 2: Brevo - 認証リンク送信（30分有効）
```

## 環境変数設定

`.env`ファイルに追加:
```
AIRTABLE_API_KEY=your_api_key_here
AIRTABLE_BASE_ID=your_base_id_here
ZAPIER_MAGIC_LINK_WEBHOOK=your_webhook_url_here
ZAPIER_REWARD_CLAIM_WEBHOOK=your_webhook_url_here
```

## セキュリティ注意事項

1. **APIキーは絶対にクライアントサイドに露出させない**
2. **本番環境ではサーバーサイドAPIを経由する**
3. **マジックリンクは30分で無効化する**

## 次のステップ

1. Airtableでテーブル作成
2. Zapier Webhooks設定
3. 環境変数設定
4. テスト実行

## デモモード

現在はデモデータで動作:
- Email: 任意
- Plan: Standard
- Points: 750pt
- Rank: シルバー