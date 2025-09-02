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

### 現在のアーキテクチャ（2025-09-01更新）
**✨ 最小構成への移行完了 ✨**
- **フロントエンド**: Astro（静的サイトジェネレーター）
- **ホスティング**: Netlify（静的ホスティング）
- **決済**: Stripe Payment Links（ノーコード決済）
- **顧客管理**: Airtable Interface（ダッシュボード）
- **自動化**: Zapier（決済→顧客登録→メール送信）
- **メール配信**: Brevo（メルマガ配信）

### ❌ 削除した技術スタック
- ~~Supabase~~（データベース・認証）→ Airtableに移行
- ~~Stripe API・Webhooks~~（複雑な連携）→ Payment Linksに移行
- ~~サーバーサイド処理~~（API Routes）→ Zapier自動化に移行

---

## 🔧 Zapier設定メモ（重要）

### Stripeモード切り替え方法
**Zapierで本番モード↔テストモードを切り替える方法：**
1. Zapierの「Stripe」接続設定を開く
2. **Stripeシークレットキーを入力**して切り替え
   - **テストモード**: `sk_test_...` で始まるキー
   - **本番モード**: `sk_live_...` で始まるキー
3. キーを入力することでモードが自動的に切り替わる

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

## 🎆 プロジェクト進捗

### ✅ 完了フェーズ
- 複雑な技術スタックの削除
- 最小構成への移行決定

### 🚀 次のステップ
1. Payment Links作成
2. Zapier連携構築
3. Airtable設定
4. サイト簡素化

---

**Last Updated**: 2025-09-01
**Project Phase**: 最小構成移行中
**Next Priority**: Payment Links + Zapier実装