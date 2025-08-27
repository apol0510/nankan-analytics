/**
 * Brevo メルマガ配信API
 */

import brevo from '../../../lib/brevo.js';

export const prerender = false;

export async function POST({ request }) {
    try {
        const { targetPlans, subject, htmlContent, textContent, sendNow = false } = await request.json();

        if (!targetPlans || !targetPlans.length) {
            return new Response(JSON.stringify({
                success: false,
                error: '配信対象プランが選択されていません'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!subject || !htmlContent) {
            return new Response(JSON.stringify({
                success: false,
                error: '件名と内容は必須です'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // キャンペーンを作成（下書きとして）
        const result = await brevo.sendNewsletter(
            targetPlans,
            subject,
            htmlContent,
            textContent
        );

        let sendResult = null;
        if (sendNow && result.id) {
            // すぐに送信する場合
            try {
                sendResult = await brevo.sendCampaign(result.id);
            } catch (sendError) {
                console.warn('即時送信エラー（キャンペーンは作成済み）:', sendError);
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: sendNow ? 'メルマガを送信しました' : 'メルマガの下書きを作成しました',
            data: {
                campaign: result,
                sendResult: sendResult
            },
            provider: 'brevo'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Brevo メルマガ配信エラー:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}