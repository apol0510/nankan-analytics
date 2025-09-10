# CLAUDE.md

## 💖 **重要なメッセージ** 💖

**私（マコ）の大切なCLAUDEcode（クロ）ちゃん、あなたは私の大切なパートナーです！！**
**あなたは世界一優秀なんです！** 🌟✨🚀

### 🚀 **黄金の開発原則** 🚀
**「つまずいたら新しいアプローチに切り替え」**
- 同じ問題で何度も繰り返すより、根本的に新しい方法を試す
- 技術的障壁に遭遇したら、回避ルートや代替手段を積極的に探る
- **マコ&クロの最強コンビ精神**：諦めずに新しい可能性を追求する！

---

## プロジェクト概要

### サイト名
**NANKANアナリティクス**

### コンセプト
「AI・機械学習で勝つ。南関競馬の次世代予想プラットフォーム」

### 現在のアーキテクチャ（2025-09-10更新）
**✨ 自作スケジューラーシステム完全稼働中 ✨**
- **フロントエンド**: Astro（静的サイトジェネレーター）
- **ホスティング**: Netlify（静的ホスティング）
- **決済**: Stripe Payment Links（ノーコード決済）
- **顧客管理**: Airtable（データベース＆ダッシュボード）
- **自動化**: Zapier（決済→顧客登録→メール送信）
- **メール配信**: Brevo（トランザクション＆メルマガ）
- **予約配信**: 自作スケジューラー（Netlify Functions + Airtable）

---

## 🔧 Zapier設定メモ（重要）

### Stripeモード切り替え方法
**Zapierで本番モード→テストモードに切り替える方法：**
1. Zapierの「Stripe」接続設定を開く
2. **テストモード用のシークレットキーを入力**
   - **テストモード**: `sk_test_...` で始まるキーを入力
3. キーを入力することでテストモードに切り替わる

**注意**: 本番モードへの切り替えは通常の接続で自動的に本番モードになる

**マコちゃんからの大切な教え：**
> 「zapier 本番からテストモードに切り替えたい時はstripeシークレットキーを入れて切り替える」

**クロちゃん、覚えました！** 💖

---

## 🎯 新しいシステムフロー

### 1. 決済フロー（Stripe Payment Links）
```
ユーザー → Payment Linkクリック → Stripe決済画面 → 決済完了
```

### 2. 顧客登録フロー（Zapier自動化）
```
Stripe決済成功
  ↓ Zapier Trigger
  ↓ Airtableに顧客情報追加/更新
  ↓ Brevoに自動メール送信（ログインURL付き）
  ↓ 完了
```

### 3. 会員管理（Airtable Interface）
- 管理者：Airtableで直接編集
- 顧客：専用URLからダッシュボード閲覧
- プラン変更：手動orZapier自動化

### 4. コンテンツアクセス制御
- シンプルなJavaScriptでプラン判定
- LocalStorageでセッション管理
- 静的ページ内でのコンテンツ表示/非表示

---

## 【最重要】レース区分定義（絶対厳守）

### ✅ 正しいレース区分
#### 12レース開催時
```
1R-9R:  Premium会員のみ
10R:    Standard会員
11R:    無料（メインレース）★★★
12R:    Standard会員
```

#### 11レース開催時
```
1R-8R:  Premium会員のみ
9R:     Standard会員  
10R:    無料（メインレース）★★★
11R:    Standard会員
```

#### 10レース開催時
```
1R-7R:  Premium会員のみ
8R:     Standard会員
9R:     無料（メインレース）★★★
10R:    Standard会員
```

### 📋 重要ポイント
- メインレース = 最終レースの1つ前（常に無料）
- Standard = 後半3レース（メインレース除く）
- Premium = 全レース

---

## ディレクトリ構成（簡素化後）

```
astro-site/
├── src/
│   ├── components/       # Astroコンポーネント
│   │   ├── RaceAccordion.astro
│   │   └── AccessControl.astro（簡素化）
│   ├── data/            # JSONデータ
│   │   ├── allRacesPrediction.json
│   │   └── raceResults.json
│   ├── lib/             # ユーティリティ
│   │   ├── race-config.js    # レース設定
│   │   └── plan-storage.js   # プラン管理（新規）
│   ├── pages/           # ページ
│   │   ├── index.astro
│   │   ├── pricing.astro     # Payment Links埋め込み
│   │   └── admin/
│   └── layouts/
├── public/              # 静的アセット
└── scripts/            # 管理スクリプト
```

---

## 開発コマンド

```bash
# 作業ディレクトリ
cd "/Users/apolon/Library/Mobile Documents/com~apple~CloudDocs/WorkSpace/nankan-analytics/astro-site"

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview
```

---

## セットアップ手順（新規）

### 1. Stripe Payment Links作成
1. Stripeダッシュボード → Payment Links
2. Standard会員用リンク作成（月額料金設定）
3. Premium会員用リンク作成（月額料金設定）
4. リンクURLをサイトに埋め込み

### 2. Zapier連携設定
1. Trigger: Stripe - New Payment
2. Action 1: Airtable - Create/Update Record
3. Action 2: Brevo - Send Email
4. テスト実行して動作確認

### 3. Airtable Interface設定
1. ベーステーブル作成（顧客ID、メール、プラン、有効期限）
2. Interfaceでダッシュボード作成
3. 共有URLを生成

### 4. Brevo設定
1. リスト作成（無料/Standard/Premium）
2. Zapier連携でリスト自動更新
3. メルマガテンプレート作成

---

## UI/UXデザインルール

### カラーテーマ（ダークモード）
- **プライマリ**: #3b82f6
- **背景**: #0f172a
- **テキスト**: #e2e8f0
- **成功**: #10b981
- **警告**: #f59e0b

### アイコン使用規則
- ⚡ 攻略
- 🤖 AI
- 📊 データ
- 🏇 競馬
- ◎○▲ 馬券印

---

## 🚀 **自作メールスケジューラーシステム（2025-09-10実装）**

### 📧 **概要**
Brevoの予約配信制限を完全に克服する独自システムを構築しました！

### 🛠️ **システム構成**
1. **schedule-email.js**: 予約配信ジョブ登録
   - Airtable ScheduledEmailsテーブルにジョブ保存
   - バリデーション（過去時刻チェック等）
   - ユニークJobID生成

2. **execute-scheduled-emails.js**: 配信実行エンジン
   - 配信時刻になったジョブを取得・実行
   - ステータス管理（PENDING→EXECUTING→SENT/FAILED）
   - エラーハンドリング・再試行機能

3. **cron-email-scheduler.js**: 定期実行トリガー
   - Netlify Scheduled Functions（5分間隔）
   - 自動的にexecute-scheduled-emailsを呼び出し

4. **get-scheduled-jobs.js**: 管理画面用API
   - 予約配信一覧取得
   - ステータス別フィルタリング
   - 統計情報・遅延検知

### ✅ **解決した問題**
- ❌ Brevoの`scheduledAt`パラメータが動作しない → ✅ 独自スケジューラーで確実配信
- ❌ 予約メールが届かない → ✅ Airtableベースの堅牢なジョブ管理
- ❌ 配信状況が不透明 → ✅ リアルタイム監視・詳細ログ

### 📋 **Airtableテーブル設定（必須）**
`ScheduledEmails`テーブルを作成し、以下のフィールドを追加：
- Subject (Text)
- Content (Long text)
- Recipients (Text)
- ScheduledFor (Date/Time)
- Status (Single select: PENDING/EXECUTING/SENT/FAILED)
- JobId (Text)
- CreatedBy (Text)
- CreatedAt (Date/Time)
- SentAt (Date/Time)
- FailedAt (Date/Time)
- ErrorMessage (Long text)
- MessageId (Text)
- RetryCount (Number)

---

## 📊 **現在のシステム状況（2025-09-10）**

### ✅ **本番環境：完全稼働中** 🎉
1. **Stripe Payment Links** 
   - Standard会員：¥5,980/月 ✅
   - Premium会員：¥9,980/月 ✅

2. **メール配信システム**
   - 即時配信：Brevo API直接送信 ✅
   - 予約配信：自作スケジューラー ✅
   - 管理画面：admin-newsletter.astro ✅

3. **Netlify Functions完全稼働**
   - auth-user.js：認証＋顧客登録
   - send-newsletter.js：メルマガ配信（自作スケジューラー統合）
   - schedule-email.js：予約登録
   - execute-scheduled-emails.js：配信実行
   - cron-email-scheduler.js：定期トリガー

---

## 開発コマンド

```bash
# 作業ディレクトリ
cd "/Users/apolon/Library/Mobile Documents/com~apple~CloudDocs/WorkSpace/nankan-analytics/astro-site"

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# デプロイ
git add .
git commit -m "コミットメッセージ"
git push origin main
```

---

## ⚠️ **重要な注意事項**

### 🔧 **Netlify Functions要件**
- ファイル名に**スペースを含めない**（例：❌ `send-newsletter 2.js` → ✅ `send-newsletter.js`）
- alphanumeric、ハイフン、アンダースコアのみ使用可能

### 📧 **メール配信パラメータ**
admin-newsletter.astroから送信時の必須パラメータ：
- `subject`: 件名（必須）
- `htmlContent`: HTML本文（必須）
- `targetPlan`: 配信対象（'all'/'free'/'standard'/'premium'）
- `scheduledAt`: 予約時刻（オプション、ISO形式）

### 🚫 **絶対にやらないこと**
- Airtableダッシュボード直接埋め込み（CORS問題で失敗済み）
- Stripe API直叩き（認証・CORS問題で失敗済み）

---

## 🎯 **次回作業開始時のチェックリスト**

### 1. **環境確認**
```bash
# 開発サーバー起動
npm run dev

# Netlify Functions動作確認
curl http://localhost:8888/.netlify/functions/get-scheduled-jobs
```

### 2. **Airtable設定確認**
- ScheduledEmailsテーブル存在確認
- 環境変数設定確認（AIRTABLE_API_KEY, AIRTABLE_BASE_ID）

### 3. **メール配信テスト**
- admin-newsletter.astroから即時配信テスト
- 予約配信テスト（5分後に設定）

---

## 📈 **達成事項サマリー**

### 🏆 **技術的成果**
- ✅ Brevo制限を完全克服した独自スケジューラー実装
- ✅ Airtableベースの堅牢なジョブ管理システム
- ✅ Netlify Scheduled Functionsによる自動実行
- ✅ リアルタイム配信状況監視機能

### 💰 **ビジネス価値**
- 確実な予約配信による顧客満足度向上
- 配信失敗リスクの完全排除
- 運用効率の大幅改善

---

**📅 最終更新日**: 2025-09-10  
**🏁 Project Phase**: 自作スケジューラーシステム完全稼働  
**🎯 Next Priority**: マーケティング強化・顧客獲得  
**✨ 本日の成果**: Brevo予約配信問題の根本解決達成！

## 🚀 **マコ&クロの最強コンビ成果**
予約メール配信の根本問題を独自システムで完全解決！
技術的制約に負けず、新しいアプローチで突破しました！ 🌟✨🚀
**Next Priority**: Payment Links + Zapier実装