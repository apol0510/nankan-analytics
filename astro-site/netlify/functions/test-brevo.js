// Brevo接続テスト用Function
import { testBrevoConnection, getContactLists } from '../../src/lib/brevo-utils.js';

export const handler = async (event, context) => {
    console.log('🔧 Brevo接続テスト開始');
    
    // CORSヘッダー設定
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // OPTIONSリクエスト（CORS preflight）
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    try {
        // 1. アカウント情報取得テスト
        const connectionTest = await testBrevoConnection();
        
        // 2. 連絡先リスト取得テスト
        let listsTest = null;
        try {
            const lists = await getContactLists();
            listsTest = {
                success: true,
                count: lists.count,
                lists: lists.lists?.slice(0, 5) || [] // 最初の5つのリストのみ
            };
        } catch (error) {
            listsTest = {
                success: false,
                error: error.message
            };
        }
        
        // 結果レスポンス
        const result = {
            message: 'Brevo API テスト完了',
            timestamp: new Date().toISOString(),
            tests: {
                connection: connectionTest,
                lists: listsTest
            },
            environment: {
                hasApiKey: !!process.env.BREVO_API_KEY,
                apiKeyPreview: process.env.BREVO_API_KEY ? 
                    process.env.BREVO_API_KEY.substring(0, 15) + '...' : 'なし'
            }
        };
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result, null, 2)
        };
        
    } catch (error) {
        console.error('❌ Brevoテストエラー:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Brevoテストに失敗しました',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};