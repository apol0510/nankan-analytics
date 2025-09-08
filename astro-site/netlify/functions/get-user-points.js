// Airtableからユーザーポイントを取得する関数（ESModule形式）
import Airtable from 'airtable';

export default async function handler(request, context) {
  // CORSヘッダー
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // OPTIONS対応
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // GETメソッドのみ許可
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // URLからemailパラメータ取得
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email parameter is required' }),
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
      return new Response(
        JSON.stringify({ 
          email,
          points: 0,
          plan: 'free',
          message: 'User not found, returning default values'
        }),
        { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // ユーザーデータ取得
    const user = records[0];
    const points = user.get('ポイント') || 0;
    const plan = user.get('プラン') || 'free';
    const lastUpdated = user.get('最終ポイント付与日') || null;

    return new Response(
      JSON.stringify({
        email,
        points,
        plan,
        lastUpdated,
        message: 'Success'
      }, null, 2),
      { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Airtable API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }
}