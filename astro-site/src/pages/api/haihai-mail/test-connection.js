/**
 * 配配メール 接続テストAPI
 */

import haihaiMail from '../../../lib/haihai-mail.js';

export async function GET({ request }) {
    try {
        const result = await haihaiMail.testConnection();

        return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 500,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('接続テストエラー:', error);
        
        return new Response(JSON.stringify({
            success: false,
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}