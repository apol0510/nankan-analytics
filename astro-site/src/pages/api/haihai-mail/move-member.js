/**
 * 配配メール メンバー移動API
 * プラン変更時にメンバーを適切なグループに移動
 */

import haihaiMail from '../../../lib/haihai-mail.js';

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

        // 配配メールでメンバーのグループを移動
        const result = await haihaiMail.moveToGroup(email, newPlan, oldPlan);

        return new Response(JSON.stringify({
            success: true,
            message: `${email} を ${newPlan} グループに移動しました`,
            data: result
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('配配メール メンバー移動エラー:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}