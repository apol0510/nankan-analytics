// 読み取り専用テスト版（権限確認用）
import Airtable from 'airtable';

export const handler = async (event, context) => {
  console.log('読み取り専用テスト開始');
  
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '環境変数が未設定です' })
    };
  }
  
  try {
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);
    
    // 読み取りのみテスト
    const records = await base('Customers').select().firstPage();
    
    console.log(`${records.length}件のデータを取得`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        success: true,
        message: "読み取りテスト成功",
        timestamp: new Date().toISOString(),
        count: records.length,
        data: records.map(record => ({
          id: record.id,
          email: record.get('Email'),
          name: record.get('氏名'),
          plan: record.get('プラン'),
          points: record.get('ポイント'),
          rank: record.get('ランク')
        }))
      }, null, 2)
    };
    
  } catch (error) {
    console.error('エラー:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        details: error.statusCode ? `HTTP ${error.statusCode}` : 'Unknown error'
      })
    };
  }
};