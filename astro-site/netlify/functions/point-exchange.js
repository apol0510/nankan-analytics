// ポイント交換申請処理
// Airtableに申請データ保存 + オプションでメール通知
// 最終更新: 2025-10-23 0:45 Plan値正規化追加（premium→Premium統一）

const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

exports.handler = async (event, context) => {
  // CORSヘッダー設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONSリクエスト（プリフライト）対応
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // POSTリクエストのみ受付
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // リクエストボディ解析
    const { userEmail, userName, userPlan, currentPoints, requiredPoints, rewardName } = JSON.parse(event.body);

    console.log('📧 ポイント交換申請受付:', {
      userEmail,
      userName,
      userPlan,
      currentPoints,
      requiredPoints,
      rewardName,
      timestamp: new Date().toISOString()
    });

    // バリデーション
    if (!userEmail || !requiredPoints || !rewardName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '必須項目が不足しています' })
      };
    }

    // ポイント不足チェック
    if (currentPoints < requiredPoints) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'ポイント不足',
          message: `交換には${requiredPoints}pt必要です（現在: ${currentPoints}pt）`
        })
      };
    }

    // Airtableに申請データを保存
    try {
      // Airtable Date型フィールド対応: YYYY-MM-DD形式で送信
      const today = new Date().toISOString().split('T')[0];

      // Plan値を正規化（大文字始まりに統一: free→Free, premium→Premium, standard→Standard）
      const normalizePlan = (plan) => {
        if (!plan) return 'Free';
        const normalized = plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
        return normalized;
      };

      const record = await base('PointExchangeRequests').create({
        Email: userEmail,
        Name: userName || '',
        Plan: normalizePlan(userPlan),
        CurrentPoints: currentPoints,
        RequiredPoints: requiredPoints,
        RewardName: rewardName,
        Status: 'Pending',
        RequestDate: today,
        ProcessedDate: null,
        Notes: ''
      });

      console.log('✅ Airtable申請データ保存成功:', record.id);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'ポイント交換申請を受け付けました。管理者が確認後、1営業日以内にメールで特典をお送りします。',
          requestId: record.id
        })
      };

    } catch (airtableError) {
      console.error('❌ Airtable保存エラー:', airtableError);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: '申請データの保存に失敗しました',
          details: airtableError.message
        })
      };
    }

  } catch (error) {
    console.error('❌ ポイント交換処理エラー:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '申請処理中にエラーが発生しました',
        details: error.message
      })
    };
  }
};
