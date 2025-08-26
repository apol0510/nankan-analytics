/**
 * 配配メール メンバー追加API
 * 新規登録時に自動的にメンバーをグループに追加
 */

import haihaiMail from '../../../lib/haihai-mail.js';

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

        // 配配メールにメンバーを追加
        const result = await haihaiMail.addToGroup(email, plan, userData);

        return new Response(JSON.stringify({
            success: true,
            message: `${email} を ${plan} グループに追加しました`,
            data: result
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('配配メール メンバー追加エラー:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}