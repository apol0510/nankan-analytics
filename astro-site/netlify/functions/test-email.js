import { sendContactEmail } from '../../src/lib/resend-utils.js';

export const handler = async (event, context) => {
    // CORS設定
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // OPTIONSリクエスト対応
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        console.log('📧 テストメール送信開始');
        
        // テストメール送信
        const result = await sendContactEmail({
            name: 'テストユーザー',
            email: 'nankan.analytics@gmail.com',
            subject: '返信機能テスト - NANKANアナリティクス',
            message: `このメールは返信機能のテストです。

送信者アドレス: nankan-analytics@keiba.link
返信先: 同じアドレス
送信日時: ${new Date().toLocaleString('ja-JP')}

このメールに返信して、正常にGmailに届くか確認してください。

---
NANKANアナリティクス システムテスト`
        });

        if (result.success) {
            console.log('✅ テストメール送信成功');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'テストメール送信成功！返信機能を確認してください。',
                    result
                })
            };
        } else {
            console.error('❌ テストメール送信失敗:', result);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'テストメール送信に失敗しました',
                    result
                })
            };
        }

    } catch (error) {
        console.error('テストメール送信エラー:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message,
                details: 'サーバーエラーが発生しました'
            })
        };
    }
};