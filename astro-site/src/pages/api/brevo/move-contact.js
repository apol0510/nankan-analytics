/**
 * Brevo 連絡先移動API
 * Stripe会員プラン変更時の自動リスト移動
 */

import brevo from '../../../lib/brevo.js';

export const prerender = false;

export async function POST({ request }) {
    try {
        const { email, newPlan, oldPlan } = await request.json();

        if (!email || !newPlan) {
            return new Response(JSON.stringify({
                success: false,
                error: 'メールアドレスと新しいプランが必要です'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Brevoでリストを移動
        const result = await brevo.moveContact(email, newPlan, oldPlan);

        return new Response(JSON.stringify({
            success: true,
            message: `${email} を ${oldPlan || '不明'} から ${newPlan} リストに移動しました`,
            data: result,
            migration: 'brevo'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Brevo 連絡先移動エラー:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}