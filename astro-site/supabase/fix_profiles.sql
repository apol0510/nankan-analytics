-- 既存ユーザーのプロファイルを修正するSQL
-- SupabaseダッシュボードのSQL Editorで実行してください

-- 1. 現在のauth.usersテーブルのユーザーを確認
SELECT id, email, created_at FROM auth.users;

-- 2. 現在のprofilesテーブルの内容を確認
SELECT * FROM public.profiles;

-- 3. auth.usersに存在してprofilesに存在しないユーザーのプロファイルを作成
INSERT INTO public.profiles (id, display_name, created_at)
SELECT 
    u.id,
    COALESCE(
        u.raw_user_meta_data->>'display_name',
        split_part(u.email, '@', 1)
    ) as display_name,
    u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 4. 作成されたプロファイルを確認
SELECT 
    p.*,
    u.email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;

-- 5. RLSポリシーが正しく設定されているか確認
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- もしRLSポリシーが存在しない場合は再作成
DO $$
BEGIN
    -- 既存のポリシーを削除
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
    
    -- ポリシーを再作成
    CREATE POLICY "Users can view own profile" ON public.profiles
        FOR SELECT USING (auth.uid() = id);
    
    CREATE POLICY "Users can update own profile" ON public.profiles
        FOR UPDATE USING (auth.uid() = id);
    
    CREATE POLICY "Users can insert own profile" ON public.profiles
        FOR INSERT WITH CHECK (auth.uid() = id);
    
    RAISE NOTICE 'RLSポリシーを再作成しました';
END $$;