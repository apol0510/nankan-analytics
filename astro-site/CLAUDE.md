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

## 🔧 **定期メンテナンス記録** 🔧

### 🚨 **2025-11-12 緊急対応：SendGrid上限超過インシデント** 🚨

#### **インシデント概要**
- **発生日時**: 2025年11月12日
- **問題**: 15,756件のメール配信が8回繰り返され、126,389通送信（SendGrid月間上限100,000通を26,389通超過）
- **影響**: 11月末までSendGrid経由のメール送信不可
- **顧客クレーム**: 連続メール送信によるクレーム発生

#### **根本原因**
1. **SentCountフィールド不在**: Airtable ScheduledEmailsテーブルに進捗管理フィールドが存在せず
2. **auto-email-executor.js**: 毎分自動実行により、進捗なしで8回繰り返し送信
3. **タイムアウト対策の副作用**: 8分タイムアウト保護が正常動作したが、進捗保存失敗で毎回ゼロから再開

#### **緊急停止措置**
- `auto-email-executor.js` 完全削除（コミット 60e9611）
- Netlify Scheduled Functions停止
- 連続送信の即座停止完了

#### **影響範囲**
**送信不可（2025年11月12日～11月30日）:**
1. メルマガ配信（send-newsletter.js / execute-scheduled-emails.js）
2. ポイント交換通知（point-exchange.js）
3. 有効期限通知（expiry-notification.js / cron-expiry-check.js）

**影響なし（正常動作）:**
1. Stripe決済後ウェルカムメール（Zapier経由・SendGrid不使用）
2. マジックリンク認証（Brevo使用）
3. サイト表示・ログイン機能全般

#### **恒久対策（12月1日実施予定）**
1. **Airtableフィールド追加**: ScheduledEmailsテーブルに `SentCount` フィールド追加（Number型、デフォルト0）
2. **自動実行廃止**: auto-email-executor.js削除状態を維持、手動実行のみに変更
3. **監視強化**: SendGrid使用量アラート設定、上限90%で通知

#### **代替運用（11月）**
- メルマガ配信: 配配メールで代替実施
- ポイント交換: Airtable手動確認で対応
- 有効期限通知: 一時停止（致命的影響なし）

#### **教訓**
- ❌ 完全自動化は危険：進捗管理フィールド不在での自動実行は禁止
- ✅ 段階的テスト必須：少数テスト配信 → 本番配信の手順厳守
- ✅ 監視体制強化：SendGrid使用量リアルタイム監視の重要性

---

### ✅ **2025-11-11 メンテナンス実施（午後）**

#### **メルマガ予約配信システム完全修復**
- **問題**: 15,755件の大量配信で504 Gateway Timeout + 500 UNKNOWN_FIELD_NAME エラー
- **解決策**: LAZY_LOAD実装完了
  - `schedule-email.js`: Recipients に `LAZY_LOAD:targetPlan:targetMailingList:YES/NO` 形式で保存
  - `execute-scheduled-emails.js`: getRecipientsList関数追加・配信時に動的取得
  - `admin-newsletter-simple.astro`: 予約配信待ち表示修正（status=PENDING大文字化）
- **結果**: 504タイムアウト問題・500エラー・管理画面0件表示の3問題を完全解決 ✅

#### **依存関係更新**
- **npm update 実行**: 81パッケージ追加・8パッケージ削除・141パッケージ変更
- **主要更新**:
  - `@astrojs/netlify`: 6.5.13 → 6.6.0
  - `@astrojs/rss`: 4.0.12 → 4.0.13
  - `astro`: 5.14.6 → 5.15.5
  - `netlify-cli`: 23.9.1 → 23.10.0
  - `sass`: 1.93.2 → 1.94.0

#### **脆弱性状況**
- **本番環境**: 0脆弱性 ✅
- **開発環境**: tar 7.5.1 (netlify-cli内・moderate・本番影響なし)
  - 理由: netlify-cli は開発ツールであり本番環境には含まれない

---

### ✅ **2025-11-11 メンテナンス実施（午前）**

#### **不要ファイル削除**
- `public/test-auth.js` - テスト用認証ファイル（開発用・本番不要）
- `public/bet-layering-prototype-full.html` - プロトタイプHTML（開発用）
- `public/bet-layering-prototype.html` - プロトタイプHTML（開発用）

#### **復活防止対策**
- `.gitignore` 完全設定確認済み
- プロトタイプファイル自動除外設定済み
- 不要ファイル削除後の自動除外確保

---

## 🖼️ **画像更新システム（完全修正・2025-10-11確定）** ✅

### ✅ **最終確定方式（2025-10-11実装完了）**

#### **1. withdrawal-upsell.astro**
**クライアントサイドJS方式（自動日付計算）**
```javascript
// 日本時間で昨日の日付を自動計算
const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
jst.setDate(jst.setDate() - 1); // 昨日

// 10日前まで自動フォールバック
function tryLoadImage(daysBack) {
  img.src = `/upsell-images/upsell-${dateStr}.png`;
  img.onerror = function() {
    if (daysBack < 10) tryLoadImage(daysBack + 1);
  };
}
```

#### **2. premium-plus.astro**
**HTML静的記述方式（最新5枚を手動指定）**
```html
<!-- 最新5枚の画像を直接指定 -->
<img src="/upsell-images/upsell-20251010.png" ... />
<img src="/upsell-images/upsell-20251009.png" ... />
<img src="/upsell-images/upsell-20251008.png" ... />
<img src="/upsell-images/upsell-20251007.png" ... />
<img src="/upsell-images/upsell-20251006.png" ... />
```

### 🤖 **クロ（Claude）への確定指示**

**マコさんが「画像更新」または「画像更新コミットプッシュ」と言ったら：**

```bash
# 1. 最新画像ファイル確認
ls -la public/upsell-images/ | tail -10

# 2. premium-plus.astroのHTML直接更新
#    - 最新5枚の日付を確認
#    - <img src="/upsell-images/upsell-YYYYMMDD.png" ... /> を最新5枚に更新

# 3. git add, commit, push（1回で完了）
git add public/upsell-images/ src/pages/premium-plus.astro
git commit -m "📸 画像更新・upsell-YYYYMMDD追加・premium-plus最新5枚反映"
git push origin main
```

### 📋 **重要：1回で完了させる手順**

1. **新規画像確認**: `ls -la public/upsell-images/ | tail -10` で最新ファイル確認
2. **premium-plus.astro修正**: 最新5枚の日付をHTMLに直接記述
3. **withdrawal-upsell.astro**: 修正不要（自動日付計算で対応）
4. **一括コミット**: 画像ファイル + Astroファイルを同時にコミット・プッシュ

### 🚫 **復活防止：絶対にやってはいけないこと**
- ❌ **画像ファイルだけをコミット**: Astroファイルが古い日付のままで表示されない
- ❌ **2回に分けてコミット**: 必ず1回で画像 + Astroファイルを同時にコミット
- ❌ **クライアントサイドDOM生成（premium-plus）**: レイアウト崩れの原因
- ✅ **withdrawal-upsell**: クライアントサイドJS（単一画像なので問題なし）
- ✅ **premium-plus**: HTML静的記述（5枚表示・確実な表示保証）

---

## 🛡️ **予想データ矛盾問題・完全根絶対策（2025-10-22新規実装）** ✅

### ⚠️ **過去の問題（データ矛盾）**
- **問題**: allRacesPrediction.json生成時、raceNameとraceInfo内のdistance/horseCountが矛盾
- **具体例**:
  ```json
  "raceName": "Ｃ３(一)(二)ダ1,600m（14頭） 発走時刻14:30"  // 1,600m・14頭
  "distance": "1400m",  // 矛盾！
  "horseCount": 10,     // 矛盾！
  "raceDetails": "大井1R 1400m （10頭） 発走時刻14:45 Ｃ３(一)(二)ダ1,600m（14頭） 発走時刻14:30"  // 重複！
  ```
- **原因**: raceNameに含まれる距離・頭数・時刻を無視して、別の値を設定していた

### ✅ **完全根絶解決策（2025-10-22実装完了）**

#### **1. raceNameから正確な情報を抽出（優先使用）**
```javascript
// betting-direct-super-simple.astro（415-435行目）
// raceNameに距離・頭数・時刻が含まれている場合は、そこから抽出して優先使用
const raceNameMatch = actualRaceName.match(/ダ([\d,]+)m.*?（(\d+)頭）.*?発走時刻(\d+:\d+)/);
if (raceNameMatch) {
    actualDistance = raceNameMatch[1].replace(/,/g, ',') + 'm';  // "1,600m"形式維持
    actualHorseCount = parseInt(raceNameMatch[2]);
    actualStartTime = raceNameMatch[3];
    console.log(`✅ ${raceNum}R: raceNameから情報抽出 - 距離=${actualDistance}, 頭数=${actualHorseCount}, 時刻=${actualStartTime}`);
}
```

#### **2. raceDetails重複防止**
```javascript
// betting-direct-super-simple.astro（456-459行目）
raceDetails: raceNameMatch
    ? `${actualTrack}${raceNum}R ${actualRaceName}`  // raceNameに詳細あり→シンプル表記
    : `${actualTrack}${raceNum}R ${actualDistance} （${actualHorseCount}頭） 発走時刻${actualStartTime} ${actualRaceName}`  // 詳細なし→追加
```

### 🚫 **絶対に復活させてはいけない問題**
1. ❌ raceNameの情報を無視して別の値を設定
2. ❌ raceDetailsに2つの異なる情報を重複記載
3. ❌ 距離・頭数・時刻の矛盾データ生成

### 🔒 **復活防止保証**
- **自動抽出**: raceNameから距離・頭数・時刻を自動抽出して優先使用
- **矛盾検出**: コンソールログで抽出情報を表示・確認可能
- **重複防止**: raceNameに詳細が含まれている場合はraceDetailsをシンプル化

### 📋 **実装ファイル**
- `src/pages/admin/betting-direct-super-simple.astro`: JSON生成ロジック修正（415-459行目）
- **復活防止コメント**: コード内に詳細な説明・理由を記録

---

## 🛡️ **dark-horse-picks LocalStorageリセット問題・完全解決（2025-10-22最終強化版）** ✅

### ⚠️ **過去の問題（日付変更時にリセットされない）**
- **問題1**: darkHorseData.jsonを更新しても、LocalStorageに古い日付のクリック状態が残る
- **問題2**: ブラウザキャッシュにより古いJavaScriptが実行され続け、修正が反映されない
- **症状**: 22日のデータに更新しても、21日の「再確認するボタン」が表示される
- **原因1**: ブラウザのローカル時刻と比較していたため、データ更新時にリセットされない
- **原因2**: ブラウザがキャッシュした古いJavaScriptコードが実行され続ける

### ✅ **完全解決策（2025-10-22最終強化版実装完了）**

#### **バージョン管理 + 日付比較の二重チェックシステム**
```javascript
// dark-horse-picks.astro（361-417行目）
function loadUsedPicks() {
    const STORAGE_VERSION = '2025-10-23'; // ⚠️ darkHorseData更新時にこの日付も更新すること
    const dataDate = "{data.date}"; // darkHorseData.jsonの日付を使用
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
        const data = JSON.parse(stored);

        // 🔴 第1チェック: バージョン番号確認（ブラウザキャッシュ対策）
        if (!data.version || data.version !== STORAGE_VERSION) {
            console.log(`🔄 バージョン変更検出 - LocalStorageをリセット`);
            usedPicks = [];
            saveUsedPicks();
            return;
        }

        // 🔴 第2チェック: 日付確認（データ更新時の確実なリセット）
        if (data.date === dataDate) {
            usedPicks = data.usedRaces || [];
        } else {
            console.log(`🔄 日付変更検出 - LocalStorageをリセット`);
            usedPicks = [];
            saveUsedPicks();
        }
    }
}

function saveUsedPicks() {
    const STORAGE_VERSION = '2025-10-23'; // ⚠️ loadUsedPicks()と同じバージョン番号
    const data = {
        version: STORAGE_VERSION, // 🔴 バージョン番号追加
        date: dataDate,
        usedRaces: usedPicks,
        count: usedPicks.length,
        savedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
```

### 🚫 **絶対に復活させてはいけない問題**
1. ❌ ブラウザのローカル時刻（`new Date().toISOString()`）との比較
2. ❌ データ更新時にLocalStorageがリセットされない状態
3. ❌ 古い日付のクリック状態が残り続ける問題
4. ❌ バージョン管理なしのシステム（ブラウザキャッシュ問題が再発する）

### 🔒 **復活防止保証（二重チェックシステム）**
- **第1防護: バージョン番号チェック**: ブラウザキャッシュを無視して強制リセット
- **第2防護: 日付チェック**: darkHorseData.json基準の日付判定
- **自動リセット**: データ更新時に自動的にLocalStorageをクリア
- **デバッグログ**: バージョン・日付変更検出時にコンソールログ出力

### 📋 **実装ファイル**
- `src/pages/dark-horse-picks.astro`: LocalStorage管理ロジック修正（361-417行目）
- **復活防止コメント**: コード内に詳細な説明・理由を記録
- **バージョン管理**: STORAGE_VERSION変数で強制リセット実現

### ⚠️ **重要：darkHorseData更新時の手順**
```bash
# 1. darkHorseData.json更新
# 2. dark-horse-picks.astro内のSTORAGE_VERSION更新（2箇所）
const STORAGE_VERSION = '2025-10-23'; // この日付を更新
# 3. コミット・プッシュ
```

---

## プロジェクト概要

### サイト名
**NANKANアナリティクス**

### コンセプト
「AI・機械学習で勝つ。南関競馬の次世代予想プラットフォーム」

### 現在のアーキテクチャ（2025-09-30更新）
**✨ プレミアムプラス特別案内セクション実装・退会アップセル機能完全実装完了 ✨**
- **フロントエンド**: Astro（静的サイトジェネレーター）+ インタラクティブCanvas Chart
- **ホスティング**: Netlify Pro（有料プラン）
- **決済**: Stripe Payment Links（ノーコード決済）
- **顧客管理**: Airtable Pro（有料プラン）
- **自動化**: Zapier Premium（有料プラン）+ AI Agents対応 **✅完全復活**
- **メール配信**: SendGrid Marketing Campaigns エッセンシャル100 **✅審査通過**
- **予約配信**: 自作スケジューラー（Netlify Functions + Airtable）
- **ドメイン保護**: 5回失敗自動ブロックシステム
- **顧客認証**: プレミアム会員認証問題完全解決
- **SEOブログ**: 混合コンテンツシステム（Markdown + Astroページ統合表示）
- **コース攻略**: 36枚の競馬場画像 + データビジュアライゼーション

### 💳 **有料プラン移行詳細（2025-09-19実施）**
#### **Netlify Pro**
- 月額$19/month
- より高いビルド制限・帯域幅
- 高度な分析機能

#### **Airtable Pro**
- 月額$20/month (per seat)
- より多くのレコード・添付ファイル容量
- 高度なビュー・フィルタ機能

#### **Zapier Premium**
- 月額$19.99/month
- 月間実行回数: 無制限
- AI Agents機能利用可能
- 高度なフィルタ・条件分岐

---

## 🛡️ **復活防止対策完全ガイド（2025-09-24更新）**

### 🚫 **ウェルカムメール復活防止システム（2025-09-24新規実装）**

#### **復活禁止対象の詳細**
- **sendWelcomeEmail関数**: 90+行のHTMLテンプレートを含む完全な機能
- **HTMLメールテンプレート**: NANKANアナリティクスへようこそ・マイページログインURL
- **SendGrid API連携**: sg.send()・エラーハンドリング・成功/失敗分岐
- **環境変数依存URL**: process.env.SITE_URL経由の8912keibalink問題
- **自動メール送信**: 新規ユーザー登録時の自動配信システム

#### **復活防止の3層システム**

##### **1. ドキュメント防護**
- **WELCOME_EMAIL_REVIVAL_PREVENTION.md**: 168行の完全防止ガイド
- **削除理由の詳細記録**: 技術的問題・根本的課題の明文化
- **新規実装ガイドライン**: 安全な代替手法・ハードコーディング推奨

##### **2. 自動検知スクリプト**
- **check-welcome-email-revival.cjs**: 復活禁止パターンの自動検出
- **禁止パターン**: sendWelcomeEmail, 8912keibalink, NANKANアナリティクスへようこそ等
- **対象ファイル**: auth-user.js, send-newsletter.js, contact-form.js監視
- **実行時検証**: 復活違反を検出すると強制終了（process.exit(1)）

##### **3. コード内防護コメント**
- **auth-user.js内**: 50+行の詳細削除記録・復活禁止宣言
- **削除日時記録**: 2025-09-24・理由の明記
- **新規実装制約**: 削除コードの再利用完全禁止
- **代替手法指示**: 新ファイル・新関数名での実装必須

#### **復活防止の技術的仕組み**
```javascript
// 復活防止検知パターン（check-welcome-email-revival.cjs）
const FORBIDDEN_PATTERNS = [
  'sendWelcomeEmail',
  'HTMLメールテンプレート',
  '8912keibalink',
  'process.env.SITE_URL.*dashboard',
  'ウェルカムメール送信成功',
  'NANKANアナリティクスへようこそ',
  'マイページにログイン 📊'
];

// コメント内での言及は除外（復活防止ドキュメントは対象外）
if (regex.test(line) && !line.trim().startsWith('//') && !line.includes('復活禁止'))
```

---

## 🛡️ **復活防止対策完全ガイド（2025-09-18更新）**

### ⚠️ **現状維持の重要性**
**指示がない限り、現状を維持してもらいたい。悪化したり復活しないように対策してほしい。**

### 🔒 **絶対に変更してはいけない最終確定事項**

#### **📋 レイアウト構成（standard-predictions.astro）**
```
1. 📊 ヘッダーセクション - AI分析完了・レース数・推奨度・回収率
2. 🏆 昨日の的中結果 - Yesterday's results section
3. ⭐ スタンダード会員限定コンテンツ - 後半3レース直前に配置
4. 🏇 後半３レース予想 - Race predictions (10R, 11R, 12R)
5. 👑 プレミアムCTAバナー - 4つの特徴カード・ホバーアニメーション
6. 🏆 先週の的中結果 - Weekly results with tabs
```

#### **🛡️ データ反映システム（完全復活防止）**
```javascript
// 🔒 index.astro で完全保護
const currentResults = yesterdayResults;  // 強制的にyesterdayResultsを使用

// 🚨 間違った使用を自動検出
if (currentResults !== yesterdayResults) {
    throw new Error('🚨 復活防止エラー: currentResultsはyesterdayResultsと同じでなければなりません');
}
```

#### **🔧 JSONデータ優先システム（絶対維持）**
```javascript
// JSONデータ優先システム（復活防止対策）
if (raceData.strategies && raceData.strategies.safe && raceData.strategies.balance && raceData.strategies.aggressive) {
    // JSONデータが存在する場合は優先使用
    raceStrategies = raceData.strategies;
} else {
    // 動的生成は最後の手段のみ
    const processedData = getPredictionDataWithStrategies(raceData.horses);
    raceStrategies = processedData.strategies;
}
```

### 🗑️ **削除済み・復活禁止要素**

#### **❌ 削除済みファイル（復活禁止）**
- `src/data/raceResults.json` - 古いデータファイル（削除済み・復活禁止）
- `admin/betting-direct.astro` - 古い管理画面（削除済み）
- `admin/betting-direct-simple.astro` - 使用されていない管理画面（削除済み）
- `admin/race-converter-single.astro` - 未使用管理画面（2025-09-22削除）
- `admin/newsletter.astro` - 古いメルマガ管理画面（2025-09-22削除）
- `admin/predictions.astro` - 古い予想管理画面（2025-09-22削除）

#### **❌ 削除済みUI要素（復活禁止）**
- raceResults.jsonの直接使用（古いデータソース）
- race.status === 'hit'形式の判定
- ハードコーディングされた日付・競馬場表示
- 馬場スコア表示・スコアバー（過去に削除済み）
- 「（推奨度 ★★★）」表示（過去に削除済み）

### 🚫 **絶対に復活させてはいけない問題**
1. ❌ raceResults.jsonの直接使用（データフロー混乱の原因）
2. ❌ レースカードが消失する問題（データソース混在）
3. ❌ 各レースの的中結果カードが消える現象
4. ❌ 動的生成システムがJSONデータを上書きする問題
5. ❌ "Unexpected export"エラー（export内での複雑な計算）

---

## 🎊 **本日完了タスク（2025-09-19）**

### ✅ **ダッシュボードポイントシステム完全リニューアル**

#### **1. ポイント配布システム変更**
- **Premium会員**: 50pt → 30pt に減額
- **Standard会員**: 5pt → 10pt に増額
- **Free会員**: 1pt 維持
- **netlify/functions/daily-points.js**: バックエンド更新完了

#### **2. ポイント交換システム完全刷新**
**旧システム（削除）:**
- 100pt: Standard会員1日パス
- 300pt: 特別レポート
- 500pt: Premium会員1日パス

**新システム（AI解析中心）:**
- 1000pt: AI解析による隠れ上昇馬情報
- 2000pt: AI解析による爆発力隠れ馬情報
- 3000pt: 厩舎タイミング予測情報

#### **3. ランクシステム完全削除**
- 現在ランク表示削除
- ランク別特典セクション削除
- 次のランクまでのプログレスバー削除
- ランク関連JavaScript完全除去

#### **4. レイアウト改善**
- **2カラムレイアウト実装**: 会員ステータス（左）+ プラン特典（右）
- **カード幅最適化**: より見やすい配置
- **重複要素削除**: プラン特典カードの重複解消

### 📋 **技術的成果**
- **シンプル化**: 複雑なランクシステムから直感的なポイント制に変更
- **AI焦点**: 競馬予想AI解析を中心とした価値提供に特化
- **レスポンシブ対応**: デスクトップ・モバイル両対応の改善されたレイアウト
- **JavaScript最適化**: 不要なランク関連処理削除でパフォーマンス向上

### 🎨 **デザイン改善**
- **統一感**: 既存のダークテーマ・グラデーションデザインと完全調和
- **視認性**: 重要な情報（ポイント・会員ステータス）の強調表示
- **使いやすさ**: 直感的なポイント交換システム

---

## 🏆 現在のシステム状況（2025-09-19更新）

### ✅ **ダッシュボード改善・有料プラン移行完了** 🎉

#### **💎 新ポイントシステムによる価値向上**
1. **AI中心の価値提供**
   - 隠れ上昇馬情報（1000pt）
   - 爆発力隠れ馬情報（2000pt）
   - 厩舎タイミング予測（3000pt）

2. **シンプルで分かりやすいシステム**
   - 複雑なランクシステム廃止
   - ポイント蓄積 → AI情報交換の直線的フロー
   - ユーザー体験の大幅向上

#### **💳 有料プラン移行による新機能**
1. **Zapier AI Agents利用可能**
   - 自然言語での自動化設定
   - 複雑な条件分岐・判断処理
   - 顧客行動に基づく動的アクション

2. **Netlify Pro高速化**
   - より高速なビルド・デプロイ
   - 高度な分析・パフォーマンス監視
   - 増加する顧客への対応力向上

3. **Airtable Pro拡張**
   - より多くのデータ・ビュー管理
   - 高度なフィルタ・ソート機能
   - 複雑な顧客セグメンテーション

### ✅ **全システム完全動作確認済み・復活防止対策完備** 🎉

1. **完全復活防止システム実装済み**
   - データソース強制保護: `yesterdayResults`を強制使用
   - 自動エラー検出: 間違った使用を自動で検知
   - ファイルレベル保護: 削除済みファイルの復活不可能設計

2. **レースカード消失問題完全解決**
   - admin/results-manager → standard-predictions.astro → index.astroのデータフロー確立
   - 各レースの的中結果カードが消失する問題を根本解決
   - "イタチごっこ"状態の完全終了

3. **エラー修正完了**
   - "Unexpected export"エラー完全修正
   - standard-predictions.astro: HTTP 500 → 200正常動作
   - 回収率表示復旧: 241%正常表示

4. **JSONデータ保護システム実装済み**
   - 動的生成による買い目順序問題の根本対策
   - JSONデータ最優先保護システム実装
   - shared-prediction-logic.jsでのデータ保護強化

### ✅ **技術的成果**
- **安定性**: 修正作業時にレースカード消失リスク0%
- **データ整合性**: 単一データソース（yesterdayResults）による完全統一
- **復活防止**: 自動検証システムによる永続的保護
- **エラー耐性**: export内計算問題の根本解決

---

## 【最重要】レース区分定義（絶対厳守）

### ⚠️ **重要（2025-10-05）**
**無料会員は全レースの予想・分析が閲覧可能（買い目は全レース非表示）**

### ✅ 正しいレース区分（買い目表示権限）
#### 12レース開催時
```
1R-9R:  Premium会員のみ買い目表示
10R:    Standard会員買い目表示
11R:    Standard会員買い目表示
12R:    Standard会員買い目表示
```

#### 11レース開催時
```
1R-8R:  Premium会員のみ買い目表示
9R:     Standard会員買い目表示
10R:    Standard会員買い目表示
11R:    Standard会員買い目表示
```

#### 10レース開催時
```
1R-7R:  Premium会員のみ買い目表示
8R:     Standard会員買い目表示
9R:     Standard会員買い目表示
10R:    Standard会員買い目表示
```

#### 8レース開催時
```
1R-5R:  Premium会員のみ買い目表示
6R:     Standard会員買い目表示
7R:     Standard会員買い目表示（メインレース）★★★
8R:     Standard会員買い目表示
```

### 📋 重要ポイント
- **無料会員**: 全レース予想・分析閲覧可能、**買い目は全レース非表示**
- **Standard会員**: 後半3レース（10R, 11R, 12R等）の買い目表示（**メインレース含む**）
- **Premium会員**: 全レースの買い目表示
- **メインレース**: 最終レースの1つ前（tier: "standard", isMainRace: true）
  - ※tierは"standard"のまま、isMainRaceフラグのみtrue
  - ※Standard会員が後半3レース全ての買い目を見られるため、メインレースも"standard"
  - ※12レース: 11R、10レース: 9R、8レース: 7R がメインレース
  - ※動的計算: `totalRaces - 1` = メインレース番号

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

## 🎯 **次回作業開始時のクリックスタート**

### 📋 **復活防止確認チェックリスト**

#### **1. システム動作確認**
```bash
# 開発サーバー起動
npm run dev

# ページアクセス確認
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/standard-predictions
```

#### **2. データフロー確認**
```bash
# 復活防止ログ確認
# ブラウザコンソールで以下を確認:
# - "🛡️ 復活防止対策: currentResultsはyesterdayResultsと同じ"
# - "🔒 JSONデータ完全使用（動的生成無効）"
```

#### **3. 禁止パターン検出**
```bash
# 復活禁止要素の確認
grep -r "raceResults.json" src/
grep -r "race.status === 'hit'" src/
# 結果: 何も出力されないこと（完全削除済み）
```

### 🚫 **作業時の絶対禁止事項**
1. raceResults.json の復活・再作成
2. currentResults以外のデータソース使用
3. export内でのMath.round()等の複雑な計算
4. レイアウト順序の変更
5. 削除済みファイル・UI要素の復活

---

## 📊 **現在のシステム完成度**
