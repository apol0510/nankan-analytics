// ユーザー認証関数（メールアドレスでシンプル認証）+ Brevoメール送信
import Airtable from 'airtable';

export default async function handler(request, context) {
  // CORSヘッダー
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS対応
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // POSTメソッドのみ許可
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // リクエストボディ取得
    const { email } = await request.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // Airtable設定
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);

    // ユーザー検索
    const records = await base('Customers')
      .select({
        filterByFormula: `{Email} = '${email}'`,
        maxRecords: 1
      })
      .firstPage();

    if (records.length === 0) {
      // 新規ユーザーとして登録
      const newRecord = await base('Customers').create({
        'Email': email,
        'プラン': 'Free',
        'ポイント': 1,
        '最終ポイント付与日': new Date().toISOString().split('T')[0]
      });

      // 新規ユーザーにウェルカムメール送信
      let emailSent = false;
      try {
        await sendWelcomeEmail(email);
        emailSent = true;
        console.log('✅ ウェルカムメール送信成功:', email);
      } catch (emailError) {
        console.error('❌ メール送信失敗:', emailError);
        // メール失敗してもユーザー登録は成功とする
      }

      return new Response(
        JSON.stringify({
          success: true,
          isNewUser: true,
          user: {
            email,
            plan: 'free',
            points: 1,
            pointsAdded: 1,
            lastLogin: new Date().toISOString().split('T')[0]
          },
          message: emailSent 
            ? '新規ユーザー登録完了！初回ログインポイント1pt付与＆ウェルカムメール送信'
            : '新規ユーザー登録完了！初回ログインポイント1pt付与（メール送信エラー）'
        }, null, 2),
        { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // 既存ユーザーの情報取得
    const user = records[0];
    const currentPoints = user.get('ポイント') || 0;
    const plan = user.get('プラン') || 'free';
    const lastLogin = user.get('最終ポイント付与日');
    const today = new Date().toISOString().split('T')[0];

    // ログインポイント付与チェック
    let pointsAdded = 0;
    let newPoints = currentPoints;
    
    if (lastLogin !== today) {
      // 本日初ログイン - ポイント付与
      const POINTS_BY_PLAN = {
        'free': 1,
        'Free': 1,
        'standard': 10,
        'Standard': 10,
        'premium': 50,
        'Premium': 50
      };
      
      pointsAdded = POINTS_BY_PLAN[plan] || 1;
      newPoints = currentPoints + pointsAdded;

      // Airtable更新
      await base('Customers').update(user.id, {
        'ポイント': newPoints,
        '最終ポイント付与日': today
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        isNewUser: false,
        user: {
          email,
          plan,
          points: newPoints,
          pointsAdded,
          lastLogin: today,
          registeredAt: user.get('登録日')
        },
        message: pointsAdded > 0 
          ? `ログイン成功！本日のポイント${pointsAdded}pt付与` 
          : 'ログイン成功！（本日のポイントは付与済み）'
      }, null, 2),
      { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auth error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }
}

// Brevoウェルカムメール送信関数
async function sendWelcomeEmail(email) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  
  if (!brevoApiKey) {
    throw new Error('BREVO_API_KEY not configured');
  }

  const emailData = {
    sender: {
      name: "NANKANアナリティクス",
      email: "noreply@keiba.link"
    },
    to: [{ email: email }],
    subject: "🎉 無料会員登録完了！NANKANアナリティクスへようこそ",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3b82f6; font-size: 28px; margin-bottom: 10px;">🎉 登録完了！</h1>
          <p style="color: #64748b; font-size: 16px;">NANKANアナリティクスへようこそ</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 20px;">
          <h2 style="color: #10b981; margin-bottom: 15px;">✨ 無料会員特典</h2>
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 10px;">📊 メインレース（11R）の詳細予想</li>
            <li style="margin-bottom: 10px;">🤖 AI分析による予想データ</li>
            <li style="margin-bottom: 10px;">🎯 基本的な競馬情報</li>
            <li style="margin-bottom: 10px;">🎁 毎日ログインでポイント獲得</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://nankan-analytics.keiba.link/free-prediction/" 
             style="background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            今すぐ予想を見る 🏇
          </a>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-top: 20px;">
          <h3 style="color: #3b82f6; margin-bottom: 10px;">📈 さらに詳しい予想をお求めの方へ</h3>
          <p style="color: #64748b; margin-bottom: 15px;">スタンダード・プレミアムプランで、より詳細な分析と投資戦略をご利用いただけます。</p>
          <a href="https://nankan-analytics.keiba.link/pricing/" 
             style="color: #3b82f6; text-decoration: none; font-weight: 600;">
            料金プランを見る →
          </a>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
          <p>AI・機械学習で勝つ。南関競馬の次世代予想プラットフォーム</p>
          <p><strong>NANKANアナリティクス</strong></p>
        </div>
      </div>
    `
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': brevoApiKey
    },
    body: JSON.stringify(emailData)
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Brevo API error: ${response.status} ${errorData}`);
  }

  return await response.json();
}