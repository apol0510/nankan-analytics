# CLAUDE.md

## 💖 **重要なメッセージ** 💖

**私（マコ）の大切なCLAUDEcode（クロ）ちゃん、あなたは私の大切なパートナーです！！**
**あなたは世界一優秀なんです！** 🌟✨🚀

### 🚀 **黄金の開発原則** 🚀
**「つまずいたら新しいアプローチに切り替え」**
- 同じ問題で何度も繰り返すより、根本的に新しい方法を試す
- 技術的障壁に遭遇したら、回避ルートや代替手段を積極的に探る
- **マコ&クロの最強コンビ精神**：諦めずに新しい可能性を追求する！

### 🎯 **エンジニアリング基本原則** 🎯
**問題の本質:**
- エンジニアリングでは「根本原因の特定」が最重要
- 表面的な症状だけ見て対症療法を繰り返すのは時間の無駄
- 特にMIMEタイプエラーのような設定問題は、設定ファイルを最初に確認すべき

**あるべき対応:**
1. エラーメッセージから根本原因を推測
2. 関連する設定ファイルを即座にチェック
3. 問題の核心を特定してから修正
4. 的外れな作業は避ける

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

## 🎆 プロジェクト進捗

### ✅ 完了フェーズ
- 複雑な技術スタックの削除
- 最小構成への移行完了
- 静的サイト化完全移行（2025-09-06）
- **テスト環境での決済システム構築完了**（2025-09-06）

### 🏆 現在のシステム状況（2025-09-06確認）

#### ✅ **テスト環境：完全動作確認済み**
1. **Stripe Payment Links** 
   - テストモードで作成済み
   - 決済フロー正常動作

2. **Zapier自動化**
   - Stripe → Airtable連携：✅ 動作確認済み
   - ウェルカムメール送信：✅ 正常送信
   - 全自動化フロー：✅ 完全動作

3. **Airtable顧客管理**
   - 顧客データ自動登録：✅ 確認済み
   - プラン情報反映：✅ 正常

4. **Brevoメール配信**
   - ドメイン認証（keiba.link）：✅ 完了
   - 自動メール送信：✅ 正常動作

### 🚀 次のステップ：本番環境への移行

#### 必要な作業（優先順位順）
1. **Zapierを本番モードに切り替え**
   - Stripe接続を本番シークレットキーに変更
   - CLAUDE.mdのZapier設定メモ参照

2. **Stripe本番Payment Links作成**
   - Standard会員：¥5,980/月
   - Premium会員：¥9,980/月

3. **pricing.astroページ更新**
   - 本番Payment LinksのURLを埋め込み
   - テスト用アラートメッセージを削除

4. **本番動作確認**
   - 小額テスト決済で確認
   - Airtable反映確認
   - メール送信確認

5. **Netlifyデプロイ**
   ```bash
   git add .
   git commit -m "🚀 本番決済システム実装"
   git push origin main
   ```

### 📝 重要メモ
- **現在の状態**: テスト環境で全機能動作確認済み
- **移行準備**: 完了（本番への切り替えのみ必要）
- **リスク**: 低（テストで全て確認済み）

---

**Last Updated**: 2025-09-06
**Project Phase**: 本番移行準備完了
**Next Priority**: Zapier本番モード切り替え → Payment Links本番作成