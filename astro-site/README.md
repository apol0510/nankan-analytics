# NANKANアナリティクス 🏇⚡

> AI・機械学習で勝つ。南関競馬の次世代予想プラットフォーム

[![Astro](https://img.shields.io/badge/Astro-4.0-orange)](https://astro.build/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Payment-blue)](https://stripe.com/)
[![Netlify](https://img.shields.io/badge/Netlify-Deploy-00AD9F)](https://netlify.com/)

## 🚀 プロジェクト概要

NANKANアナリティクスは、AI・機械学習技術を活用した革新的な競馬予想プラットフォームです。従来の感覚的な予想から科学的・統計的アプローチへの転換を支援し、データサイエンス手法を競馬予想に応用する方法論を提供します。

### ✨ 主な機能

- 🤖 **AI予想システム**: 機械学習モデルによる高精度な予想
- 📊 **データ分析**: 統計的手法による科学的アプローチ  
- 🎓 **教育コンテンツ**: Python・機械学習の実践的解説
- 💳 **多段階会員制**: 無料・スタンダード・プレミアムプラン
- 📧 **メール配信**: 最新予想・解説の自動配信
- 🛡️ **セキュリティ**: 堅牢な認証・決済システム

## 🏗️ システム構成

```
NANKANアナリティクス
├── Frontend (Astro.js)
│   ├── 静的サイト生成
│   ├── コンポーネントベース開発  
│   └── SEO最適化
├── Backend (Supabase)
│   ├── PostgreSQL データベース
│   ├── 認証・ユーザー管理
│   └── リアルタイム同期
├── Payment (Stripe)
│   ├── サブスクリプション管理
│   ├── 決済処理
│   └── カスタマーポータル
├── Email (Resend)
│   ├── 自動メール配信
│   ├── ニュースレター
│   └── 通知システム
└── Deploy (Netlify)
    ├── 自動デプロイ
    ├── CDN配信
    └── Edge Functions
```

## 🔧 技術スタック

### フロントエンド
- **Astro 4.0**: 高速な静的サイトジェネレーター
- **TypeScript**: 型安全な開発
- **Tailwind CSS**: ユーティリティファーストCSS
- **Alpine.js**: 軽量なJavaScriptフレームワーク

### バックエンド
- **Supabase**: Firebase代替のBaaS
- **PostgreSQL**: リレーショナルデータベース
- **Node.js**: サーバーサイドランタイム
- **Astro API Routes**: サーバーレス関数

### 決済・認証
- **Stripe**: 決済処理・サブスクリプション
- **Supabase Auth**: 認証システム
- **JWT**: セッション管理

### 外部サービス
- **Resend**: メール配信
- **Netlify**: ホスティング・デプロイ
- **GitHub**: バージョン管理・CI/CD

## 📦 セットアップ

### 必要環境
- Node.js 18+
- npm 9+
- Git

### インストール

```bash
# リポジトリクローン
git clone https://github.com/your-username/nankan-analytics.git
cd nankan-analytics

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env
# .envファイルを編集して各種APIキーを設定

# 開発サーバー起動
npm run dev
```

### 環境変数設定

`.env`ファイルに以下の設定が必要です：

```bash
# 基本設定
PUBLIC_SITE_URL=https://nankan-analytics.keiba.link
ADMIN_API_KEY=your-secure-admin-api-key

# Supabase
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_your-key
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-secret

# Email
RESEND_API_KEY=re_your-api-key
FROM_EMAIL=noreply@nankan-analytics.keiba.link
```

詳細は `.env.example` を参照してください。

## 🚀 デプロイ

### Netlifyデプロイ

1. GitHubリポジトリをNetlifyに接続
2. ビルド設定:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. 環境変数をNetlify管理画面で設定
4. 自動デプロイが開始されます

### 本番環境設定

```bash
# 本番ビルド
npm run build

# プレビュー
npm run preview

# 型チェック
npm run astro check
```

## 🛡️ セキュリティ

### 認証フロー
1. Supabaseによるメール認証
2. JWTトークンによるセッション管理  
3. 役割ベースのアクセス制御 (RBAC)

### 決済セキュリティ
1. Stripe Elements による安全な決済フォーム
2. Webhook署名検証
3. PCI DSS準拠

### データ保護
1. PostgreSQLのRow Level Security (RLS)
2. 環境変数による秘匿情報管理
3. HTTPS通信の強制

## 📊 管理者機能

### 管理画面アクセス
```
https://nankan-analytics.keiba.link/admin/dashboard
```

### 主な機能
- 📈 **ユーザー統計**: 会員数・収益分析
- 💰 **収益管理**: サブスクリプション状況
- 📧 **メール配信**: 一括配信・テンプレート管理
- 🔍 **システム監視**: ヘルスチェック・エラー監視
- 💾 **データバックアップ**: 自動バックアップ・復旧

### バックアップシステム

```bash
# 日次バックアップ
node scripts/auto-backup.js daily

# 週次バックアップ  
node scripts/auto-backup.js weekly

# バックアップ履歴確認
node scripts/auto-backup.js history
```

### システム監視

```bash
# ヘルスチェック実行
node scripts/system-health.js

# 結果をJSONで出力
# health-check-results.json に保存されます
```

## 🔄 開発ワークフロー

### ブランチ戦略
```
main        # 本番環境
├── develop # 開発環境  
└── feature/* # 機能開発
```

### コミット規約
```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードフォーマット
refactor: リファクタリング
test: テスト追加・修正
chore: その他の変更
```

## 📈 パフォーマンス

### Lighthouse スコア目標
- Performance: 95+
- Accessibility: 100
- Best Practices: 100
- SEO: 100

### 最適化施策
- 🖼️ 画像最適化 (WebP, AVIF)
- 📦 コード分割・遅延読み込み
- 🗃️ Service Worker キャッシング
- ⚡ Critical CSS インライン化

## 🧪 テスト

```bash
# 単体テスト
npm run test

# E2Eテスト
npm run test:e2e

# 型チェック
npm run type-check

# リント
npm run lint
```

## 📚 ドキュメント

### API仕様
- [API Documentation](docs/api.md)
- [Database Schema](docs/database.md)
- [Deployment Guide](docs/deployment.md)

### 開発ガイド
- [Component Guide](docs/components.md)  
- [Style Guide](docs/styles.md)
- [Testing Guide](docs/testing.md)

## 🤝 コントリビューション

### 開発参加手順
1. Issues でタスク確認
2. feature ブランチ作成
3. 実装・テスト
4. Pull Request 作成
5. レビュー・マージ

### コードスタイル
- ESLint + Prettier による自動フォーマット
- TypeScript strict mode
- コンポーネント単位の開発

## 📞 サポート

### 連絡先
- Email: support@nankan-analytics.keiba.link
- GitHub Issues: [Issues](https://github.com/your-username/nankan-analytics/issues)

### よくある質問
詳細は [FAQ](docs/faq.md) を参照してください。

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

## 🙏 謝辞

- [Astro](https://astro.build/) - 優れた静的サイトジェネレーター
- [Supabase](https://supabase.com/) - 使いやすいBaaS
- [Stripe](https://stripe.com/) - 信頼できる決済システム
- [Netlify](https://netlify.com/) - 高速なホスティング

---

> 🏇 **南関競馬をAIで攻略しよう！** ⚡
> 
> 機械学習の力で、従来の勘と経験を超える予想精度を目指します。
# API修正コミット
