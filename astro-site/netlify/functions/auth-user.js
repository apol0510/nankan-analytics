// ユーザー認証関数（メールアドレスでシンプル認証）+ SendGridメール送信
const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const request = {
    method: event.httpMethod,
    json: () => JSON.parse(event.body || '{}')
  };
  // CORSヘッダー
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS対応
  if (request.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // POSTメソッドのみ許可
  if (request.method !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('🔍 Event received:', JSON.stringify(event, null, 2));
    console.log('🔍 Event body:', event.body);
    console.log('🔍 Event httpMethod:', event.httpMethod);
    
    // リクエストボディ取得
    const { email } = JSON.parse(event.body || '{}');
    console.log('🔍 Parsed email:', email);

    if (!email) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    // Airtable設定
    console.log('🔍 Environment check - AIRTABLE_API_KEY exists:', !!process.env.AIRTABLE_API_KEY);
    console.log('🔍 Environment check - AIRTABLE_BASE_ID exists:', !!process.env.AIRTABLE_BASE_ID);
    
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

      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }, null, 2)
      };
    }

    // 既存ユーザーの情報取得
    const user = records[0];
    const currentPoints = user.get('ポイント') || 0;
    const currentPlan = user.get('プラン') || 'free';
    const lastLogin = user.get('最終ポイント付与日');
    // 最終プランチェック日フィールドは現在使用しない（Airtableに存在しないため）
    const today = new Date().toISOString().split('T')[0];

    // ログインポイント付与チェック + プラン変更ボーナス
    let pointsAdded = 0;
    let newPoints = currentPoints;
    let updateData = {};
    
    const POINTS_BY_PLAN = {
      'free': 1,
      'Free': 1,
      'standard': 10,
      'Standard': 10,
      'premium': 30,
      'Premium': 30
    };

    // 通常のログインポイント（1日1回）
    if (lastLogin !== today) {
      pointsAdded += POINTS_BY_PLAN[currentPlan] || 1;
      updateData['最終ポイント付与日'] = today;
    }

    // プラン変更ボーナス（現在は無効化 - Airtableフィールド不足のため）
    // TODO: 最終プランチェック日フィールドをAirtableに追加後に有効化
    console.log('📝 プラン変更ボーナス機能は一時無効化中（Airtableフィールド準備中）');

    if (pointsAdded > 0) {
      newPoints = currentPoints + pointsAdded;
      updateData['ポイント'] = newPoints;
      
      // Airtable更新
      await base('Customers').update(user.id, updateData);
    }

    // 🔧 プラン値正規化: 大文字小文字混在問題解決
    const normalizedPlan = normalizePlan(currentPlan);

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        isNewUser: false,
        user: {
          email,
          plan: normalizedPlan,
          points: newPoints,
          pointsAdded,
          lastLogin: today,
          registeredAt: user.get('登録日')
        },
        message: pointsAdded > 0
          ? `ログイン成功！本日のポイント${pointsAdded}pt付与`
          : 'ログイン成功！（本日のポイントは付与済み）'
      }, null, 2)
    };

  } catch (error) {
    console.error('🚨 Auth error:', error);
    console.error('🚨 Error stack:', error.stack);
    console.error('🚨 Event details:', JSON.stringify(event));
    
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        stack: error.stack
      })
    };
  }
}

// 🔧 プラン値正規化関数: Airtableの大文字小文字混在問題解決
function normalizePlan(planValue) {
  if (!planValue) return 'free';

  const planLower = planValue.toString().toLowerCase();

  // 正規化マッピング
  switch (planLower) {
    case 'premium':
    case 'プレミアム':
      return 'premium';
    case 'standard':
    case 'スタンダード':
      return 'standard';
    case 'free':
    case 'フリー':
    case '無料':
      return 'free';
    default:
      console.warn(`⚠️ 未知のプラン値: "${planValue}" -> デフォルト 'free'`);
      return 'free';
  }
}

// SendGridウェルカムメール送信関数
async function sendWelcomeEmail(email) {
  const sendGridApiKey = process.env.SENDGRID_API_KEY;

  if (!sendGridApiKey) {
    throw new Error('SENDGRID_API_KEY not configured');
  }

  const emailData = {
    personalizations: [
      {
        to: [{ email: email }],
        subject: "🎉 無料会員登録完了！NANKANアナリティクスへようこそ"
      }
    ],
    from: {
      name: "NANKANアナリティクス",
      email: "nankan-analytics@keiba.link"
    },
    content: [
      {
        type: "text/html",
        value: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3b82f6 !important; font-size: 28px; margin-bottom: 10px;">🎉 登録完了！</h1>
          <p style="color: #64748b !important; font-size: 16px;">NANKANアナリティクスへようこそ</p>
        </div>

        <div style="background-color: #1e293b !important; color: #ffffff !important; padding: 30px; border-radius: 12px; margin-bottom: 20px; border: 2px solid #334155;">
          <h2 style="color: #10b981 !important; margin-bottom: 15px; font-size: 20px;">✨ 無料会員特典</h2>
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 10px; color: #ffffff !important;">📊 メインレース（11R）の詳細予想</li>
            <li style="margin-bottom: 10px; color: #ffffff !important;">🤖 AI分析による予想データ</li>
            <li style="margin-bottom: 10px; color: #ffffff !important;">🎯 基本的な競馬情報</li>
            <li style="margin-bottom: 10px; color: #ffffff !important;">🎁 毎日ログインでポイント獲得</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://nankan-analytics.keiba.link/dashboard/"
             style="background-color: #3b82f6 !important; color: #ffffff !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; border: 2px solid #3b82f6;">
            マイページにログイン 📊
          </a>
        </div>

        <div style="background-color: #e0f2fe !important; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <h3 style="color: #1565c0 !important; margin-bottom: 10px; font-size: 18px;">🔑 ログインについて</h3>
          <p style="color: #0277bd !important; margin-bottom: 10px; font-size: 14px;">
            メールアドレス「<strong style="color: #0277bd !important;">${email}</strong>」でログインできます。
          </p>
          <p style="color: #0277bd !important; font-size: 14px; margin: 0;">
            マイページでポイント確認・交換申請が可能です！
          </p>
        </div>

        <div style="background-color: #f8fafc !important; padding: 20px; border-radius: 8px; margin-top: 20px; border: 1px solid #e2e8f0;">
          <h3 style="color: #3b82f6 !important; margin-bottom: 10px; font-size: 18px;">📈 さらに詳しい予想をお求めの方へ</h3>
          <p style="color: #64748b !important; margin-bottom: 15px;">スタンダード・プレミアムプランで、より詳細な分析と投資戦略をご利用いただけます。</p>
          <a href="https://nankan-analytics.keiba.link/pricing/"
             style="color: #3b82f6 !important; text-decoration: none; font-weight: 600;">
            料金プランを見る →
          </a>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b !important; font-size: 14px; margin-bottom: 5px;">AI・機械学習で勝つ。南関競馬の次世代予想プラットフォーム</p>
          <p style="color: #64748b !important; font-size: 14px; margin: 0;"><strong>NANKANアナリティクス</strong></p>
        </div>
      </div>
        `
      }
    ]
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sendGridApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailData)
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`SendGrid API error: ${response.status} ${errorData}`);
  }

  return await response.json();
}