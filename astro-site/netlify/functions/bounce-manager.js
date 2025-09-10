// バウンス管理システム - Brevo連携
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
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

    if (!BREVO_API_KEY || !AIRTABLE_API_KEY) {
      throw new Error('API keys not configured');
    }

    const { action } = await request.json();

    if (action === 'sync-bounces') {
      // Brevoからバウンス情報を取得
      const bouncesData = await fetchBrevoStatistics();
      
      // Airtableのブラックリストテーブルを更新
      await updateBlacklistTable(bouncesData);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'バウンス情報を同期しました',
          processed: bouncesData.length
        }),
        { status: 200, headers }
      );
    }

    if (action === 'check-email') {
      const { email } = await request.json();
      const isValid = await validateEmailQuality(email);
      
      return new Response(
        JSON.stringify({
          email,
          isValid,
          reason: isValid ? 'OK' : 'ブラックリスト登録済み'
        }),
        { status: 200, headers }
      );
    }

  } catch (error) {
    console.error('Bounce manager error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { status: 500, headers }
    );
  }
}

// Brevoの統計情報からバウンス・苦情を取得
async function fetchBrevoStatistics() {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  
  const response = await fetch('https://api.brevo.com/v3/emailCampaigns/statistics', {
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  return data.campaigns || [];
}

// メール品質チェック
async function validateEmailQuality(email) {
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  
  // ブラックリストテーブルをチェック
  const response = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/EmailBlacklist?filterByFormula=SEARCH('${email}',{Email})`,
    {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const data = await response.json();
  return data.records.length === 0; // ブラックリストにない = 有効
}

// Airtableブラックリストテーブル更新
async function updateBlacklistTable(bouncedEmails) {
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  
  for (const email of bouncedEmails) {
    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/EmailBlacklist`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          Email: email,
          Status: 'BOUNCED',
          AddedAt: new Date().toISOString(),
          Source: 'Brevo API'
        }
      })
    });
  }
}