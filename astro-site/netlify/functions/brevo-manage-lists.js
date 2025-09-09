// Brevo顧客リスト管理Function
import { 
    getContactLists, 
    createContactList, 
    createOrUpdateContact,
    NANKAN_LISTS 
} from '../../src/lib/brevo-utils.js';

export const handler = async (event, context) => {
    console.log('📋 Brevo顧客リスト管理処理開始');
    
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
        const action = event.queryStringParameters?.action || 'list';
        
        switch (action) {
            case 'list':
                return await handleGetLists(headers);
            
            case 'create':
                return await handleCreateLists(headers);
                
            case 'add-contact':
                return await handleAddContact(event, headers);
                
            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: '無効なアクションです' })
                };
        }
        
    } catch (error) {
        console.error('❌ Brevoリスト管理エラー:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'リスト管理に失敗しました',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};

/**
 * 現在のリスト一覧取得
 */
async function handleGetLists(headers) {
    const lists = await getContactLists();
    
    // NANKAN専用リストを特定
    const nankanLists = lists.lists?.filter(list => 
        Object.values(NANKAN_LISTS).includes(list.name)
    ) || [];
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            message: 'リスト取得成功',
            total: lists.count,
            nankanLists,
            allLists: lists.lists?.slice(0, 10) || [], // 最初の10個のみ表示
            timestamp: new Date().toISOString()
        })
    };
}

/**
 * NANKANアナリティクス専用リスト作成
 */
async function handleCreateLists(headers) {
    const results = [];
    
    // 既存リストをチェック
    const existingLists = await getContactLists();
    const existingNames = existingLists.lists?.map(list => list.name) || [];
    
    // 各プラン用リストを作成
    for (const [key, listName] of Object.entries(NANKAN_LISTS)) {
        if (existingNames.includes(listName)) {
            results.push({
                plan: key,
                name: listName,
                status: 'already_exists',
                message: '既存のリストをスキップ'
            });
            continue;
        }
        
        try {
            const newList = await createContactList(listName);
            results.push({
                plan: key,
                name: listName,
                status: 'created',
                id: newList.id,
                message: 'リスト作成成功'
            });
            console.log(`✅ リスト作成: ${listName} (ID: ${newList.id})`);
        } catch (error) {
            results.push({
                plan: key,
                name: listName,
                status: 'failed',
                error: error.message,
                message: 'リスト作成失敗'
            });
            console.error(`❌ リスト作成失敗: ${listName}`, error);
        }
    }
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            message: 'NANKANアナリティクスリスト作成完了',
            results,
            timestamp: new Date().toISOString()
        })
    };
}

/**
 * 顧客をリストに追加
 */
async function handleAddContact(event, headers) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'POST method required' })
        };
    }
    
    const { email, plan = 'FREE', attributes = {} } = JSON.parse(event.body || '{}');
    
    if (!email) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'メールアドレスが必要です' })
        };
    }
    
    // プラン検証
    const validPlans = Object.keys(NANKAN_LISTS);
    if (!validPlans.includes(plan)) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
                error: '無効なプランです',
                validPlans 
            })
        };
    }
    
    try {
        // 現在のリストを取得してIDを特定
        const lists = await getContactLists();
        const targetListName = NANKAN_LISTS[plan];
        const targetList = lists.lists?.find(list => list.name === targetListName);
        
        if (!targetList) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    error: `リスト「${targetListName}」が見つかりません。先にリストを作成してください。` 
                })
            };
        }
        
        // 顧客をリストに追加
        const contact = await createOrUpdateContact(
            email,
            {
                PLAN: plan,
                REGISTRATION_DATE: new Date().toISOString().split('T')[0],
                ...attributes
            },
            [targetList.id]
        );
        
        console.log(`✅ 顧客追加成功: ${email} → ${targetListName}`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: '顧客をリストに追加しました',
                email,
                plan,
                listName: targetListName,
                listId: targetList.id,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('顧客追加エラー:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: '顧客追加に失敗しました',
                details: error.message
            })
        };
    }
}