// Brevoドメイン認証状況詳細確認Function
export const handler = async (event, context) => {
    console.log('🔍 Brevoドメイン認証状況詳細確認');
    
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
        const apiKey = process.env.BREVO_API_KEY;
        if (!apiKey) {
            throw new Error('BREVO_API_KEY環境変数が設定されていません');
        }
        
        const brevoHeaders = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'api-key': apiKey
        };
        
        // 1. アカウント情報
        const accountResponse = await fetch('https://api.brevo.com/v3/account', {
            headers: brevoHeaders
        });
        const accountData = await accountResponse.json();
        
        // 2. 送信者リスト取得を試行
        let sendersData = null;
        try {
            const sendersResponse = await fetch('https://api.brevo.com/v3/senders', {
                headers: brevoHeaders
            });
            if (sendersResponse.ok) {
                sendersData = await sendersResponse.json();
            }
        } catch (error) {
            console.log('送信者情報取得エラー（無料プランでは制限あり）');
        }
        
        // 3. ドメイン認証状況を試行
        let domainsData = null;
        try {
            const domainsResponse = await fetch('https://api.brevo.com/v3/senders/domains', {
                headers: brevoHeaders
            });
            if (domainsResponse.ok) {
                domainsData = await domainsResponse.json();
            }
        } catch (error) {
            console.log('ドメイン情報取得エラー');
        }
        
        const result = {
            timestamp: new Date().toISOString(),
            account: {
                email: accountData.email,
                plan: accountData.plan,
                company: accountData.companyName
            },
            senders: sendersData || '取得不可（プラン制限の可能性）',
            domains: domainsData || '取得不可（API制限の可能性）',
            current_dns_records: {
                spf: 'v=spf1 include:amazonses.com include:spf.sendinblue.com ~all',
                brevo_code: 'brevo-code:d1f720816ddc41bed5fcc8cded0b6ed4',
                dkim_missing: 'mail._domainkey.keiba.link は未設定'
            },
            recommendations: [
                '1. Brevo管理画面 → Senders & IP → Domains で keiba.link を確認',
                '2. DKIM設定のための追加DNSレコードが表示されているか確認',
                '3. mail._domainkey.keiba.link の CNAME レコードを CloudflareのDNS設定に追加'
            ]
        };
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result, null, 2)
        };
        
    } catch (error) {
        console.error('❌ ドメイン状況確認エラー:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'ドメイン状況確認に失敗',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};