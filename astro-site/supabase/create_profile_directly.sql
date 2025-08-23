-- 特定のユーザーのプロファイルを作成

-- ステップ1: プロファイルを作成（既に存在する場合はスキップ）
INSERT INTO public.profiles (
    id, 
    display_name,
    created_at,
    updated_at
)
VALUES (
    'efc360dc-af11-4575-a1ad-d7969fba29a7',
    'ユーザー',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ステップ2: 作成されたプロファイルを確認
SELECT * FROM public.profiles 
WHERE id = 'efc360dc-af11-4575-a1ad-d7969fba29a7';

-- ステップ3: すべてのユーザーとプロファイルの状態を確認
SELECT 
    u.id,
    u.email,
    p.display_name,
    p.subscription_status,
    p.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;