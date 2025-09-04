// マジックリンク検証Function
import Airtable from 'airtable';

export const handler = async (event, context) => {
  console.log('マジックリンク検証処理開始');
  
  // CORSヘッダー設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }
  
  try {
    const { token, email } = JSON.parse(event.body || '{}');
    
    if (!token || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'トークンとメールアドレスが必要です' })
      };
    }
    
    // Airtable接続
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);
    
    // 顧客とトークン確認
    const records = await base('Customers').select({
      filterByFormula: `AND({Email} = "${email}", {認証トークン} = "${token}")`
    }).firstPage();
    
    if (records.length === 0) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: '無効なトークンです' })
      };
    }
    
    const customer = records[0];
    // TODO: 有効期限チェックは後で実装
    // const tokenExpiry = customer.get('トークン有効期限');
    // 
    // // トークン有効期限チェック  
    // if (!tokenExpiry || new Date(tokenExpiry) < new Date()) {
    //   return {
    //     statusCode: 401,
    //     headers,
    //     body: JSON.stringify({ error: 'トークンの有効期限が切れています' })
    //   };
    // }
    
    // 顧客データ取得
    const customerData = {
      email: customer.get('Email'),
      name: customer.get('氏名') || 'お客様',
      plan: customer.get('プラン') || 'Free',
      points: customer.get('ポイント') || 0,
      registrationDate: customer.get('登録日'),
      rank: calculateRank(customer.get('ポイント') || 0),
      hasClaimedReward: customer.get('特典申請済み') || false
    };
    
    // トークンクリア（使用済みにする）
    await base('Customers').update(customer.id, {
      '認証トークン': null
      // TODO: '最終ログイン': new Date().toISOString() フィールド追加後に有効化
    });
    
    console.log(`✅ ログイン成功: ${email}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '認証成功',
        customer: customerData
      })
    };
    
  } catch (error) {
    console.error('マジックリンク検証エラー:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '一時的にアクセスできません',
        details: error.message
      })
    };
  }
};

// ポイントからランク計算
function calculateRank(points) {
  if (points >= 10000) return 'ダイヤモンド';
  if (points >= 5000) return 'プラチナ';
  if (points >= 2000) return 'ゴールド';
  if (points >= 1000) return 'シルバー';
  if (points >= 500) return 'ブロンズ';
  return 'ビギナー';
}