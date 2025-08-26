/**
 * 配配メール メルマガ配信API
 */

import haihaiMail from '../../../lib/haihai-mail.js';

export async function POST({ request }) {
    try {
        const { targetGroups, subject, content, contentType = 'html' } = await request.json();

        if (!targetGroups || !targetGroups.length) {
            return new Response(JSON.stringify({
                success: false,
                error: '配信対象グループが選択されていません'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!subject || !content) {
            return new Response(JSON.stringify({
                success: false,
                error: '件名と内容は必須です'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 配配メールでメルマガを配信（下書きとして保存）
        const result = await haihaiMail.sendNewsletter(
            targetGroups,
            subject,
            content,
            contentType === 'html'
        );

        return new Response(JSON.stringify({
            success: true,
            message: 'メルマガの下書きを作成しました',
            data: result
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('メルマガ配信エラー:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}