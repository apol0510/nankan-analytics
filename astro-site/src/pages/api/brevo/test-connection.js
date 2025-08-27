/**
 * Brevo API 接続テスト
 */

import brevo from '../../../lib/brevo.js';

export const prerender = false;

export async function GET({ request }) {
    try {
        const result = await brevo.testConnection();
        
        return new Response(JSON.stringify({
            success: result.success,
            message: result.message,
            account: result.account || null,
            timestamp: new Date().toISOString()
        }), {
            status: result.success ? 200 : 500,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Brevo接続テストエラー:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}