# データベースマイグレーションガイド

## 🚨 重要：手動実行が必要

Supabase Service Role Keyの認証問題により、マイグレーションは手動で実行する必要があります。

## 手順

### 1. Supabase SQL エディターにアクセス
1. https://app.supabase.com/ にアクセス
2. プロジェクト `qysycsrhaatudnksbpqe` を選択
3. 左メニューから「SQL Editor」をクリック

### 2. マイグレーションSQL実行
以下のファイルの内容をコピー＆ペーストして実行：
```
supabase/migrations/003_payment_system_upgrade.sql
```

### 3. 実行確認
以下のクエリで各テーブルが正しく作成されていることを確認：

```sql
-- ENUMタイプ確認
SELECT t.typname, e.enumlabel 
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE t.typname IN ('subscription_plan', 'subscription_status');

-- テーブル確認
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'subscriptions', 'stripe_events')
ORDER BY table_name, ordinal_position;
```

## 期待される結果

### ENUMタイプ
- `subscription_plan`: free, standard, premium
- `subscription_status`: incomplete, incomplete_expired, trialing, active, past_due, canceled, unpaid, paused

### 新規テーブル
- `subscriptions`: Stripeサブスクリプションの詳細情報
- `stripe_events`: Webhook冪等性のためのイベント記録

### profiles テーブル追加カラム
- `stripe_customer_id`: Stripe顧客ID
- `active_plan`: 現在のプラン（ENUM）
- `active_status`: 現在のステータス（ENUM）  
- `active_subscription_id`: アクティブなサブスクリプションID
- `subscription_current_period_end`: サブスクリプション終了日

## トラブルシューティング

### エラー: "type already exists"
```sql
-- 既存のタイプを削除してから再実行
DROP TYPE IF EXISTS subscription_plan CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
```

### エラー: "column already exists"
```sql
-- 既存のカラムを確認
SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles';
```

## 完了後の作業

1. **Webhook テスト**: 新しいWebhook処理が正常に動作することを確認
2. **RLSポリシー設定**: 新しいテーブルに適切なRow Level Securityを設定
3. **デプロイ**: 本番環境への反映

---

**注意**: このマイグレーションは本番データに影響するため、必ずバックアップを取得してから実行してください。