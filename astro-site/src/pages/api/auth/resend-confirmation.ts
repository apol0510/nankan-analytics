// メール確認再送信API
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL!,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export const POST: APIRoute = async ({ request }) => {
    try {
        const { email } = await request.json();
        
        if (!email) {
            return new Response(JSON.stringify({ 
                error: 'メールアドレスが必要です。' 
            }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // メール形式チェック
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return new Response(JSON.stringify({ 
                error: '有効なメールアドレスを入力してください。' 
            }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('[resend-confirmation] Resending email to:', email);

        // Supabaseで確認メール再送信
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email,
            options: {
                emailRedirectTo: `${import.meta.env.SITE_URL || 'https://nankan-analytics.keiba.link'}/auth/login?message=confirmed`
            }
        });

        if (error) {
            console.error('[resend-confirmation] Supabase error:', error);
            
            if (error.message.includes('rate limit')) {
                return new Response(JSON.stringify({ 
                    error: '再送信の頻度が高すぎます。しばらく待ってから再試行してください。' 
                }), { 
                    status: 429, 
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            return new Response(JSON.stringify({ 
                error: '確認メールの送信に失敗しました。しばらく待ってから再試行してください。' 
            }), { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('[resend-confirmation] Email resent successfully');

        return new Response(JSON.stringify({ 
            success: true,
            message: '確認メールを再送信しました。メールボックスをご確認ください。' 
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('[resend-confirmation] Unexpected error:', error);
        
        return new Response(JSON.stringify({ 
            error: '予期しないエラーが発生しました。' 
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' }
        });
    }
};