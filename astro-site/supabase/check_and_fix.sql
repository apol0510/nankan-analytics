-- ステップ1: auth.usersテーブルの構造を確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'auth' 
AND table_name = 'users'
LIMIT 10;

-- ステップ2: auth.usersの内容を確認（正しい列名を使用）
SELECT * FROM auth.users LIMIT 1;

-- ステップ3: profilesテーブルの構造を確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles';

-- ステップ4: 既存のプロファイルを確認
SELECT * FROM public.profiles;