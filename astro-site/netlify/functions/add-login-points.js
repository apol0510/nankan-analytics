// ログインポイント付与関数（1日1回制限付き）
import Airtable from 'airtable';

// プラン別のポイント設定
const POINTS_BY_PLAN = {
  'free': 1,
  'Free': 1,
  'standard': 10,
  'Standard': 10,
  'premium': 50,
  'Premium': 50
};

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
      // 新規ユーザーの場合は作成
      const newRecord = await base('Customers').create({
        'Email': email,
        'プラン': 'Free',
        'ポイント': 1,
        '最終ポイント付与日': new Date().toISOString().split('T')[0]  // フィールド名修正
      });

      return new Response(
        JSON.stringify({
          success: true,
          email,
          points: 1,
          pointsAdded: 1,
          plan: 'free',
          message: '新規ユーザー作成・初回ログインポイント付与'
        }, null, 2),
        { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // 既存ユーザーの処理
    const user = records[0];
    const currentPoints = user.get('ポイント') || 0;
    const plan = user.get('プラン') || 'free';
    const lastLogin = user.get('最終ポイント付与日');  // フィールド名修正
    const today = new Date().toISOString().split('T')[0];

    // 本日既にログイン済みかチェック
    if (lastLogin === today) {
      return new Response(
        JSON.stringify({
          success: false,
          email,
          points: currentPoints,
          pointsAdded: 0,
          plan,
          message: '本日のログインポイントは既に付与済みです'
        }, null, 2),
        { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // ポイント付与
    const pointsToAdd = POINTS_BY_PLAN[plan] || 1;
    const newPoints = currentPoints + pointsToAdd;

    // Airtable更新
    await base('Customers').update(user.id, {
      'ポイント': newPoints,
      '最終ポイント付与日': today  // フィールド名修正
    });

    // ポイント履歴を記録（PointHistoryテーブルがある場合）
    try {
      await base('PointHistory').create({
        'Email': email,
        '日付': today,
        'タイプ': 'ログインポイント',
        'ポイント': pointsToAdd,
        '残高': newPoints,
        'メモ': `${plan}会員ログインポイント`
      });
    } catch (historyError) {
      // PointHistoryテーブルがない場合はスキップ
      console.log('PointHistory table not found, skipping history record');
    }

    return new Response(
      JSON.stringify({
        success: true,
        email,
        points: newPoints,
        pointsAdded: pointsToAdd,
        plan,
        message: `ログインポイント${pointsToAdd}pt付与しました！`
      }, null, 2),
      { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Login points error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }
}