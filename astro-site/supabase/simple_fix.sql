-- これをSupabaseのSQL Editorにコピペして実行してください

-- ステップ1: 現在登録されているユーザーを確認
SELECT id, email FROM auth.users;

-- ステップ2: すべてのユーザーにプロファイルを作成
INSERT INTO public.profiles (id, display_name)
SELECT 
    id,
    split_part(email, '@', 1) as display_name
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ステップ3: 作成されたプロファイルを確認
SELECT * FROM public.profiles;