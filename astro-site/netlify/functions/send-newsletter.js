// Brevoメルマガ配信Function
// 南関競馬の予想結果や攻略情報を配信

export default async function handler(request, context) {
  // CORS対応ヘッダー
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONSリクエスト対応
  if (request.method === 'OPTIONS') {
    return new Response('', { 
      status: 200, 
      headers 
    });
  }

  // POSTメソッドのみ受付
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: `Method ${request.method} not allowed` }), 
      {
        status: 405,
        headers
      }
    );
  }

  try {
    const requestBody = await request.text();
    console.log('Received request body:', requestBody);
    
    const { subject, htmlContent, scheduledAt, targetPlan = 'all', retryEmails } = JSON.parse(requestBody);

    // 必須パラメータチェック
    if (!subject || !htmlContent) {
      return new Response(
        JSON.stringify({ error: 'Subject and htmlContent are required' }),
        {
          status: 400,
          headers
        }
      );
    }

    const isScheduledRequest = !!scheduledAt;

    // 予約配信の場合は自作スケジューラーを使用
    if (isScheduledRequest) {
      console.log('📅 予約配信リクエスト - 自作スケジューラーに転送');
      
      // 配信リスト取得
      const recipients = await getRecipientsList(targetPlan);
      if (recipients.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No recipients found for scheduling' }),
          { status: 400, headers }
        );
      }

      // 自作スケジューラーにジョブを登録
      const baseUrl = request.url.substring(0, request.url.lastIndexOf('/'));
      const scheduleResponse = await fetch(`${baseUrl}/schedule-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject,
          content: htmlContent,
          recipients: recipients,
          scheduledFor: scheduledAt,
          createdBy: 'admin',
          targetPlan
        })
      });

      if (!scheduleResponse.ok) {
        const errorText = await scheduleResponse.text();
        throw new Error(`スケジューラー登録失敗: ${scheduleResponse.status} - ${errorText}`);
      }

      const scheduleResult = await scheduleResponse.json();

      return new Response(
        JSON.stringify({
          success: true,
          isScheduled: true,
          jobId: scheduleResult.jobId,
          scheduledFor: scheduledAt,
          message: `メール予約完了: ${subject}`,
          data: {
            subject,
            recipientCount: recipients.length,
            scheduledTime: scheduleResult.data.scheduledTime,
            note: '自作スケジューラーで確実配信予定'
          },
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers }
      );
    }

    // 即座に送信の場合
    // 配信リスト取得（再送信の場合は再送信リストを使用）
    let recipients;
    if (retryEmails && Array.isArray(retryEmails)) {
      console.log('再送信モード:', retryEmails.length + '件');
      recipients = retryEmails;
    } else {
      recipients = await getRecipientsList(targetPlan);
    }
    
    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No recipients found' }),
        {
          status: 400,
          headers
        }
      );
    }

    // Brevo APIでメール送信（即座）
    const result = await sendNewsletterViaBrevo({
      recipients,
      subject,
      htmlContent
    });

    // 配信履歴はフロントエンドのLocalStorageで管理

    return new Response(
      JSON.stringify({
        success: true,
        message: `Newsletter sent to ${result.totalSent} recipients`,
        details: result,
        recipientCount: result.totalSent,
        failedCount: result.totalFailed,
        failedEmails: result.failedEmails,
        isScheduled: false,
        actualSendTime: new Date().toISOString()
      }),
      {
        status: 200,
        headers
      }
    );

  } catch (error) {
    console.error('Newsletter send error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error', 
        timestamp: new Date().toISOString() 
      }),
      {
        status: 500,
        headers
      }
    );
  }
}

// Airtableから受信者リストを取得
async function getRecipientsList(targetPlan) {
  console.log('配信対象プラン:', targetPlan);
  
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.error('Airtable設定が見つかりません');
    return [];
  }
  
  try {
    let filterFormula = '';
    
    // プランに基づくフィルタリング
    if (targetPlan === 'free') {
      filterFormula = "{プラン} = 'Free'";
    } else if (targetPlan === 'standard') {
      filterFormula = "OR({プラン} = 'Standard', {プラン} = 'Premium')";
    } else if (targetPlan === 'premium') {
      filterFormula = "{プラン} = 'Premium'";
    } else if (targetPlan === 'all') {
      // 全員に配信
      filterFormula = '';
    }
    
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Customers`;
    const queryParams = filterFormula ? `?filterByFormula=${encodeURIComponent(filterFormula)}` : '';
    
    console.log('🔍 Airtable検索:', {
      url: url + queryParams,
      filterFormula,
      targetPlan: '指定されたプラン'
    });
    
    const response = await fetch(url + queryParams, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('📋 Airtable生データ:', {
      recordCount: data.records?.length || 0,
      records: data.records?.slice(0, 3).map(r => ({
        email: r.fields.Email,
        plan: r.fields['プラン'] || r.fields.Plan
      })) || []
    });
    
    const recipients = data.records
      .map(record => record.fields.Email)
      .filter(email => email && email.includes('@'));
    
    console.log(`📧 取得した受信者数: ${recipients.length}`, recipients);
    return recipients;
    
  } catch (error) {
    console.error('受信者リスト取得エラー:', error);
    return [];
  }
}

// Brevo APIでメール送信
async function sendNewsletterViaBrevo({ recipients, subject, htmlContent }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  
  if (!BREVO_API_KEY) {
    throw new Error('Brevo API key not configured');
  }
  
  const batchSize = 100; // Brevoの推奨バッチサイズ
  const results = {
    totalSent: 0,
    totalFailed: 0,
    failedEmails: []
  };
  
  // 🔐 プライバシー保護個別配信システム（BCC問題対応）
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': BREVO_API_KEY
        },
        body: JSON.stringify({
          sender: {
            name: 'NANKANアナリティクス',
            email: 'info@keiba.link'
          },
          to: [{ email: recipient }], // 個別配信でプライバシー完全保護
          subject,
          htmlContent,
          tags: ['newsletter', 'nankan', 'individual-delivery']
        })
      });
      
      if (response.ok) {
        results.totalSent += 1;
        console.log(`✅ 個別送信成功: ${recipient}`);
      } else {
        const errorData = await response.text();
        console.error(`❌ 個別送信失敗 ${recipient}:`, errorData);
        results.totalFailed += 1;
        results.failedEmails.push(recipient);
      }
      
    } catch (error) {
      console.error(`個別送信エラー ${recipient}:`, error);
      results.totalFailed += 1;
      results.failedEmails.push(recipient);
    }
  }
  
  return results;
}