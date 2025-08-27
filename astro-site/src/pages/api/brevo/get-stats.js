/**
 * Brevo 統計情報取得API
 */

import brevo from '../../../lib/brevo.js';

export const prerender = false;

export async function GET({ request }) {
    try {
        const stats = await brevo.getStats();

        return new Response(JSON.stringify({
            success: true,
            data: stats,
            provider: 'brevo',
            timestamp: new Date().toISOString()
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Brevo統計情報取得エラー:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}