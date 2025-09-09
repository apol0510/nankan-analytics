// メルマガ配信履歴管理Function
// Airtableを使って配信履歴を保存・取得

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

    if (request.method === 'POST') {
      // 配信履歴を保存
      const { subject, targetPlan, recipientCount, scheduledAt, status = 'sent' } = await request.json();
      
      const historyData = {
        '件名': subject,
        '対象プラン': targetPlan,
        '配信件数': recipientCount,
        '配信日時': scheduledAt || new Date().toISOString(),
        'ステータス': status,
        '作成日時': new Date().toISOString()
      };

      console.log('配信履歴保存:', historyData);

      const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/NewsletterHistory`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: historyData
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Airtable保存エラー:', errorData);
        throw new Error(`Airtable error: ${response.status}`);
      }

      const result = await response.json();
      return new Response(
        JSON.stringify({ 
          success: true, 
          id: result.id,
          message: '配信履歴を保存しました' 
        }),
        { status: 200, headers }
      );

    } else if (request.method === 'GET') {
      // 配信履歴を取得
      const url = new URL(request.url);
      const limit = url.searchParams.get('limit') || '10';
      
      const response = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/NewsletterHistory?sort%5B0%5D%5Bfield%5D=作成日時&sort%5B0%5D%5Bdirection%5D=desc&maxRecords=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Airtable取得エラー:', errorData);
        throw new Error(`Airtable error: ${response.status}`);
      }

      const data = await response.json();
      
      const history = data.records.map(record => ({
        id: record.id,
        subject: record.fields['件名'] || '',
        targetPlan: record.fields['対象プラン'] || '',
        recipientCount: record.fields['配信件数'] || 0,
        scheduledAt: record.fields['配信日時'] || '',
        status: record.fields['ステータス'] || 'unknown',
        createdAt: record.fields['作成日時'] || ''
      }));

      return new Response(
        JSON.stringify({ 
          success: true, 
          history: history,
          count: history.length 
        }),
        { status: 200, headers }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not supported' }),
      { status: 405, headers }
    );

  } catch (error) {
    console.error('Newsletter history error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process newsletter history',
        details: error.message 
      }),
      { status: 500, headers }
    );
  }
}