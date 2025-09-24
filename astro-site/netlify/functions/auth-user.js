// ユーザー認証関数（メールアドレスでシンプル認証）
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
  console.log('🔍 Force rebuild - current SITE_URL:', process.env.SITE_URL);
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

      // 新規ユーザーウェルカムメール送信（2025-09-24新規実装）
      try {
        await sendWelcomeEmailDirect(email);
        console.log('✅ ウェルカムメール送信成功:', email);
      } catch (emailError) {
        console.error('⚠️ ウェルカムメール送信エラー（処理は継続）:', emailError.message);
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
          message: '新規ユーザー登録完了！初回ログインポイント1pt付与'
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

// 🚫 旧ウェルカムメール機能は完全削除済み・復活禁止
// 削除日: 2025-09-24 理由: 8912keibalink.keiba.link不正ドメイン問題解決
// ⚠️ 絶対に復活させてはいけない機能:
//   - 旧sendWelcomeEmail関数
//   - 90行以上のHTMLメールテンプレート
//   - 環境変数SITE_URLに依存するURL生成
//
// ✅ 新しいウェルカムメール機能（2025-09-24実装）
// - 完全に新しい実装・安全なドメイン固定
// - 削除されたコードの再利用なし
// - シンプルで確実なメール送信

// 新しいウェルカムメール送信関数（復活防止ガイドライン完全遵守）
async function sendWelcomeEmailDirect(email) {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

  if (!SENDGRID_API_KEY) {
    throw new Error('SendGrid API key not configured');
  }

  // 🔒 安全なドメイン（ハードコーディング）
  const SAFE_DOMAIN = 'https://nankan-analytics.keiba.link';

  const emailData = {
    personalizations: [
      {
        to: [{ email: email }],
        subject: '🎉 NANKANアナリティクス登録完了！'
      }
    ],
    from: {
      name: 'NANKANアナリティクス',
      email: 'nankan-analytics@keiba.link'
    },
    content: [
      {
        type: 'text/html',
        value: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 30px; text-align: center; border-radius: 12px; margin-bottom: 20px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🏇 NANKANアナリティクス</h1>
              <p style="color: #cbd5e1; margin: 10px 0 0 0; font-size: 16px;">南関競馬AI予想プラットフォーム</p>
            </div>

            <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #1e293b; margin-top: 0;">🎉 登録完了！</h2>
              <p style="color: #475569; line-height: 1.6;">
                この度はNANKANアナリティクスにご登録いただき、誠にありがとうございます！
              </p>

              <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1e293b; margin-top: 0;">🎁 無料会員特典</h3>
                <ul style="color: #475569; padding-left: 20px;">
                  <li>メインレース（11R）詳細予想</li>
                  <li>AI分析による予想データ</li>
                  <li>毎日ログインで1ポイント獲得</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${SAFE_DOMAIN}/dashboard"
                   style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  📊 マイページにログイン
                </a>
              </div>

              <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                <p style="color: #065f46; margin: 0; font-size: 14px;">
                  <strong>ログイン方法：</strong> メールアドレス「${email}」でログイン
                </p>
              </div>
            </div>

            <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 14px;">
              <p>ご不明な点がございましたら、お気軽にお問い合わせください</p>
              <p style="margin: 5px 0 0 0;">
                <strong>NANKANアナリティクス</strong><br>
                📧 support@nankan-analytics.keiba.link
              </p>
            </div>
          </div>
        `
      }
    ]
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('🚨 SendGrid API error:', errorText);
    throw new Error(`SendGrid API error: ${response.status}`);
  }

  console.log('📧 ウェルカムメール送信成功:', email);
}