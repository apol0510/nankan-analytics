// ユーザー認証関数（メールアドレスでシンプル認証）
const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const request = {
    method: event.httpMethod,
    json: () => JSON.parse(event.body || '{}')
  };
  // CORSヘッダー
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS対応
  if (request.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // POSTメソッドのみ許可
  if (request.method !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('🔍 Event received:', JSON.stringify(event, null, 2));
  console.log('🔍 Force rebuild - current SITE_URL:', process.env.SITE_URL);
    console.log('🔍 Event body:', event.body);
    console.log('🔍 Event httpMethod:', event.httpMethod);
    
    // リクエストボディ取得
    const { email } = JSON.parse(event.body || '{}');
    console.log('🔍 Parsed email:', email);

    if (!email) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    // Airtable設定
    console.log('🔍 Environment check - AIRTABLE_API_KEY exists:', !!process.env.AIRTABLE_API_KEY);
    console.log('🔍 Environment check - AIRTABLE_BASE_ID exists:', !!process.env.AIRTABLE_BASE_ID);
    
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);

    // ユーザー検索
    const records = await base('Customers')
      .select({
        filterByFormula: `{Email} = '${email}'`,
        maxRecords: 1
      })
      .firstPage();

    if (records.length === 0) {
      // 新規ユーザーとして登録
      const newRecord = await base('Customers').create({
        'Email': email,
        'プラン': 'Free',
        'ポイント': 1,
        '最終ポイント付与日': new Date().toISOString().split('T')[0]
      });

      // ウェルカムメール機能は削除済み

      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          isNewUser: true,
          user: {
            email,
            plan: 'free',
            points: 1,
            pointsAdded: 1,
            lastLogin: new Date().toISOString().split('T')[0]
          },
          message: '新規ユーザー登録完了！初回ログインポイント1pt付与'
        }, null, 2)
      };
    }

    // 既存ユーザーの情報取得
    const user = records[0];
    const currentPoints = user.get('ポイント') || 0;
    const currentPlan = user.get('プラン') || 'free';
    const lastLogin = user.get('最終ポイント付与日');
    // 最終プランチェック日フィールドは現在使用しない（Airtableに存在しないため）
    const today = new Date().toISOString().split('T')[0];

    // ログインポイント付与チェック + プラン変更ボーナス
    let pointsAdded = 0;
    let newPoints = currentPoints;
    let updateData = {};
    
    const POINTS_BY_PLAN = {
      'free': 1,
      'Free': 1,
      'standard': 10,
      'Standard': 10,
      'premium': 30,
      'Premium': 30
    };

    // 通常のログインポイント（1日1回）
    if (lastLogin !== today) {
      pointsAdded += POINTS_BY_PLAN[currentPlan] || 1;
      updateData['最終ポイント付与日'] = today;
    }

    // プラン変更ボーナス（現在は無効化 - Airtableフィールド不足のため）
    // TODO: 最終プランチェック日フィールドをAirtableに追加後に有効化
    console.log('📝 プラン変更ボーナス機能は一時無効化中（Airtableフィールド準備中）');

    if (pointsAdded > 0) {
      newPoints = currentPoints + pointsAdded;
      updateData['ポイント'] = newPoints;
      
      // Airtable更新
      await base('Customers').update(user.id, updateData);
    }

    // 🔧 プラン値正規化: 大文字小文字混在問題解決
    const normalizedPlan = normalizePlan(currentPlan);

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        isNewUser: false,
        user: {
          email,
          plan: normalizedPlan,
          points: newPoints,
          pointsAdded,
          lastLogin: today,
          registeredAt: user.get('登録日')
        },
        message: pointsAdded > 0
          ? `ログイン成功！本日のポイント${pointsAdded}pt付与`
          : 'ログイン成功！（本日のポイントは付与済み）'
      }, null, 2)
    };

  } catch (error) {
    console.error('🚨 Auth error:', error);
    console.error('🚨 Error stack:', error.stack);
    console.error('🚨 Event details:', JSON.stringify(event));
    
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        stack: error.stack
      })
    };
  }
}

// 🔧 プラン値正規化関数: Airtableの大文字小文字混在問題解決
function normalizePlan(planValue) {
  if (!planValue) return 'free';

  const planLower = planValue.toString().toLowerCase();

  // 正規化マッピング
  switch (planLower) {
    case 'premium':
    case 'プレミアム':
      return 'premium';
    case 'standard':
    case 'スタンダード':
      return 'standard';
    case 'free':
    case 'フリー':
    case '無料':
      return 'free';
    default:
      console.warn(`⚠️ 未知のプラン値: "${planValue}" -> デフォルト 'free'`);
      return 'free';
  }
}

// ウェルカムメール機能は完全に削除されました