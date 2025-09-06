// Netlify Function: Airtableから顧客のプラン情報を取得
// 使用方法: POST /.netlify/functions/get-plan
// Body: { "email": "customer@example.com" }

exports.handler = async (event, context) => {
  // CORS設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // OPTIONSリクエストに対応（CORS preflight）
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // POSTリクエストのみ許可
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // リクエストボディからemailを取得
    const body = JSON.parse(event.body || '{}');
    const { email } = body;

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' }),
      };
    }

    // 環境変数チェック
    const airtableApiKey = process.env.AIRTABLE_API_KEY;
    const airtableBaseId = process.env.AIRTABLE_BASE_ID;

    if (!airtableApiKey || !airtableBaseId) {
      console.error('Missing environment variables:', {
        hasApiKey: !!airtableApiKey,
        hasBaseId: !!airtableBaseId,
      });
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }

    // Airtable API呼び出し
    const airtableUrl = `https://api.airtable.com/v0/${airtableBaseId}/Customers?filterByFormula=LOWER({Email})=LOWER('${email}')`;
    
    const airtableResponse = await fetch(airtableUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!airtableResponse.ok) {
      console.error('Airtable API error:', {
        status: airtableResponse.status,
        statusText: airtableResponse.statusText,
      });
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch customer data' }),
      };
    }

    const airtableData = await airtableResponse.json();
    console.log('Airtable response:', { recordCount: airtableData.records.length });

    // 顧客データを取得
    if (airtableData.records && airtableData.records.length > 0) {
      const customer = airtableData.records[0].fields;
      const planData = {
        email: customer.Email || email,
        name: customer['氏名'] || 'お客様',
        plan: (customer['プラン'] || 'free').toLowerCase(), // standardやpremiumをlowercaseに統一
        points: customer['ポイント'] || 0,
        registrationDate: customer['登録日'] || null,
        expiredDate: customer['有効期限'] || null,
        hasClaimedReward: customer['特典申請済み'] || false,
      };

      console.log('Customer found:', { email, plan: planData.plan });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          customer: planData,
        }),
      };
    } else {
      // 顧客が見つからない場合は新規（無料会員）として扱う
      console.log('Customer not found, returning free plan:', email);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          customer: {
            email: email,
            name: email.split('@')[0],
            plan: 'free',
            points: 0,
            registrationDate: new Date().toISOString(),
            expiredDate: null,
            hasClaimedReward: false,
          },
        }),
      };
    }

  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};