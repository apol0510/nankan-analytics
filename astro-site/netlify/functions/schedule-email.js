// 自作メールスケジューラー - 予約登録Function
// Airtableをジョブキューとして使用した堅牢なスケジューラー

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

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      return new Response(
        JSON.stringify({ 
          error: 'Airtable configuration missing',
          success: false
        }),
        { status: 500, headers }
      );
    }

    const body = await request.json();
    const { 
      subject, 
      content, 
      recipients,
      scheduledFor, // ISO string
      createdBy = 'admin'
    } = body;

    // 必須項目チェック
    if (!subject || !content || !recipients || !scheduledFor) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: subject, content, recipients, scheduledFor',
          success: false
        }),
        { status: 400, headers }
      );
    }

    // 過去の時刻チェック
    const scheduledTime = new Date(scheduledFor);
    const now = new Date();
    
    if (scheduledTime <= now) {
      return new Response(
        JSON.stringify({ 
          error: 'Scheduled time must be in the future',
          success: false,
          scheduledTime: scheduledTime.toISOString(),
          currentTime: now.toISOString()
        }),
        { status: 400, headers }
      );
    }

    // Airtableにスケジュールジョブを作成
    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/ScheduledEmails`;
    
    const scheduleData = {
      fields: {
        Subject: subject,
        Content: content,
        Recipients: Array.isArray(recipients) ? recipients.join(', ') : recipients,
        ScheduledFor: scheduledTime.toISOString(),
        Status: 'PENDING',
        CreatedBy: createdBy,
        JobId: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    };

    console.log('Creating scheduled email job:', scheduleData);

    const airtableResponse = await fetch(airtableUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(scheduleData)
    });

    if (!airtableResponse.ok) {
      const error = await airtableResponse.text();
      console.error('Airtable creation failed:', error);
      throw new Error(`Failed to create schedule: ${error}`);
    }

    const result = await airtableResponse.json();
    
    return new Response(
      JSON.stringify({
        success: true,
        jobId: result.fields.JobId,
        recordId: result.id,
        scheduledFor: scheduledTime.toISOString(),
        message: `メール予約完了: ${subject}`,
        data: {
          subject,
          scheduledTime: scheduledTime.toLocaleString('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }),
          recipientCount: Array.isArray(recipients) ? recipients.length : 1
        }
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('Schedule email error:', error);
    
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