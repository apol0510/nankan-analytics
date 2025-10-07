// Apolon予約配信ジョブ登録Function
// Apolon_ScheduledEmailsテーブルに予約登録

export default async function handler(request, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: `Method ${request.method} not allowed` }),
      { status: 405, headers }
    );
  }

  try {
    const { subject, content, recipients, scheduledFor, createdBy } = await request.json();

    console.log('🐴 Apolon予約配信登録:', {
      subject,
      scheduledFor,
      recipientCount: recipients?.length
    });

    // バリデーション
    if (!subject || !content || !recipients || !scheduledFor) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers }
      );
    }

    // 配信時刻が過去でないかチェック
    const scheduledDate = new Date(scheduledFor);
    const now = new Date();
    if (scheduledDate <= now) {
      return new Response(
        JSON.stringify({ error: 'Scheduled time must be in the future' }),
        { status: 400, headers }
      );
    }

    const airtableApiKey = process.env.AIRTABLE_API_KEY;
    const airtableBaseId = process.env.AIRTABLE_BASE_ID;
    const scheduledTable = 'Apolon_ScheduledEmails'; // Apolon専用テーブル

    if (!airtableApiKey || !airtableBaseId) {
      throw new Error('Airtable credentials not configured');
    }

    // Airtableにジョブ登録
    const response = await fetch(`https://api.airtable.com/v0/${airtableBaseId}/${scheduledTable}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          Subject: subject,
          Content: content,
          Recipients: JSON.stringify(recipients), // 配列をJSON文字列化
          ScheduledFor: scheduledDate.toISOString(),
          Status: 'PENDING',
          CreatedBy: createdBy || 'apolon-admin',
          RetryCount: 0
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Airtable registration failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const jobId = result.id;

    console.log(`✅ Apolon予約配信登録完了 - JobID: ${jobId}`);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: jobId,
        data: {
          subject: subject,
          recipientCount: recipients.length,
          scheduledTime: scheduledDate.toISOString(),
          status: 'PENDING',
          note: 'Apolon専用スケジューラーで配信予定'
        },
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('🐴 Apolon予約配信登録エラー:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers }
    );
  }
}
