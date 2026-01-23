// デバッグ用：1週間前通知テスト（詳細ログ付き）

const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  console.log('🔍 デバッグ開始');

  try {
    // 環境変数確認
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

    if (!AIRTABLE_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'AIRTABLE_API_KEY が設定されていません' })
      };
    }

    if (!AIRTABLE_BASE_ID) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'AIRTABLE_BASE_ID が設定されていません' })
      };
    }

    console.log('✅ 環境変数確認OK');

    // Airtable設定
    const base = new Airtable({ apiKey: AIRTABLE_API_KEY })
      .base(AIRTABLE_BASE_ID);

    // 7日後の日付取得
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0];

    console.log('📅 7日後の日付:', sevenDaysLaterStr);

    // レコード検索
    const filterFormula = `AND(
      {有効期限} = '${sevenDaysLaterStr}',
      {プラン} != 'Free',
      {PaymentMethod} = 'Bank Transfer',
      NOT({ExpiryWarningNotificationSent})
    )`;

    console.log('🔍 フィルタ条件:', filterFormula);

    const records = await base('Customers')
      .select({
        filterByFormula: filterFormula,
        maxRecords: 100
      })
      .firstPage();

    console.log(`📊 検索結果: ${records.length}件`);

    // 詳細情報を取得
    const recordDetails = records.map(record => ({
      id: record.id,
      email: record.get('Email'),
      氏名: record.get('氏名'),
      プラン: record.get('プラン'),
      有効期限: record.get('有効期限'),
      PaymentMethod: record.get('PaymentMethod'),
      ExpiryWarningNotificationSent: record.get('ExpiryWarningNotificationSent')
    }));

    console.log('📋 レコード詳細:', JSON.stringify(recordDetails, null, 2));

    // 結果を返す
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sevenDaysLaterDate: sevenDaysLaterStr,
        filterFormula: filterFormula,
        recordCount: records.length,
        records: recordDetails
      }, null, 2)
    };

  } catch (error) {
    console.error('❌ エラー:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        stack: error.stack
      }, null, 2)
    };
  }
};
