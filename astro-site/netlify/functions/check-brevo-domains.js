// Brevoドメイン設定確認Function
import { brevoRequest } from '../../src/lib/brevo-utils.js';

async function getBrevoConfig() {
    const apiKey = process.env.BREVO_API_KEY;
    
    if (!apiKey) {
        throw new Error('BREVO_API_KEY環境変数が設定されていません');
    }
    
    return {
        apiKey,
        baseUrl: 'https://api.brevo.com/v3',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'api-key': apiKey
        }
    };
}

async function brevoRequest(endpoint, options = {}) {
    const config = await getBrevoConfig();
    const url = `${config.baseUrl}${endpoint}`;
    
    const requestOptions = {
        headers: config.headers,
        ...options
    };
    
    try {
        const response = await fetch(url, requestOptions);
        const data = await response.json();
        
        if (!response.ok) {
            console.error('Brevo API Error:', data);
            throw new Error(`Brevo API Error: ${response.status} - ${data.message || 'Unknown error'}`);
        }
        
        return data;
    } catch (error) {
        console.error('Brevo Request Error:', error);
        throw error;
    }
}

export const handler = async (event, context) => {
    console.log('🔍 Brevoドメイン設定確認開始');
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    try {
        // 1. アカウント情報取得
        const account = await brevoRequest('/account');
        
        // 2. 送信者リスト取得
        let senders = null;
        try {
            senders = await brevoRequest('/senders');
        } catch (error) {
            console.log('送信者リスト取得エラー（無料プランでは制限あり）:', error.message);
        }
        
        // 3. ドメイン認証状況確認
        let domains = null;
        try {
            domains = await brevoRequest('/senders/domains');
        } catch (error) {
            console.log('ドメイン設定取得エラー:', error.message);
        }
        
        const result = {
            message: 'Brevoドメイン設定確認完了',
            timestamp: new Date().toISOString(),
            account: {
                email: account.email,
                plan: account.plan,
                companyName: account.companyName
            },
            senders: senders || '取得不可（無料プランの制限）',
            domains: domains || '取得不可',
            currentFromEmail: process.env.FROM_EMAIL,
            recommendation: 'nankan-analytics@keiba.link を送信者として使用するには、keiba.linkドメインの認証が必要です'
        };
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result, null, 2)
        };
        
    } catch (error) {
        console.error('❌ ドメイン確認エラー:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'ドメイン確認に失敗しました',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};