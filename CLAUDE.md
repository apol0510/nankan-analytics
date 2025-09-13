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
   - 管理画面：admin-newsletter-simple.astro ✅

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
admin-newsletter-simple.astroから送信時の必須パラメータ：
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
- admin-newsletter-simple.astroから即時配信テスト
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

---

## 🎯 **予想システム仕様（2025-09-13最新版）**

### ✨ **admin/predictions/ 複数印予想変換システム**

#### **📝 予想入力方法**
```
川崎1R 1400m（11頭）発走時刻14:45 2歳新馬
1番 △ △ ◎ △ ビリーヴインミー
2番 ○ ▲ △ タイムフレーム
3番 ◎ ○ ○ セレンディピティ
```

#### **🔢 累積スコア計算システム**
**基本ルール**: ベース70pt + 印の合計値 = 累積スコア
- **◎ = +7pt**
- **○ = +6pt** 
- **▲ = +5pt**
- **△ = +4pt**

**計算例**:
```
△ △ ◎ △ = 70 + 4 + 4 + 7 + 4 = 89pt
○ ▲ △ = 70 + 6 + 5 + 4 = 85pt
◎ ○ ○ = 70 + 7 + 6 + 6 = 89pt
```

#### **📊 特徴量バー自動振り分け**
累積スコアから3つのバーに自動振り分け:
- **安定性**: スコアに基づく自動計算
- **能力上位性**: スコアに基づく自動計算  
- **展開利**: スコアに基づく自動計算

#### **⭐ 総合評価星システム**
**96pt以上**: ★★★★（4つ星）
**95pt以下**: ★★★（3つ星）

**表示例**:
- 96pt → ★ 総合評価:★★★★
- 89pt → ★ 総合評価:★★★

#### **🎭 馬種別適用**
- **本命・対抗**: 星評価システム適用
- **単穴以下**: 星評価システム適用
- **全馬種**: 累積スコア表示

---

**📅 最終更新日**: 2025-09-14  
**🏁 Project Phase**: ベース信頼度・星評価システム統一完了  
**🎯 Current Priority**: マーケティング強化・顧客獲得  
**✨ 本日の成果**: ベース信頼度70→62変更・星評価閾値95→89pt調整達成！

---

## 🎊 **本日完了タスク（2025-09-14）**

### ✅ **ベース信頼度システム統一変更**
1. **shared-prediction-logic.js 基礎値変更**
   - ベース信頼度: 70pt → 62pt に統一
   - 印別計算値更新: ◎69→67, ○68→68, ▲67→67, △66→66, 無印62pt
   - `calculateMarkBasedConfidence`関数で全システム統一

2. **admin/predictions.astro 対応完了**
   - 管理画面でのベース値表示: 「ベース70pt」→「ベース62pt」
   - スコア計算ロジック: `70 + marks` → `62 + marks` 全5箇所更新
   - 新旧両形式の予想入力で統一適用

3. **星評価システム閾値調整**
   - 4つ星閾値: 95pt → 89pt に変更（6pt下げ）  
   - 3つ星閾値: 94pt以下 → 88pt以下 に変更
   - `convertToStarRating`関数で動的星評価実装

### 📋 **技術的成果**
- **信頼度統一**: 全予想ページ（premium/standard/free）で62pt基準統一
- **星評価改善**: より多くの馬が4つ星評価を受けやすくなるよう調整
- **管理画面同期**: admin/predictionsも新基準で予想データ生成
- **自動反映**: shared-prediction-logic.js経由で全コンポーネント自動更新

### 🔧 **実装ファイル**
- `src/lib/shared-prediction-logic.js`: ベース62pt・星評価89pt閾値実装
- `src/pages/admin/predictions.astro`: 管理画面スコア計算5箇所更新
- 予想表示ページ3ファイル: 自動的に新基準適用（インポート済み）

### 📊 **スコア・評価システム変更履歴**

#### **信頼度計算基準変更（2025-09-14）**
- **旧システム**: ベース70pt + 印加算
  - ◎本命: 70+7 = 77pt
  - ○対抗: 70+6 = 76pt  
  - ▲単穴: 70+5 = 75pt
  - △連下: 70+4 = 74pt
  - 無印: 70pt

- **新システム**: ベース62pt + 印加算  
  - ◎本命: 62+7 = 69pt
  - ○対抗: 62+6 = 68pt
  - ▲単穴: 62+5 = 67pt
  - △連下: 62+4 = 66pt
  - 無印: 62pt

#### **星評価閾値変更（2025-09-14）**
- **旧システム**: 95pt以上★★★★、94pt以下★★★
- **新システム**: 89pt以上★★★★、88pt以下★★★

#### **多重印累積計算例（新基準適用）**
```
例: △ △ ◎ △ = 62 + 4 + 4 + 7 + 4 = 81pt (★★★)
例: ◎ ○ ▲ = 62 + 7 + 6 + 5 = 80pt (★★★)  
例: ◎ ◎ ○ = 62 + 7 + 7 + 6 = 82pt (★★★)
例: ◎ ○ ▲ △ = 62 + 7 + 6 + 5 + 4 = 84pt (★★★)
例: ◎ ◎ ◎ = 62 + 7 + 7 + 7 = 83pt (★★★)
例: ◎ ◎ ◎ △ △ = 62 + 7 + 7 + 7 + 4 + 4 = 91pt (★★★★)
```

**💡 調整理由**: より細かい評価が可能になり、4つ星評価をより多くの馬が獲得しやすくなった

---

## 🎊 **過去完了タスク（2025-09-12）**

### ✅ **多重印システム完全実装**
1. **admin/predictions 多重印対応**
   - 管理画面で多重印（△ △ ◎ △）生成対応完了
   - JSON生成時に複数印を含むデータ出力

2. **信頼度計算システム統一**
   - 重複していた信頼度表示を完全統一
   - アコーディオンヘッダーの信頼度削除
   - 開いた状態のみ信頼度表示に変更

3. **多重印信頼度計算ロジック**
   - 累積加算式実装: △ △ ◎ △ = 62+4+4+7+4 = 81% (新基準適用)
   - `calculateMarkBasedConfidence`関数で多重印対応
   - `multiMark`フィールドによる隠し計算システム

### 📋 **技術的成果**
- **表示**: 単一印「▲」でシンプル表示
- **計算**: 裏で多重印「△ △ ◎ △」で正確な信頼度81%計算（新基準）
- **ユーザー体験**: 複雑な多重印を見せずシンプルなUI維持
- **累積スコア**: 新基準で正確に81pt表示（動作確認済み）

### 🔧 **実装ファイル**
- `src/pages/premium-predictions.astro`: 信頼度計算・表示統一
- `src/data/allRacesPrediction.json`: multiMarkフィールド追加
- `calculateMarkBasedConfidence`: 多重印対応関数

---

## 🚀 **マコ&クロの最強コンビ成果**
予約メール配信の根本問題を独自システムで完全解決！
技術的制約に負けず、新しいアプローチで突破しました！ 🌟✨🚀

---

## 📝 **管理画面使用方法（2025-09-10更新）**

### 🎯 **管理画面システム**

#### **📧 メール配信管理画面**
**使用ファイル**: `admin-newsletter-simple.astro`  
**アクセスURL**: `/admin-newsletter-simple`

**✨ 主な機能**
1. **即時配信**: 件名・本文・配信対象を設定してすぐ配信
2. **予約配信**: 日時指定での自動配信（独自スケジューラー使用）
3. **配信履歴確認**: 過去の配信状況・統計確認
4. **エラー監視**: 配信失敗時の詳細ログ表示

#### **🏇 競馬予想管理画面（2025-09-12更新）**
**使用ファイル**: `admin/predictions.astro`  
**アクセスURL**: `/admin/predictions`

**✨ 多重印対応システム完成**
1. **新形式対応**: 1頭に対して複数の印（◎○▲△）を設定可能
2. **旧形式互換**: 既存の単一印形式も継続サポート
3. **一括入力**: 全レース（1R〜12R）の予想テキスト一括貼り付け
4. **柔軟な予想表現**: より細かい予想ニュアンスの表現が可能

**📋 新形式例**
```
8/26川崎1R 1400m（11頭）発走時刻14:45 2歳新馬
1番 △ △ ◎ △ ビリーヴインミー
2番 ○ ▲ △ タイムフレーム
3番 ◎ ○ ○ セレンディピティ
```

**📋 旧形式例（継続サポート）**
```
8/26川崎1R 1400m（11頭）発走時刻14:45 2歳新馬
◎8キチョウ
```

### 🔧 **次回作業時の注意点**
- ❌ 旧ファイル `admin-newsletter.astro` は削除済み
- ✅ 新ファイル `admin-newsletter-simple.astro` を使用
- 配信テスト時は必ず5分後の予約配信で動作確認

**Next Priority**: Payment Links + Zapier実装