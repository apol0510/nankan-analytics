/**
 * Brevo 連絡先追加API
 * ハイハイメールからの移行対応
 */

import brevo from '../../../lib/brevo.js';

export const prerender = false;

export async function POST({ request }) {
    try {
        const { email, plan = 'free', userData = {} } = await request.json();

        if (!email) {
            return new Response(JSON.stringify({
                success: false,
                error: 'メールアドレスが必要です'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Brevoに連絡先を追加
        const result = await brevo.addContact(email, plan, userData);

        return new Response(JSON.stringify({
            success: true,
            message: `${email} を ${plan} リストに追加しました`,
            data: result,
            migration: 'brevo' // 移行識別子
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Brevo 連絡先追加エラー:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}