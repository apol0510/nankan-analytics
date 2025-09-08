// 無料会員登録専用Function - Zapier Webhook経由でAirtable+メール送信
export default async function handler(request, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email is required' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // Zapier Webhook呼び出し（サーバーサイドからなのでCORS問題なし）
    const zapierWebhookUrl = 'https://hooks.zapier.com/hooks/catch/18635496/2q2kn7r/';
    
    console.log('🚀 Zapier Webhook呼び出し:', email);
    
    const zapierResponse = await fetch(zapierWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        planType: 'Free',
        userId: 'free_' + Date.now(),
        registrationDate: new Date().toISOString(),
        source: 'free-signup'
      })
    });

    if (zapierResponse.ok) {
      console.log('✅ Zapier Webhook成功');
      
      return new Response(
        JSON.stringify({
          success: true,
          user: {
            email: email,
            plan: 'free',
            points: 1,
            pointsAdded: 1,
            lastLogin: new Date().toISOString().split('T')[0]
          },
          message: '無料会員登録完了！ウェルカムメールをお送りしました。'
        }),
        { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('❌ Zapier Webhook失敗:', zapierResponse.status);
      throw new Error('Zapier連携に失敗しました');
    }

  } catch (error) {
    console.error('Registration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Registration failed',
        details: error.message
      }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }
}