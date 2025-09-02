-- ===============================================
-- NANKANアナリティクス Supabase データベース設定
-- ===============================================

-- プロフィールテーブル作成
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade,
  email text,
  display_name text,
  subscription_status text default 'inactive' check (subscription_status in ('active', 'inactive', 'canceled', 'past_due')),
  subscription_plan text check (subscription_plan in ('standard', 'premium')),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_start_date timestamp with time zone,
  subscription_end_date timestamp with time zone,
  trial_end_date timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  primary key (id)
);

-- Row Level Security (RLS) を有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- プロフィールテーブルのRLSポリシー
-- ユーザーは自分のプロフィールのみアクセス可能
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- サインアップ時に自動でプロフィール作成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'display_name', new.email));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーの作成
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 更新時刻の自動更新トリガー
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ===============================================
-- 会員限定コンテンツ管理テーブル
-- ===============================================

-- 予想コンテンツテーブル
CREATE TABLE IF NOT EXISTS public.prediction_content (
  id uuid default gen_random_uuid() primary key,
  race_date date not null,
  track_name text not null,
  race_number text not null,
  race_name text,
  content_type text default 'premium' check (content_type in ('free', 'premium')),
  required_plan text check (required_plan in ('standard', 'premium')),
  prediction_data jsonb not null,
  is_published boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 予想コンテンツのRLS
ALTER TABLE public.prediction_content ENABLE ROW LEVEL SECURITY;

-- 無料コンテンツは全員閲覧可能
CREATE POLICY "Anyone can view free content" ON public.prediction_content
  FOR SELECT USING (content_type = 'free' AND is_published = true);

-- 有料コンテンツは有効な会員のみ閲覧可能
CREATE POLICY "Members can view premium content" ON public.prediction_content
  FOR SELECT USING (
    content_type = 'premium' 
    AND is_published = true
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND subscription_status = 'active'
      AND (
        required_plan IS NULL 
        OR (required_plan = 'standard' AND subscription_plan IN ('standard', 'premium'))
        OR (required_plan = 'premium' AND subscription_plan = 'premium')
      )
      AND (subscription_end_date IS NULL OR subscription_end_date > now())
    )
  );

-- 更新時刻の自動更新
CREATE OR REPLACE TRIGGER on_prediction_content_updated
  BEFORE UPDATE ON public.prediction_content
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ===============================================
-- インデックスの作成（パフォーマンス向上）
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_prediction_content_date ON public.prediction_content(race_date);
CREATE INDEX IF NOT EXISTS idx_prediction_content_type ON public.prediction_content(content_type);
CREATE INDEX IF NOT EXISTS idx_prediction_content_published ON public.prediction_content(is_published);

-- 設定完了の確認用ビュー
CREATE OR REPLACE VIEW public.setup_status AS
SELECT 
  'profiles' as table_name,
  COUNT(*) as row_count
FROM public.profiles
UNION ALL
SELECT 
  'prediction_content' as table_name,
  COUNT(*) as row_count
FROM public.prediction_content;