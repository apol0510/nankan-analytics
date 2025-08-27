/**
 * Brevo 一括インポートAPI
 * ハイハイメールからの大量データ移行用
 */

import brevo from '../../../lib/brevo.js';

export const prerender = false;

export async function POST({ request }) {
    try {
        const { contacts, plan, dryRun = true } = await request.json();

        if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: '有効な連絡先配列が必要です'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!plan) {
            return new Response(JSON.stringify({
                success: false,
                error: 'プラン指定が必要です (free/standard/premium)'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 14,000件のデータを500件ずつに分割して処理
        const batchSize = 500;
        const batches = [];
        
        for (let i = 0; i < contacts.length; i += batchSize) {
            batches.push(contacts.slice(i, i + batchSize));
        }

        let processedCount = 0;
        let errorCount = 0;
        const errors = [];

        if (dryRun) {
            // ドライランモード：データ検証のみ
            return new Response(JSON.stringify({
                success: true,
                message: 'ドライラン完了：データは実際には処理されていません',
                data: {
                    totalContacts: contacts.length,
                    totalBatches: batches.length,
                    batchSize: batchSize,
                    plan: plan,
                    preview: contacts.slice(0, 5) // 最初の5件をプレビュー
                }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 実際のインポート処理
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            console.log(`バッチ ${batchIndex + 1}/${batches.length} 処理中...`);

            for (const contact of batch) {
                try {
                    await brevo.addContact(contact.email, plan, {
                        firstName: contact.firstName || '',
                        lastName: contact.lastName || '',
                        registrationDate: contact.registrationDate || new Date().toISOString().split('T')[0]
                    });
                    processedCount++;
                } catch (error) {
                    errorCount++;
                    errors.push({
                        email: contact.email,
                        error: error.message
                    });
                    console.error(`連絡先追加エラー (${contact.email}):`, error);
                }
            }

            // バッチ間で少し待機（API制限対策）
            if (batchIndex < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: `一括インポート完了: ${processedCount}件成功、${errorCount}件エラー`,
            data: {
                totalContacts: contacts.length,
                processedCount: processedCount,
                errorCount: errorCount,
                successRate: `${((processedCount / contacts.length) * 100).toFixed(1)}%`,
                errors: errors.slice(0, 10), // エラーの最初の10件
                plan: plan
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('一括インポートエラー:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}