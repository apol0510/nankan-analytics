// Brevo（旧Sendinblue）API統合ユーティリティ
// 南関競馬予想メルマガシステム

/**
 * Brevo API設定
 */
function getBrevoConfig() {
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

/**
 * Brevo API リクエスト共通関数
 */
async function brevoRequest(endpoint, options = {}) {
    const config = getBrevoConfig();
    const url = `${config.baseUrl}${endpoint}`;
    
    const requestOptions = {
        headers: config.headers,
        ...options
    };
    
    console.log(`Brevo API Request: ${options.method || 'GET'} ${endpoint}`);
    
    try {
        const response = await fetch(url, requestOptions);
        const data = await response.json();
        
        if (!response.ok) {
            console.error('Brevo API Error:', {
                status: response.status,
                error: data
            });
            throw new Error(`Brevo API Error: ${response.status} - ${data.message || 'Unknown error'}`);
        }
        
        return data;
    } catch (error) {
        console.error('Brevo Request Error:', error);
        throw error;
    }
}

/**
 * アカウント情報取得
 */
export async function getBrevoAccount() {
    return await brevoRequest('/account');
}

/**
 * 連絡先リスト一覧取得
 */
export async function getContactLists() {
    return await brevoRequest('/contacts/lists');
}

/**
 * 連絡先リスト作成
 */
export async function createContactList(name, folderId = null) {
    return await brevoRequest('/contacts/lists', {
        method: 'POST',
        body: JSON.stringify({
            name,
            folderId
        })
    });
}

/**
 * 連絡先追加・更新
 */
export async function createOrUpdateContact(email, attributes = {}, listIds = []) {
    return await brevoRequest('/contacts', {
        method: 'POST',
        body: JSON.stringify({
            email,
            attributes,
            listIds,
            updateEnabled: true
        })
    });
}

/**
 * メルマガキャンペーン作成
 */
export async function createEmailCampaign(campaignData) {
    const {
        name,
        subject,
        htmlContent,
        sender,
        recipients,
        scheduledAt = null
    } = campaignData;
    
    const campaign = {
        name,
        subject,
        htmlContent,
        sender: {
            name: sender.name || 'NANKANアナリティクス',
            email: sender.email || process.env.FROM_EMAIL || 'noreply@nankan-analytics.keiba.link'
        },
        recipients,
        type: 'classic'
    };
    
    if (scheduledAt) {
        campaign.scheduledAt = scheduledAt;
    }
    
    return await brevoRequest('/emailCampaigns', {
        method: 'POST',
        body: JSON.stringify(campaign)
    });
}

/**
 * メルマガキャンペーン送信
 */
export async function sendEmailCampaign(campaignId) {
    return await brevoRequest(`/emailCampaigns/${campaignId}/sendNow`, {
        method: 'POST'
    });
}

/**
 * 南関競馬予想メルマガ専用関数
 */
export async function sendHorseRacingNewsletter({ 
    predictions, 
    raceDate, 
    listIds = [],
    subject = null 
}) {
    const defaultSubject = `🏇 ${raceDate} 南関競馬AI予想 - NANKANアナリティクス`;
    
    // メルマガHTML作成
    const htmlContent = createHorseRacingEmailTemplate({
        predictions,
        raceDate
    });
    
    // キャンペーン作成
    const campaign = await createEmailCampaign({
        name: `南関競馬予想_${raceDate}`,
        subject: subject || defaultSubject,
        htmlContent,
        sender: {
            name: 'NANKANアナリティクス',
            email: process.env.FROM_EMAIL || 'noreply@nankan-analytics.keiba.link'
        },
        recipients: {
            listIds
        }
    });
    
    console.log('南関競馬メルマガキャンペーン作成:', campaign);
    
    return campaign;
}

/**
 * 南関競馬予想メールテンプレート作成
 */
function createHorseRacingEmailTemplate({ predictions, raceDate }) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>南関競馬AI予想 - ${raceDate}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            background: white;
            margin: 20px;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
        }
        .header .date {
            margin-top: 10px;
            font-size: 18px;
            opacity: 0.9;
        }
        .content {
            padding: 30px 20px;
        }
        .race-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .race-title {
            font-size: 18px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 15px;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 5px;
        }
        .prediction-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .prediction-item {
            display: flex;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .prediction-item:last-child {
            border-bottom: none;
        }
        .rank {
            font-size: 24px;
            font-weight: bold;
            margin-right: 15px;
            min-width: 40px;
        }
        .rank.first { color: #ef4444; }
        .rank.second { color: #3b82f6; }
        .rank.third { color: #10b981; }
        .horse-info {
            flex: 1;
        }
        .horse-name {
            font-weight: bold;
            font-size: 16px;
            color: #1e293b;
        }
        .confidence {
            background: #3b82f6;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            margin-left: 10px;
        }
        .footer {
            background: #f1f5f9;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            color: white !important;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
        }
        .unsubscribe {
            font-size: 12px;
            color: #6b7280;
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 南関競馬AI予想</h1>
            <div class="date">${raceDate}</div>
        </div>
        
        <div class="content">
            <p>こんにちは！</p>
            <p>本日の南関競馬AI予想をお届けします。機械学習アルゴリズムが分析した、最新の予想データをご活用ください。</p>
            
            ${predictions.map((race, index) => `
                <div class="race-card">
                    <div class="race-title">${race.raceNumber}R - ${race.raceName}</div>
                    <ul class="prediction-list">
                        ${race.predictions.slice(0, 3).map((pred, i) => `
                            <li class="prediction-item">
                                <div class="rank ${['first', 'second', 'third'][i]}">${['◎', '○', '▲'][i]}</div>
                                <div class="horse-info">
                                    <div class="horse-name">${pred.horseName}</div>
                                </div>
                                <div class="confidence">${pred.confidence}%</div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `).join('')}
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://nankan-analytics.keiba.link/predictions" class="cta-button">
                    詳細予想を見る
                </a>
            </div>
            
            <p><strong>⚠️ 注意事項</strong></p>
            <ul>
                <li>予想は参考情報です。馬券購入は自己責任で行ってください</li>
                <li>ギャンブルは適度に楽しみましょう</li>
                <li>20歳未満の方は馬券を購入できません</li>
            </ul>
        </div>
        
        <div class="footer">
            <p><strong>NANKANアナリティクス</strong><br>
            AI・機械学習で勝つ。南関競馬の次世代予想プラットフォーム</p>
            
            <div class="unsubscribe">
                <a href="{UNSUBSCRIBE_LINK}">配信停止</a> | 
                <a href="https://nankan-analytics.keiba.link">ウェブサイト</a>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * プラン別顧客リスト管理
 */
export const NANKAN_LISTS = {
    FREE: 'Free会員',
    STANDARD: 'Standard会員', 
    PREMIUM: 'Premium会員',
    ALL: '全会員'
};

/**
 * テスト関数 - Brevo接続確認
 */
export async function testBrevoConnection() {
    try {
        const account = await getBrevoAccount();
        console.log('✅ Brevo接続成功:', {
            email: account.email,
            firstName: account.firstName,
            lastName: account.lastName,
            companyName: account.companyName
        });
        return { success: true, account };
    } catch (error) {
        console.error('❌ Brevo接続失敗:', error);
        return { success: false, error: error.message };
    }
}