/**
 * 配配メール 統計情報取得API
 */

import haihaiMail from '../../../lib/haihai-mail.js';

export async function GET({ request }) {
    try {
        // 各グループの顧客数を取得
        const results = await Promise.all([
            haihaiMail.getCustomersByGroup('free').catch(() => ({ customers: [] })),
            haihaiMail.getCustomersByGroup('standard').catch(() => ({ customers: [] })),
            haihaiMail.getCustomersByGroup('premium').catch(() => ({ customers: [] }))
        ]);

        const stats = {
            free: results[0]?.customers?.length || 0,
            standard: results[1]?.customers?.length || 0,
            premium: results[2]?.customers?.length || 0,
            total: (results[0]?.customers?.length || 0) + 
                   (results[1]?.customers?.length || 0) + 
                   (results[2]?.customers?.length || 0)
        };

        return new Response(JSON.stringify({
            success: true,
            data: stats
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('統計情報取得エラー:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}