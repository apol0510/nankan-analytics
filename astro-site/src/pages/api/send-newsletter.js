import { createClient } from '@supabase/supabase-js';
import { emailService } from '../../lib/email.js';

const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

export const prerender = false;

export async function POST({ request }) {
    try {
        const { weeklyData, targetPlan = 'all' } = await request.json();

        // 認証チェック（管理者権限が必要）
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.includes(import.meta.env.ADMIN_API_KEY)) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 対象ユーザーを取得
        let query = supabase
            .from('profiles')
            .select(`
                id,
                user_email:users!inner(email),
                subscription_plan,
                subscription_status
            `)
            .eq('newsletter_enabled', true);

        // プラン別フィルタ
        if (targetPlan !== 'all') {
            query = query.eq('subscription_plan', targetPlan);
        }

        const { data: profiles, error } = await query;

        if (error) {
            throw error;
        }

        // メール送信処理
        const emailResults = [];
        const batchSize = 10; // 一度に送信する数を制限

        for (let i = 0; i < profiles.length; i += batchSize) {
            const batch = profiles.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (profile) => {
                try {
                    const result = await emailService.sendNewsletter(
                        profile.user_email.email,
                        weeklyData
                    );
                    
                    return {
                        email: profile.user_email.email,
                        success: result.success,
                        messageId: result.messageId,
                        error: result.error
                    };
                } catch (error) {
                    return {
                        email: profile.user_email.email,
                        success: false,
                        error: error.message
                    };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            emailResults.push(...batchResults);

            // レート制限対策
            if (i + batchSize < profiles.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // 送信結果をログに記録
        const successCount = emailResults.filter(r => r.success).length;
        const failureCount = emailResults.filter(r => !r.success).length;

        // データベースにメルマガ送信記録を保存
        await supabase.from('newsletter_logs').insert({
            target_plan: targetPlan,
            total_sent: profiles.length,
            success_count: successCount,
            failure_count: failureCount,
            weekly_data: weeklyData,
            sent_at: new Date().toISOString()
        });

        return new Response(
            JSON.stringify({
                success: true,
                totalSent: profiles.length,
                successCount,
                failureCount,
                results: emailResults
            }),
            { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('Newsletter sending error:', error);
        return new Response(
            JSON.stringify({ 
                error: 'Failed to send newsletter',
                details: error.message 
            }),
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// 管理者用メルマガ送信のスケジュール機能
export async function GET({ url }) {
    const searchParams = new URL(url).searchParams;
    const cronSecret = searchParams.get('secret');

    // Cron用の秘密キーをチェック
    if (cronSecret !== import.meta.env.CRON_SECRET) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        // デフォルトの週次データを生成
        const weeklyData = {
            results: generateWeeklyResults(),
            profits: generateWeeklyProfits()
        };

        // 全ユーザーにメルマガ送信
        const response = await fetch(`${import.meta.env.PUBLIC_SITE_URL}/api/send-newsletter`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.ADMIN_API_KEY}`
            },
            body: JSON.stringify({
                weeklyData,
                targetPlan: 'all'
            })
        });

        const result = await response.json();

        return new Response(
            JSON.stringify({
                message: 'Weekly newsletter sent',
                ...result
            }),
            { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// ダミーデータ生成関数
function generateWeeklyResults() {
    const hitRate = Math.floor(Math.random() * 10) + 85; // 85-95%
    const returnRate = Math.floor(Math.random() * 50) + 150; // 150-200%
    
    return `今週の的中率: ${hitRate}%、回収率: ${returnRate}%`;
}

function generateWeeklyProfits() {
    const investment = 10000;
    const returnRate = Math.floor(Math.random() * 50) + 150;
    const profit = Math.floor(investment * returnRate / 100);
    
    return `推奨投資額${investment.toLocaleString()}円で${profit.toLocaleString()}円のリターンを達成`;
}