import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

export const prerender = false;

export async function GET({ request }) {
    try {
        // 管理者権限チェック
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.includes(import.meta.env.ADMIN_API_KEY)) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // システム各種ヘルスチェック
        const healthChecks = await Promise.allSettled([
            checkDatabase(),
            checkStripe(),
            checkEmailService(),
            checkStorage()
        ]);

        const results = {
            database: getResultStatus(healthChecks[0]),
            stripe: getResultStatus(healthChecks[1]),
            email: getResultStatus(healthChecks[2]),
            storage: getResultStatus(healthChecks[3]),
            timestamp: new Date().toISOString()
        };

        return new Response(
            JSON.stringify(results),
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

// データベース接続確認
async function checkDatabase() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('count', { count: 'exact', head: true });

        if (error) throw error;
        return { status: 'ok', message: 'Database connection successful' };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

// Stripe API確認
async function checkStripe() {
    try {
        await stripe.accounts.retrieve();
        return { status: 'ok', message: 'Stripe API accessible' };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

// メール配信サービス確認
async function checkEmailService() {
    try {
        // Resend API確認（実際のメール送信はしない）
        if (!import.meta.env.RESEND_API_KEY) {
            return { status: 'warning', message: 'Email service not configured' };
        }
        
        const response = await fetch('https://api.resend.com/domains', {
            headers: {
                'Authorization': `Bearer ${import.meta.env.RESEND_API_KEY}`,
            },
        });

        if (!response.ok) {
            throw new Error('Email service API error');
        }

        return { status: 'ok', message: 'Email service accessible' };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
}

// ストレージ確認
async function checkStorage() {
    try {
        const { data, error } = await supabase.storage
            .from('public')
            .list('', { limit: 1 });

        if (error) throw error;
        return { status: 'ok', message: 'Storage accessible' };
    } catch (error) {
        return { status: 'warning', message: 'Storage check failed: ' + error.message };
    }
}

// 結果のステータス取得
function getResultStatus(result) {
    if (result.status === 'fulfilled') {
        return result.value;
    } else {
        return { 
            status: 'error', 
            message: result.reason?.message || 'Unknown error' 
        };
    }
}