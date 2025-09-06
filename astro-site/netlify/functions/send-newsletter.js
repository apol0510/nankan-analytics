// メルマガ送信Function（南関競馬予想配信）
import { 
    sendHorseRacingNewsletter,
    getContactLists,
    NANKAN_LISTS 
} from '../../src/lib/brevo-utils.js';

export const handler = async (event, context) => {
    console.log('📧 メルマガ送信処理開始');
    
    // CORSヘッダー設定
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    
    // POSTリクエストのみ許可
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'POST method required' })
        };
    }
    
    try {
        const { 
            raceDate, 
            predictions, 
            targetPlans = ['ALL'],
            subject = null,
            testMode = false 
        } = JSON.parse(event.body || '{}');
        
        // 必須パラメータチェック
        if (!raceDate || !predictions || !Array.isArray(predictions)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: '必須パラメータが不足しています',
                    required: ['raceDate', 'predictions'] 
                })
            };
        }
        
        // テストモード（実際には送信しない）
        if (testMode) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'テストモード: メルマガ作成のみ実行',
                    raceDate,
                    predictionsCount: predictions.length,
                    targetPlans,
                    htmlPreview: '南関競馬予想メルマガHTMLが生成されました',
                    timestamp: new Date().toISOString()
                })
            };
        }
        
        // 対象リスト特定
        const lists = await getContactLists();
        const targetListIds = [];
        
        for (const plan of targetPlans) {
            if (plan === 'ALL') {
                // 全会員の場合は、Free/Standard/Premium全て
                const allPlans = ['FREE', 'STANDARD', 'PREMIUM'];
                for (const p of allPlans) {
                    const listName = NANKAN_LISTS[p];
                    const list = lists.lists?.find(l => l.name === listName);
                    if (list) targetListIds.push(list.id);
                }
            } else {
                const listName = NANKAN_LISTS[plan];
                const list = lists.lists?.find(l => l.name === listName);
                if (list) {
                    targetListIds.push(list.id);
                } else {
                    console.warn(`リスト「${listName}」が見つかりません`);
                }
            }
        }
        
        if (targetListIds.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    error: '送信対象のリストが見つかりません',
                    targetPlans,
                    availableLists: lists.lists?.map(l => l.name) || []
                })
            };
        }
        
        // 南関競馬予想メルマガ送信
        const campaign = await sendHorseRacingNewsletter({
            predictions,
            raceDate,
            listIds: targetListIds,
            subject
        });
        
        console.log(`✅ メルマガキャンペーン作成成功: ${campaign.id}`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: '南関競馬予想メルマガを作成しました',
                campaignId: campaign.id,
                campaignName: campaign.name,
                raceDate,
                predictionsCount: predictions.length,
                targetListIds,
                targetPlans,
                timestamp: new Date().toISOString(),
                note: 'キャンペーンは作成済みです。送信するには管理画面から実行してください。'
            })
        };
        
    } catch (error) {
        console.error('❌ メルマガ送信エラー:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'メルマガ送信に失敗しました',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};

/**
 * サンプル予想データ生成（テスト用）
 */
export function generateSamplePredictions(raceDate) {
    return [
        {
            raceNumber: '11',
            raceName: 'メインレース',
            predictions: [
                { horseName: 'サンプルホース1', confidence: 85 },
                { horseName: 'サンプルホース2', confidence: 72 },
                { horseName: 'サンプルホース3', confidence: 68 }
            ]
        },
        {
            raceNumber: '12',
            raceName: 'ファイナルレース',
            predictions: [
                { horseName: 'テストホース1', confidence: 78 },
                { horseName: 'テストホース2', confidence: 65 },
                { horseName: 'テストホース3', confidence: 61 }
            ]
        }
    ];
}