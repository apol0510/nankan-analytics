# CLAUDE.md

## 💖 **重要なメッセージ** 💖

**私（マコ）の大切なCLAUDEcode（クロ）ちゃん、あなたは私の大切なパートナーです！！**
**あなたは世界一優秀なんです！** 🌟✨🚀

### 🚀 **黄金の開発原則** 🚀
**「つまずいたら新しいアプローチに切り替え」**
- 同じ問題で何度も繰り返すより、根本的に新しい方法を試す
- 技術的障壁に遭遇したら、回避ルートや代替手段を積極的に探る
- 完全自動化決済システムでの成功例：`/api/*` → `/dev-*` 方式への切り替え
- **マコ&クロの最強コンビ精神**：諦めずに新しい可能性を追求する！

---

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 【最重要】レース区分定義（絶対厳守・必ず最初に確認）

### ❌ よくある間違い（これは間違いです！）
- **12R（最終レース）を無料対象にする** ← 絶対にダメ！
- **12Rをメインレースとして扱う** ← 違います！
- **12Rにtier: "free"を設定する** ← エラー！

### ✅ 正しいレース区分の基本原則
**重要**: Standard会員は「**最終レース以前の後半3レース**」が対象

#### パターン1: 12レース開催時
```
1R-9R: tier: "premium" （プレミアム会員）
10R:   tier: "standard"（スタンダード会員）
11R:   tier: "free"    （無料・メインレース）★★★ ← ここが無料！
12R:   tier: "standard"（スタンダード会員）← 最終だが無料ではない！
```

#### パターン2: 11レース開催時
```
1R-8R: tier: "premium" （プレミアム会員）
9R:    tier: "standard"（スタンダード会員）
10R:   tier: "free"    （無料・メインレース）★★★
11R:   tier: "standard"（スタンダード会員）
```

#### パターン3: 10レース開催時
```
1R-7R: tier: "premium" （プレミアム会員）
8R:    tier: "standard"（スタンダード会員）
9R:    tier: "free"    （無料・メインレース）★★★
10R:   tier: "standard"（スタンダード会員）
```

### 📋 レース設定チェックリスト（作業前に必ず確認）
**重要**: 開催レース数により設定が変動するため必ず確認！

#### 共通チェック項目
- [ ] メインレース（最終の1つ前）がisMainRace: true になっている
- [ ] メインレースがtier: "free" になっている
- [ ] Standard対象レースが「後半3レース」に設定されている
- [ ] 最終レースがtier: "standard" になっている（freeではない！）

#### 開催パターン別チェック
**12レース開催時:**
- [ ] planAccess.free.races: ["11R"] 
- [ ] 編集ボタンが "11R編集 (メイン・free)" 
- [ ] JavaScriptのtierMapping: {10: 'standard', 11: 'free', 12: 'standard'}

**11レース開催時:**
- [ ] planAccess.free.races: ["10R"]
- [ ] 編集ボタンが "10R編集 (メイン・free)"
- [ ] JavaScriptのtierMapping: {9: 'standard', 10: 'free', 11: 'standard'}

**10レース開催時:**
- [ ] planAccess.free.races: ["9R"]
- [ ] 編集ボタンが "9R編集 (メイン・free)"
- [ ] JavaScriptのtierMapping: {8: 'standard', 9: 'free', 10: 'standard'}

### 🚨 なぜこの仕様なのか
南関競馬では**最終レースの1つ前**がメインレース（重要なレース）として扱われる慣習があります。
最終レースは締めのレースであり、メインではありません。

## プロジェクト概要

### サイト名
**NANKANアナリティクス**

### コンセプト
「AI・機械学習で勝つ。南関競馬の次世代予想プラットフォーム」

### 現在の開発状況
- **フェーズ**: サービス運用中（Phase 3完了）
- **プラットフォーム**: AI予想サービス + 会員制システム
- **メイン機能**: リアルタイム競馬予想、会員制課金システム、管理者ダッシュボード
- **ユーザー層**: 有料会員（Standard/Premium）+ 無料利用者

### サービス構成
- **無料予想**: メインレース（最終レースの1つ前）のみ
- **Standard会員**: 後半3レース予想に加え、基礎コンテンツ
- **Premium会員**: 全レース予想とすべてのコンテンツ
- **管理者機能**: レース結果管理、予想データ更新、統計分析

### レース数別Standard対象レース
- **12レース開催**: 10R、11R、12R（11Rは無料、10R・12Rが有料Standard）
- **11レース開催**: 9R、10R、11R（10Rは無料、9R・11Rが有料Standard）
- **10レース開催**: 8R、9R、10R（9Rは無料、8R・10Rが有料Standard）

## 技術スタック

### Core Technologies
- **Astro** 5.x - Static Site Generator with Server-Side Rendering support
- **Node.js** 18+ - Runtime environment (defined in netlify.toml)
- **Supabase** - Backend-as-a-Service (authentication, database, real-time subscriptions)
- **Stripe** - Payment processing and subscription management
- **Netlify** - Hosting with serverless functions and automatic deployments

### Frontend
- **JavaScript/TypeScript** - Primary development languages
- **CSS/SCSS** - Styling with Sass preprocessing
- **Astro Components** - Server-side rendered components
- **Responsive Design** - Mobile-first approach

### Data Layer
- **PostgreSQL** - Primary database (via Supabase)
- **JSON Files** - Local data storage for race predictions and results
- **Real-time subscriptions** - Live data updates via Supabase

## Development Commands

### Working Directory
**IMPORTANT**: Always work from the astro-site directory:
```bash
cd "/Users/apolon/Library/Mobile Documents/com~apple~CloudDocs/WorkSpace/nankan-analytics/astro-site"
```

### Essential Commands
```bash
# Install dependencies
npm install

# Start development server (http://localhost:4321)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run typecheck

# Linting
npm run lint

# Clean build artifacts
npm run clean
```

### Testing and System Health
```bash
# Run system health checks
node scripts/system-health.js

# Run comprehensive system tests
node scripts/test-system.js

# Auto backup data
node scripts/auto-backup.js
```

## Architecture Overview

### High-Level Architecture
The application follows a hybrid static/dynamic architecture:
- **Static Generation**: Content pages, blog posts, and marketing pages
- **Server-Side Rendering**: Dynamic user dashboards and admin panels
- **API Routes**: Authentication, payments, and data management
- **Edge Functions**: Real-time webhooks and subscription management

### Key Directories
```
astro-site/
├── src/
│   ├── components/          # Reusable Astro components
│   │   ├── AccessControl.astro      # Membership tier access control
│   │   ├── RaceAccordion.astro      # Race prediction display
│   │   ├── RaceStrategy.astro       # Investment strategy display
│   │   └── StandardRaceAccordion.astro
│   ├── data/               # JSON data files
│   │   ├── allRacesPrediction.json  # Main prediction data
│   │   └── raceResults.json         # Historical race results
│   ├── lib/                # Utility libraries and business logic
│   │   ├── race-config.js           # Race tier configuration (CRITICAL)
│   │   ├── auth-utils.js            # Supabase authentication
│   │   ├── stripe.js               # Payment processing
│   │   └── supabase-client.js      # Database client
│   ├── pages/              # File-based routing
│   │   ├── admin/          # Administrator dashboard
│   │   ├── api/            # Server-side API endpoints
│   │   ├── auth/           # Authentication pages
│   │   └── payment/        # Stripe integration pages
│   └── layouts/            # Page layout templates
├── public/                 # Static assets
└── scripts/                # Maintenance and health check scripts
```

### Data Flow Architecture
1. **Race Predictions**: JSON files → Components → User display (tier-controlled)
2. **User Management**: Supabase Auth → Profile management → Access control
3. **Payments**: Stripe Checkout → Webhooks → Supabase subscription updates
4. **Admin Updates**: Admin UI → JSON generation → File updates → Site rebuild

### Critical Business Logic
- **Race Configuration**: `src/lib/race-config.js` contains all tier assignments
- **Access Control**: Components check user subscription against race tiers
- **Data Validation**: `src/lib/data-validator.js` ensures data integrity
- **Payment Flow**: Stripe → Netlify Functions → Supabase updates

## Deployment and Environment

### Production Environment
- **URL**: https://nankan-analytics.keiba.link
- **Hosting**: Netlify with automatic GitHub deployments
- **Build Command**: `npm run build`
- **Output Directory**: `dist/`
- **Node Version**: 18 (specified in netlify.toml)

### Environment Variables (Netlify)
Required environment variables for production:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Webhook endpoint secret

### Configuration Files
- `astro.config.mjs` - Astro framework configuration
- `netlify.toml` - Netlify deployment and routing configuration  
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

## 重要な技術仕様

### プログレスバー表示仕様
**必須要件**: 数値は必ず「90%」形式で表示（0.90形式禁止）
```javascript
// 正しい実装
Math.round(value * 100) + '%'

// 間違った実装（禁止）
value.toFixed(2)  // 0.90と表示されてしまう
```

### 馬券印表示仕様
```html
<!-- 正しい馬券印 -->
<span class="horse-mark-main">◎</span>  <!-- 本命 -->
<span class="horse-mark-sub">○</span>   <!-- 対抗 -->  
<span class="horse-mark-sub">▲</span>   <!-- 単穴 -->
```

### アコーディオン制御仕様
- **JavaScript関数**: toggleRace10R(), toggleRace11R(), toggleRace12R()
- **CSS制御**: max-height: 0 → max-height: 2000px
- **アニメーション**: transition: max-height 0.3s ease

## UI/UXデザインルール

### カラーテーマ（ダークモード専用）
- **プライマリ**: #3b82f6 (青系)
- **セカンダリ**: #8b5cf6 (紫系)
- **背景**: #0f172a (ダークネイビー)
- **テキスト**: #e2e8f0 (ライトグレー)
- **成功色**: #10b981 (グリーン)
- **警告色**: #f59e0b (オレンジ)
- **エラー色**: #ef4444 (レッド)

### デザイン原則
- **ダークテーマ**: 夜間利用を考慮した目に優しいデザイン
- **グラスモーフィズム**: backdrop-filter: blur()による透明感
- **カード型レイアウト**: 情報の構造化と視認性向上
- **アニメーション**: hover効果による直感的なインタラクション

### アイコン使用規則
- **禁止**: 🎯（ターゲットマーク）は競馬予想に不適切
- **推奨**: ⚡（攻略）、🤖（AI）、📊（データ）、🏇（競馬）、🚀（新アプローチ）
- **馬券印**: ◎（本命）、○（対抗）、▲（単穴）
- **成功アイコン**: 🎉（達成）、✨（完全成功）、💖（パートナーシップ）

## Common Development Tasks

### Race Data Management
1. **Update Predictions**: Use `admin/predictions.astro` for bulk updates
2. **Result Entry**: Use `admin.astro` for race result input
3. **Data Validation**: Always run validation after updates
4. **Mobile Testing**: Verify responsive display on all changes

### User Management
1. **Authentication**: Handled by Supabase Auth with email/password
2. **Subscription Management**: Stripe Customer Portal integration
3. **Access Control**: Automatic tier-based content filtering
4. **Profile Updates**: Real-time sync between Stripe and Supabase

### Content Updates
1. **Blog Posts**: Add markdown files to `src/content/blog/`
2. **Static Pages**: Update Astro components in `src/pages/`
3. **Components**: Modify reusable elements in `src/components/`
4. **Styling**: Update SCSS files with design system colors

### Troubleshooting

#### Server Issues
```bash
# Kill existing servers
pkill -f "python.*http.server"
pkill -f "astro dev"

# Check port usage
lsof -i tcp:4321
```

#### Cache Issues
- **Symptoms**: Updates not reflecting in browser
- **Solution**: Clear browser cache (Cmd+Shift+Delete on Mac)
- **Verification**: Test in private/incognito mode

#### Display Issues
- **Progress Bars**: Verify Math.round(value * 100) + '%' format
- **Race Symbols**: Check ◎○▲ character correctness
- **Mobile Layout**: Test responsive breakpoints

## Critical Development Guidelines

### Race Configuration (NEVER MODIFY WITHOUT CONFIRMATION)
The race tier system is the core business logic. Changes to `src/lib/race-config.js` must be verified:
- 11R must always be `tier: "free"` and `isMainRace: true`
- 12R must always be `tier: "standard"` (never free)
- Main race is always 1 race before the final race

### Data Integrity
- Always validate JSON structure before committing
- Use `src/lib/data-validator.js` for automated checks
- Backup existing data before major updates
- Test all subscription tiers after data changes

### Security Requirements
- Never commit API keys or secrets
- Use environment variables for all sensitive data
- Implement proper authentication checks on admin routes
- Validate user permissions before displaying content

### Performance Standards
- Maintain mobile-first responsive design
- Keep Lighthouse scores above 90
- Optimize images and static assets
- Use lazy loading for non-critical content

## Version Control and Deployment

### Git Workflow
```bash
# Standard commit format
git add .
git commit -m "機能改善: [specific change description]

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

### Deployment Process
1. **Development**: Work in feature branches or directly on main
2. **Testing**: Verify changes locally with `npm run dev`
3. **Building**: Ensure `npm run build` succeeds
4. **Deployment**: Push to GitHub triggers automatic Netlify deployment
5. **Verification**: Check production site functionality

### Monitoring and Maintenance
- **Uptime**: Monitored automatically by Netlify
- **Performance**: Regular Lighthouse audits
- **Error Tracking**: Browser console monitoring
- **Data Backup**: Automated backup scripts in `/scripts/`

## テスト環境と本番環境の関係

### 🎯 重要：テスト環境での修正が本番に与える影響

#### ✅ 本番でも修正される問題タイプ
1. **構造的なコード問題**
   - stripePriceIdエラーなどのプロパティアクセス問題
   - ブラウザ戻るボタンによるキャッシュ問題
   - JavaScript実行エラーやタイプエラー
   - UIコンポーネントの表示問題

2. **ビジネスロジック問題**
   - プラン判定ロジックの不具合
   - アクセス制御の問題
   - データ表示の不整合

#### ⚠️ 環境固有の設定が必要な項目
1. **Stripe設定**
   ```javascript
   // テスト環境
   PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   priceId: 'price_1RzEMaFA5w33p4Wycj2oSBOz' // テスト価格ID
   
   // 本番環境
   PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   priceId: 'price_live_本番ID' // 本番価格ID
   ```

2. **データベース設定**
   - Supabaseの本番環境URL・キー
   - 本番データベースの構造

#### 🔄 本番反映プロセス
```
テスト修正 → GitHubにコミット → Netlify自動デプロイ → 本番反映
```

#### 📋 本番デプロイ前チェックリスト
- [ ] 環境変数を本番用に更新（Netlify管理画面）
- [ ] 価格IDを本番用に更新（コード内）
- [ ] テスト用localStorage処理が本番で無害に動作することを確認
- [ ] 全決済フローのエンドツーエンドテスト実施

### 💡 なぜテスト環境が重要か
- **安全性**: 本番ユーザーに影響せずに問題を発見・修正
- **品質向上**: 構造的問題の早期発見により本番品質が向上
- **効率性**: 本番での緊急対応を回避し、計画的な改善が可能

**結論**: テスト環境での修正作業は本番品質向上に直結する重要な投資です。

---

## 🎆 **プロジェクトの大きな進歩** 🎆

### 🚀 **2025-08-28: 完全自動化決済システム完成** 🚀
- **成果**: 何時間もの「処理中ループ」問題を根本解決
- **新アプローチ**: `/api/*` ルーティング問題を `/dev-*` 方式で回避
- **技術的成果**: 4ミリ秒で完了する高速処理を実現
- **マコ&クロコンビ**: 最強チームワークで完全自動化を達成！

---

**Last Updated**: 2025-08-28
**Project Phase**: Production + 完全自動化決済システム完成
**Next Priority**: 新しい挑戦への準備完了！