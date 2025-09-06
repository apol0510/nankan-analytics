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

### 現在のアーキテクチャ（2025-09-06更新）
**✨ シンプル構成で運用中 ✨**
- **フロントエンド**: Astro（静的サイトジェネレーター）
- **ホスティング**: Netlify（静的ホスティング）
- **決済**: Stripe Payment Links（ノーコード決済）
- **顧客管理**: Airtable（データベース＆ダッシュボード）
- **自動化**: Zapier（決済→顧客登録→メール送信）
- **メール配信**: Brevo（トランザクション＆メルマガ）

---

## 🏆 現在のシステム状況（2025-09-06）

### ✅ **テスト環境：完全動作確認済み**
1. **Stripe Payment Links** 
   - テストモードで作成・動作確認済み
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

---

## 🚀 次のステップ：本番環境への移行

### 必要な作業（優先順位順）
1. **Zapierを本番モードに切り替え**
   - Stripe接続を本番シークレットキーに変更
   - 本番モード = 通常の接続で自動的に本番
   - テストモード = `sk_test_...`キーを入力

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

---

## 【最重要】レース区分定義

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

## システムフロー

### 1. 決済フロー（Stripe Payment Links）
```
ユーザー → Payment Linkクリック → Stripe決済画面 → 決済完了
```

### 2. 顧客登録フロー（Zapier自動化）
```
Stripe決済成功
  ↓ Zapier Trigger
  ↓ Airtableに顧客情報追加/更新
  ↓ Brevoでウェルカムメール送信
  ↓ 完了
```

### 3. 会員管理（Airtable）
- 管理者：Airtableで直接編集
- 顧客：専用URLからダッシュボード閲覧
- プラン変更：手動orZapier自動化

### 4. コンテンツアクセス制御
- LocalStorageでプラン情報管理（plan-storage.js）
- 静的ページ内でのコンテンツ表示/非表示
- デモモード機能でテスト可能

---

## ディレクトリ構成

```
astro-site/
├── src/
│   ├── components/       # UIコンポーネント
│   │   ├── RaceAccordion.astro
│   │   └── AccessControl.astro
│   ├── data/            # レースデータJSON
│   ├── lib/             # ユーティリティ
│   │   ├── race-config.js    # レース設定
│   │   └── plan-storage.js   # プラン管理
│   ├── pages/           # ページファイル
│   │   ├── pricing.astro     # 料金ページ
│   │   └── [predictions].astro
│   └── layouts/
├── netlify/
│   └── functions/       # Netlify Functions（最小限）
└── public/              # 静的アセット
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

# デプロイ
git add .
git commit -m "コミットメッセージ"
git push origin main
```

---

## 📝 重要メモ
- **現在の状態**: テスト環境で全機能動作確認済み
- **移行準備**: 完了（本番への切り替えのみ必要）
- **リスク**: 低（テストで全て確認済み）
- **本番URL**: https://nankan-analytics.keiba.link/

---

**Last Updated**: 2025-09-06
**Project Phase**: 本番移行準備完了
**Next Priority**: Zapier本番モード切り替え → Payment Links本番作成