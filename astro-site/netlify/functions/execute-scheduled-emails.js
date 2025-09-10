// 自作メールスケジューラー - 実行エンジンFunction
// Airtableから予約メールを取得して実行

export default async function handler(request, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const BREVO_API_KEY = process.env.BREVO_API_KEY;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !BREVO_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing configuration',
          success: false
        }),
        { status: 500, headers }
      );
    }

    const now = new Date();
    console.log('🕐 スケジューラー実行開始:', now.toISOString());

    // Airtableから実行対象のメールを取得
    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/ScheduledEmails`;
    const filterFormula = `AND({Status} = 'PENDING', IS_BEFORE({ScheduledFor}, '${now.toISOString()}'))`;
    
    const airtableResponse = await fetch(
      `${airtableUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!airtableResponse.ok) {
      throw new Error(`Airtable query failed: ${airtableResponse.status}`);
    }

    const scheduledEmails = await airtableResponse.json();
    const emailsToSend = scheduledEmails.records || [];

    console.log(`📧 実行対象メール数: ${emailsToSend.length}`);

    if (emailsToSend.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No emails to send',
          executedCount: 0,
          timestamp: now.toISOString()
        }),
        { status: 200, headers }
      );
    }

    const results = [];

    // 各メールを順次実行
    for (const emailRecord of emailsToSend) {
      const { id: recordId, fields } = emailRecord;
      const { Subject, Content, Recipients, JobId } = fields;

      try {
        console.log(`📤 送信開始: ${Subject} (${JobId})`);

        // ステータスを実行中に更新
        await updateEmailStatus(recordId, 'EXECUTING', AIRTABLE_API_KEY, AIRTABLE_BASE_ID);

        // 受信者リストを解析
        const recipientList = Recipients.split(',').map(email => email.trim()).filter(Boolean);

        // Brevo APIでメール送信（プライバシー保護でBCC使用）
        const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
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
            to: [{ email: 'info@keiba.link' }], // 送信者自身をToに設定
            bcc: recipientList.map(email => ({ email })), // 受信者はBCCで送信
            subject: Subject,
            htmlContent: Content,
            tags: ['scheduled', 'newsletter']
          })
        });

        if (!brevoResponse.ok) {
          const errorData = await brevoResponse.text();
          throw new Error(`Brevo送信失敗: ${errorData}`);
        }

        const brevoResult = await brevoResponse.json();
        
        // 送信成功 - ステータス更新
        await updateEmailStatus(recordId, 'SENT', AIRTABLE_API_KEY, AIRTABLE_BASE_ID);

        results.push({
          jobId: JobId,
          subject: Subject,
          recipientCount: recipientList.length,
          status: 'SUCCESS',
          messageId: brevoResult.messageId
        });

        console.log(`✅ 送信完了: ${Subject}`);

      } catch (sendError) {
        console.error(`❌ 送信失敗: ${Subject}`, sendError);

        // 送信失敗 - エラーステータス更新
        await updateEmailStatus(recordId, 'FAILED', AIRTABLE_API_KEY, AIRTABLE_BASE_ID, {
          FailedAt: now.toISOString(),
          ErrorMessage: sendError.message,
          RetryCount: (fields.RetryCount || 0) + 1
        });

        results.push({
          jobId: JobId,
          subject: Subject,
          status: 'FAILED',
          error: sendError.message
        });
      }
    }

    const successCount = results.filter(r => r.status === 'SUCCESS').length;
    const failedCount = results.filter(r => r.status === 'FAILED').length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `スケジューラー実行完了: 成功${successCount}件、失敗${failedCount}件`,
        executedCount: emailsToSend.length,
        successCount,
        failedCount,
        results,
        timestamp: now.toISOString()
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('Scheduler execution error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        success: false,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers }
    );
  }
}

// Airtableのメールステータスを更新するヘルパー関数
async function updateEmailStatus(recordId, status, apiKey, baseId, additionalFields = {}) {
  const updateData = {
    fields: {
      Status: status,
      ...additionalFields
    }
  };

  console.log(`🔄 Updating status for ${recordId} to ${status}:`, updateData);

  const response = await fetch(
    `https://api.airtable.com/v0/${baseId}/ScheduledEmails/${recordId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Status update failed for ${recordId}:`, errorText);
    throw new Error(`Status update failed: ${errorText}`);
  } else {
    console.log(`✅ Status updated successfully for ${recordId} to ${status}`);
  }
  
  return response.ok;
}