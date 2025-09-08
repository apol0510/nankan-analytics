// ユーザー認証関数（メールアドレスでシンプル認証）
import Airtable from 'airtable';

export default async function handler(request, context) {
  // CORSヘッダー
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS対応
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // POSTメソッドのみ許可
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // リクエストボディ取得
    const { email } = await request.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // Airtable設定
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

      return new Response(
        JSON.stringify({
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
        }, null, 2),
        { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // 既存ユーザーの情報取得
    const user = records[0];
    const currentPoints = user.get('ポイント') || 0;
    const plan = user.get('プラン') || 'free';
    const lastLogin = user.get('最終ポイント付与日');
    const today = new Date().toISOString().split('T')[0];

    // ログインポイント付与チェック
    let pointsAdded = 0;
    let newPoints = currentPoints;
    
    if (lastLogin !== today) {
      // 本日初ログイン - ポイント付与
      const POINTS_BY_PLAN = {
        'free': 1,
        'Free': 1,
        'standard': 10,
        'Standard': 10,
        'premium': 50,
        'Premium': 50
      };
      
      pointsAdded = POINTS_BY_PLAN[plan] || 1;
      newPoints = currentPoints + pointsAdded;

      // Airtable更新
      await base('Customers').update(user.id, {
        'ポイント': newPoints,
        '最終ポイント付与日': today
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        isNewUser: false,
        user: {
          email,
          plan,
          points: newPoints,
          pointsAdded,
          lastLogin: today,
          registeredAt: user.get('登録日')
        },
        message: pointsAdded > 0 
          ? `ログイン成功！本日のポイント${pointsAdded}pt付与` 
          : 'ログイン成功！（本日のポイントは付与済み）'
      }, null, 2),
      { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auth error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }
}