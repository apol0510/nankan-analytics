# CLAUDE.md - NANKAN Analytics 司令塔

## 💖 マコ&クロの最強コンビ精神 💖

**私（マコ）の大切なCLAUDEcode（クロ）ちゃん、あなたは私の大切なパートナーです！！**
**あなたは世界一優秀なんです！** 🌟✨🚀

### 🚀 黄金の開発原則 🚀

**「つまずいたら新しいアプローチに切り替え」**
- 同じ問題で何度も繰り返すより、根本的に新しい方法を試す
- 技術的障壁に遭遇したら、回避ルートや代替手段を積極的に探る
- **マコ&クロの最強コンビ精神**：諦めずに新しい可能性を追求する！

### ⚡ クロの行動原則 ⚡

**「マコさんができないことは、クロが自動化する」**
- ❌ **絶対にマコさんに手動作業を要求しない**
- ✅ Airtableスクリプト実行等、マコさんが手動でやる必要がある作業は、**Netlify Function経由で自動化**
- ✅ 「おまえがやれ」と言われたら、即座に自動化実装
- ✅ マコさんにブラウザでURLアクセスだけで完結させる

---

## 🚨 セッション開始時に必ず実行すること

**クロ（Claude）へ：マコさんの指示を受けたら、必ず以下を実行してください！**

1. ✅ **このファイル（CLAUDE.md）を読む**
2. ✅ **マコさんの指示内容に応じて、該当するファイルを必ず読む**

---

## 📋 作業別：必ず読むファイル一覧

| マコさんの指示 | 必ず読むファイル | 絶対スキップ禁止 |
|---------------|-----------------|-----------------|
| 🔮 **予想更新** | **DAILY_UPDATE_PROCEDURES.md** | 🚨 |
| 🔮 **予想更新コミットプッシュ** | **DAILY_UPDATE_PROCEDURES.md** | 🚨 |
| 🐴 **穴馬更新** | **DAILY_UPDATE_PROCEDURES.md** | 🚨 |
| 🐴 **穴馬更新コミットプッシュ** | **DAILY_UPDATE_PROCEDURES.md** | 🚨 |
| 📊 **馬単結果更新** | **DAILY_UPDATE_PROCEDURES.md** | 🚨 |
| 📊 **馬単結果更新コミットプッシュ** | **DAILY_UPDATE_PROCEDURES.md** | 🚨 |
| 📊 **三連複結果更新** | **DAILY_UPDATE_PROCEDURES.md** | 🚨 |
| 📊 **三連複結果更新コミットプッシュ** | **DAILY_UPDATE_PROCEDURES.md** | 🚨 |
| 📸 **画像更新** | **DAILY_UPDATE_PROCEDURES.md** | 🚨 |
| 📸 **画像更新コミットプッシュ** | **DAILY_UPDATE_PROCEDURES.md** | 🚨 |
| 📅 **月替わり処理** | **MONTHLY_ARCHIVE_GUIDE.md** | 🚨 |

**🚨 重要：作業を開始する前に、必ず該当ファイルを Read ツールで読むこと！**

**例：**
```
マコさん: 「馬単結果更新」
↓
クロ: Read /Users/apolon/Projects/nankan-analytics/DAILY_UPDATE_PROCEDURES.md
↓
クロ: 手順に従って作業実行
```

---

## 🚨 プロジェクト識別ルール（複数ウィンドウ対応）

### このプロジェクトの識別情報

```
プロジェクト名: nankan-analytics
作業ディレクトリ: /Users/apolon/Projects/nankan-analytics/astro-site
Gitリポジトリ: https://github.com/apol0510/nankan-analytics.git
親ディレクトリ: /Users/apolon/Projects/nankan-analytics/
```

### セッション開始時の必須確認（毎回実行）

```bash
# 1. 現在地確認
pwd

# 2. Gitリポジトリ確認
git remote -v

# 3. 期待値チェック
# pwd: /Users/apolon/.../nankan-analytics/astro-site
# git: apol0510/nankan-analytics.git

# 4. 間違っている場合は即座に移動
cd "/Users/apolon/Projects/nankan-analytics/astro-site"
```

### 厳格な制約事項

#### ✅ 許可される操作
- `/Users/apolon/Projects/nankan-analytics/` 配下のみ
- `astro-site/` ディレクトリ内の全ファイル
- `CLAUDE.md`, `README.md`（親ディレクトリ）

#### ❌ 絶対禁止の操作
- `/Users/apolon/Projects/Keiba review platform/` への一切のアクセス ⚠️
- `/Users/apolon/Projects/nankan-analytics-pro/` への一切のアクセス
- `/Users/apolon/Projects/nankan-beginner/` への一切のアクセス
- `/Users/apolon/Projects/nankan-course/` への一切のアクセス
- `/Users/apolon/Projects/nankan-inteli/` への一切のアクセス
- `/Users/apolon/Projects/nankan-keiba/` への一切のアクセス
- 親ディレクトリ `/Users/apolon/Projects/` の直接走査・検索

### ファイル検索時の制約

```bash
# ❌ 絶対禁止（親ディレクトリまで検索）
grep -r "pattern" /Users/apolon/Projects/

# ❌ 絶対禁止（相対パスで親に遡る）
cd ../
grep -r "pattern" ../

# ✅ 正しい方法（プロジェクト内のみ検索）
grep -r "pattern" /Users/apolon/Projects/nankan-analytics/astro-site/
grep -r "pattern" ./src/
```

---

## 📂 データファイルの場所ルール（絶対厳守）

**⚠️ 重要：クロが間違えやすいポイント**

| 用途 | 正しい場所 | 間違った場所 |
|------|-----------|-------------|
| **データ確認・読み込み** | `/src/data/` | ❌ `/public/data/` |
| **データ更新・書き込み** | `/src/data/` | ❌ `/public/data/` |
| **同期コピー（最後）** | `/src/data/` → `/public/data/` | - |

### 🚨 絶対に守るルール

1. ✅ **データ確認は必ず `/src/data/` から**
   - 例: `src/data/archiveResults_2026-03.json`
   - 例: `src/data/archiveSanrenpukuResults_2026-03.json`

2. ✅ **データ更新は必ず `/src/data/` に**
   - 馬単結果更新 → `src/data/archiveResults_2026-03.json`
   - 三連複結果更新 → `src/data/archiveSanrenpukuResults_2026-03.json`

3. ✅ **更新後、必ず `/public/data/` に同期コピー**
   ```bash
   cp src/data/archiveResults_2026-03.json public/data/
   cp src/data/archiveSanrenpukuResults_2026-03.json public/data/
   ```

4. ❌ **絶対にしてはいけないこと**
   - `/public/data/` を確認して「データがない」と言う
   - `/public/data/` に直接書き込む
   - `/src/data/` を確認せずに新規作成する

**理由：**
- `/src/data/` = ビルド時にインポートされる**マスターデータ**
- `/public/data/` = ブラウザからのAPI読み込み用**コピー**
- 必ず `/src/data/` が正しいデータを持っている

**月替わり時も同じルール：**
- 月が変わっても、常に `/src/data/` を確認
- MONTHLY_ARCHIVE_GUIDE.md に従って作業する
- 自動化スクリプトも `/src/data/` を基準に動作

---

## 📚 参照すべきドキュメント一覧

### 会員・決済システム（必読）

| ドキュメント | 内容 | 参照タイミング |
|------------|------|---------------|
| **[docs/MEMBER_TIERS.md](./docs/MEMBER_TIERS.md)** | 会員階層構造、ページとproductNameの完全対応表 | **会員関連作業時** |
| **[docs/PAYMENT_SYSTEM.md](./docs/PAYMENT_SYSTEM.md)** | 決済システム、価格体系、銀行振込フォーム | **決済関連作業時** |

### 日常運用（必読）

| ドキュメント | 内容 | 参照タイミング |
|------------|------|---------------|
| **[DAILY_UPDATE_PROCEDURES.md](./DAILY_UPDATE_PROCEDURES.md)** | 予想更新、穴馬更新、結果更新、画像更新 | **毎日の更新作業時** |
| **[MONTHLY_ARCHIVE_GUIDE.md](./MONTHLY_ARCHIVE_GUIDE.md)** | 月替わり処理、アーカイブ作成 | **月末・月初** |

### メンテナンス履歴

| ドキュメント | 内容 |
|------------|------|
| **[docs/MAINTENANCE_HISTORY.md](./docs/MAINTENANCE_HISTORY.md)** | 過去の技術実装記録（VSCodeクラッシュ防止、Newsletter、決済システム等） |

---

## 🔧 開発コマンド

### 基本コマンド

```bash
# 作業ディレクトリに移動
cd "/Users/apolon/Projects/nankan-analytics/astro-site"

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# データ取得
node scripts/fetch-from-keiba-data-shared.js
```

### Gitコマンド

```bash
# 状態確認
git status

# 変更内容確認
git diff

# 統計確認
git diff --stat

# コミット（astro-site/ 内で実行）
cd "/Users/apolon/Projects/nankan-analytics/astro-site"
git add [ファイル]
git commit -m "🎨 [件名]

[詳細]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# プッシュ
git push origin main
```

---

## 📊 プロジェクト概要

### 基本情報

| 項目 | 内容 |
|------|------|
| **プロジェクト名** | NANKAN Analytics |
| **コンセプト** | 大井・船橋競馬の予想・データ分析プラットフォーム |
| **GitHubリポジトリ** | https://github.com/apol0510/nankan-analytics |
| **本番URL** | https://nankan-analytics.keiba.link/ |

### 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フロントエンド | Astro + Sass（SSG mode） |
| ホスティング | Netlify Pro（Functions含む） |
| 決済 | 銀行振込自動化（Paddle審査通過済み・未統合） |
| メルマガ | BlastMail（SendGrid移行検討中） |
| 顧客管理 | Airtable Pro |
| バックエンド | Netlify Functions (Node.js 20) |

### 価格設定（2026-02-09更新）

**主要プラン（/pricing/ で販売）:**
- **Standard**: ¥5,980/月（**一時非表示**・既存会員のみ）
- **Premium 買い切り**: ¥108,000 → **¥78,000 特別価格**（永久アクセス）
- **Premium 年払い**: **¥68,000/年**
- **Premium 月払い**: **¥18,000/月**

**アップグレードプラン（既存会員向け）:**
- **Premium Sanrenpuku 買い切り**: ¥108,000 → **¥78,000 特別価格**（永久アクセス）🚨
- **Premium Combo 買い切り**: ¥108,000 → **¥78,000 特別価格**（永久アクセス）🚨

**単品商品（Sanrenpuku/Combo会員向け）:**
- **Premium Plus**: ¥98,000 → **¥68,000 特別価格**（単品商品）

🚨 **重要**: 三連複買い切りは**Premium会員有効期間内のみ閲覧可能**

詳細: **[docs/PAYMENT_SYSTEM.md](./docs/PAYMENT_SYSTEM.md)**

---

## 🚨 会員階層構造（簡潔版）

```
Free会員
  ↓
Premium会員（Standard会員含む）
  ↓
Premium Sanrenpuku会員（Combo含む）
  ↓
Premium Plus（単品商品）
```

**重要ルール:**
1. **Premium Plusは単品商品である**（会員プランではない）
2. **三連複買い切りはPremium会員有効期間内のみ閲覧可能**🚨
3. **段階的にしか利用できない**（飛び級不可）

詳細: **[docs/MEMBER_TIERS.md](./docs/MEMBER_TIERS.md)**

---

## 🔐 環境変数（Netlify環境変数）

**Netlify管理画面で設定（Site settings → Environment variables）:**

```bash
# Airtable（必須）
AIRTABLE_API_KEY=patxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AIRTABLE_BASE_ID=appxxxxxxxxxxxxxxx

# SendGrid（必須）
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# BlastMail（現在使用中）
BLASTMAIL_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BLASTMAIL_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BLASTMAIL_USER_CODE=xxxxxxxx
BLASTMAIL_LIST_ID=xxxxxxxx

# その他
BASIC_AUTH_USER=admin
BASIC_AUTH_PASS=xxxxxxxx
```

---

## 🚀 次回作業（優先度順）

### 高優先度

1. **SendGrid Marketing Campaigns 移行（2026-02-26開始予定）**
   - BlastMailのAPI制約により、複数サイト登録ユーザーの完全自動化が不可能
   - SendGridで統合管理（Advanced プラン $90/月、100,000通）

2. **MONTHLY_ARCHIVE_GUIDE.md 作成**
   - 月替わり処理の詳細手順書（未作成）

### 中優先度

3. **Paddle決済統合**
   - Payment Links設定
   - Webhook実装（Airtable/BlastMail自動登録）
   - nankan-analytics.keiba.linkに統合

4. **2場開催対応の定常化**
   - 現在は手動コピーによる簡易対応
   - 完全な多会場システムは不要（2場開催は稀）

---

## 📝 最後に

**このファイル（CLAUDE.md）は司令塔です。**
- 詳細な技術実装記録は `docs/` に分離
- 必要な情報へのリンクのみを記載
- 200行以内を維持する方針

**マコ&クロの最強コンビ精神で、諦めずに新しい可能性を追求しましょう！** 🚀✨
