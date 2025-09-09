// 配信状況確認Function
// Brevo APIから実際の配信履歴とステータスを取得

export default async function handler(request, context) {
  // CORS対応ヘッダー
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONSリクエスト対応
  if (request.method === 'OPTIONS') {
    return new Response('', { 
      status: 200, 
      headers 
    });
  }

  try {
    const BREVO_API_KEY = process.env.BREVO_API_KEY;

    if (!BREVO_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'BREVO_API_KEY not configured',
          status: 'error'
        }),
        { status: 500, headers }
      );
    }

    // 配信履歴を取得（過去24時間）
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 送信済みメール一覧取得
    const emailHistoryResponse = await fetch(
      `https://api.brevo.com/v3/smtp/emails?limit=100&offset=0&startDate=${startDate}&endDate=${endDate}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'api-key': BREVO_API_KEY
        }
      }
    );

    const emailHistory = await emailHistoryResponse.json();

    // スケジュール配信一覧取得
    let scheduledEmails = [];
    try {
      const scheduledResponse = await fetch(
        'https://api.brevo.com/v3/smtp/emails?status=queued',
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'api-key': BREVO_API_KEY
          }
        }
      );
      const scheduledData = await scheduledResponse.json();
      if (scheduledData && scheduledData.transactionalEmails) {
        scheduledEmails = scheduledData.transactionalEmails;
      }
    } catch (scheduledError) {
      console.log('スケジュール配信取得エラー:', scheduledError);
    }

    // アカウント情報取得
    const accountResponse = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'api-key': BREVO_API_KEY
      }
    });

    const accountInfo = await accountResponse.json();

    // 配信統計情報取得
    let stats = {};
    try {
      const statsResponse = await fetch(
        `https://api.brevo.com/v3/smtp/statistics/aggregatedReport?startDate=${startDate.split('T')[0]}&endDate=${endDate.split('T')[0]}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'api-key': BREVO_API_KEY
          }
        }
      );
      stats = await statsResponse.json();
    } catch (statsError) {
      console.log('統計情報取得エラー:', statsError);
    }

    // レスポンス構築
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        account: {
          email: accountInfo.email,
          firstName: accountInfo.firstName,
          lastName: accountInfo.lastName,
          companyName: accountInfo.companyName,
          plan: accountInfo.plan
        },
        recentEmails: emailHistory.transactionalEmails || [],
        scheduledEmails: scheduledEmails,
        stats: stats,
        summary: {
          totalSent24h: emailHistory.count || 0,
          pendingScheduled: scheduledEmails.length,
          accountStatus: accountInfo.email ? 'active' : 'unknown'
        }
      }
    };

    console.log('配信状況チェック結果:', {
      recentEmailCount: emailHistory.count,
      scheduledCount: scheduledEmails.length,
      accountEmail: accountInfo.email
    });

    return new Response(
      JSON.stringify(response),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('配信状況確認エラー:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        success: false,
        timestamp: new Date().toISOString(),
        details: error.stack
      }),
      { status: 500, headers }
    );
  }
}