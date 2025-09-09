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

    // スケジュール配信一覧取得（複数のエンドポイントを試す）
    let scheduledEmails = [];
    let scheduledCampaigns = [];
    
    // 1. トランザクションメールのqueued状態を確認
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
      console.log('Queued emails response:', scheduledData);
      if (scheduledData && scheduledData.transactionalEmails) {
        scheduledEmails = scheduledData.transactionalEmails;
      }
    } catch (scheduledError) {
      console.log('スケジュール配信取得エラー:', scheduledError);
    }
    
    // 2. キャンペーンAPIもチェック（スケジュール配信はこちらの可能性）
    try {
      const campaignsResponse = await fetch(
        'https://api.brevo.com/v3/emailCampaigns?status=scheduled&limit=50',
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'api-key': BREVO_API_KEY
          }
        }
      );
      const campaignsData = await campaignsResponse.json();
      console.log('Scheduled campaigns response:', campaignsData);
      if (campaignsData && campaignsData.campaigns) {
        scheduledCampaigns = campaignsData.campaigns;
      }
    } catch (campaignError) {
      console.log('キャンペーン取得エラー:', campaignError);
    }
    
    // 3. 最近のトランザクションメールで未送信のものも確認
    let pendingEmails = [];
    try {
      const pendingResponse = await fetch(
        'https://api.brevo.com/v3/smtp/emails?limit=100',
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'api-key': BREVO_API_KEY
          }
        }
      );
      const pendingData = await pendingResponse.json();
      if (pendingData && pendingData.transactionalEmails) {
        // scheduledAtが設定されているものを探す
        pendingEmails = pendingData.transactionalEmails.filter(email => 
          email.scheduledAt && new Date(email.scheduledAt) > new Date()
        );
      }
    } catch (pendingError) {
      console.log('Pending emails取得エラー:', pendingError);
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

    // すべての予約配信を結合
    const allScheduled = [
      ...scheduledEmails,
      ...scheduledCampaigns.map(c => ({
        subject: c.name,
        scheduledAt: c.scheduledAt,
        to: c.statistics ? [{ email: `${c.statistics.globalStats?.uniqueClicks || 0}件` }] : [],
        status: 'campaign-scheduled',
        id: c.id
      })),
      ...pendingEmails
    ];
    
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
        scheduledEmails: allScheduled,
        scheduledCampaigns: scheduledCampaigns,
        pendingEmails: pendingEmails,
        stats: stats,
        summary: {
          totalSent24h: emailHistory.count || 0,
          pendingScheduled: allScheduled.length,
          accountStatus: accountInfo.email ? 'active' : 'unknown'
        },
        debug: {
          queuedEmailsCount: scheduledEmails.length,
          scheduledCampaignsCount: scheduledCampaigns.length,
          pendingEmailsCount: pendingEmails.length,
          message: 'Brevo SMTPでは予約配信がトランザクションメールとして記録されない可能性があります'
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