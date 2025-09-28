# Google Search Console セットアップガイド

## 📋 完了済み

✅ **robots.txt** - `/public/robots.txt`
- サイトマップの場所を指定
- 管理画面をクロール対象外に設定
- 主要ページを明示的に許可

✅ **sitemap.xml** - `/public/sitemap.xml`
- 全47ページを登録
- 優先度・更新頻度を設定
- 大井競馬場コース攻略記事10記事を含む

✅ **BaseLayout.astro更新**
- Google Search Console検証用メタタグ準備
- Google Analytics設定準備
- canonical URL設定済み

## 🚀 Google Search Console 登録手順

### 1. サイトの登録
1. [Google Search Console](https://search.google.com/search-console/) にアクセス
2. 「プロパティを追加」をクリック
3. 「ドメイン」を選択し `nankan-analytics.keiba.link` を入力
4. または「URLプレフィックス」で `https://nankan-analytics.keiba.link` を入力

### 2. 所有権の確認
#### 方法1: HTMLファイルアップロード（推奨）
1. Search Consoleからダウンロードしたファイルを `/public/` フォルダに配置
2. Netlifyにデプロイ後、確認ボタンをクリック

#### 方法2: メタタグ
1. Search Consoleから提供されるメタタグをコピー
2. `/src/layouts/BaseLayout.astro` の34行目を以下に置き換え：
```html
<meta name="google-site-verification" content="PROVIDED_VERIFICATION_CODE" />
```

### 3. サイトマップの送信
1. Search Console左メニューから「サイトマップ」を選択
2. 「新しいサイトマップの追加」に以下を入力：
```
sitemap.xml
```
3. 「送信」をクリック

### 4. Google Analytics 4 設定（オプション）
1. [Google Analytics](https://analytics.google.com/) でプロパティを作成
2. 測定IDを取得（GA_MEASUREMENT_ID）
3. `/src/layouts/BaseLayout.astro` の36-45行目のコメントアウトを解除し、IDを置き換え

## 📊 登録されるページ（全47ページ）

### 🏆 高優先度（Priority: 0.8-1.0）
- メインページ（/）
- 予想ページ（/free-prediction, /standard-predictions, /premium-predictions）
- 料金ページ（/pricing）
- ブログトップ（/blog）
- コース分析トップ（/course）

### 📝 中優先度（Priority: 0.6-0.7）
- 大井競馬場コース攻略記事（10記事）
- 各競馬場コース分析ページ（4ページ）
- テクノロジー・初心者向けページ

### 📄 低優先度（Priority: 0.3-0.5）
- 初心者レッスンページ（7記事）
- 法的ページ（プライバシーポリシー、利用規約等）

## ⚡ クロール最適化設定

### robots.txt設定
```
User-agent: *
Allow: /

# 管理画面をブロック
Disallow: /admin/
Disallow: /.netlify/

# サイトマップの場所
Sitemap: https://nankan-analytics.keiba.link/sitemap.xml
```

### 更新頻度
- **daily**: 予想ページ（毎日更新）
- **weekly**: 料金・コース分析（週次更新）
- **monthly**: ブログ記事・技術ページ
- **yearly**: 法的ページ

## 🔍 確認事項

### デプロイ後の確認
1. `https://nankan-analytics.keiba.link/robots.txt` にアクセス可能
2. `https://nankan-analytics.keiba.link/sitemap.xml` にアクセス可能
3. 各ページのcanonical URLが正しく設定されている

### Search Console確認項目
- [ ] 所有権確認完了
- [ ] サイトマップ送信完了
- [ ] インデックス登録開始
- [ ] 検索パフォーマンス監視開始

## 🎯 SEO最適化のメリット

✅ **検索エンジン対応完了**
- Google、Bingでの検索結果表示
- 競馬関連キーワードでの上位表示狙い

✅ **サイト認知度向上**
- 「大井競馬 攻略」「南関競馬 予想」等での流入増加
- ブログ記事経由の自然流入獲得

✅ **分析・改善基盤**
- Search Consoleでの検索クエリ分析
- ページパフォーマンス監視

---

**📅 最終更新**: 2025-09-27
**🎯 次のステップ**: Google Search Console登録 → インデックス登録確認 → 検索パフォーマンス分析