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

      // 新規ユーザー通知は独立したuser-notification.jsで処理（復活防止対策）
      try {
        const notificationResponse = await fetch(`${context.NETLIFY_DEV ? 'http://localhost:8888' : 'https://nankan-analytics.netlify.app'}/.netlify/functions/user-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email,
            isNewUser: true
          })
        });

        if (notificationResponse.ok) {
          const notificationResult = await notificationResponse.json();
          console.log('✅ 新規ユーザー通知送信成功:', notificationResult);
        } else {
          console.error('⚠️ 新規ユーザー通知送信失敗（処理は継続）:', notificationResponse.status);
        }
      } catch (notificationError) {
        console.error('⚠️ 新規ユーザー通知エラー（処理は継続）:', notificationError.message);
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
    const expiryDate = user.get('ExpiryDate'); // 有効期限取得
    const today = new Date().toISOString().split('T')[0];

    // 🔍 有効期限チェック（期限切れでもログインOK・状態のみ返却）
    let isExpired = false;
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const now = new Date();
      if (expiry < now) {
        isExpired = true;
        console.log(`⚠️ ユーザー ${email} は期限切れです（${expiryDate}）`);
      }
    }

    // 🔧 プラン値正規化: 大文字小文字混在問題解決
    const normalizedPlan = normalizePlan(currentPlan);

    // 📊 期限切れユーザーのレスポンス構築（ポイント付与なし）
    if (isExpired) {
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          isNewUser: false,
          isExpired: true, // 期限切れフラグ
          user: {
            email,
            plan: 'expired', // 特別なステータス
            originalPlan: normalizedPlan, // 元のプラン
            points: currentPoints, // ポイント付与なし
            pointsAdded: 0, // ポイント付与なし
            lastLogin: today,
            expiryDate: expiryDate,
            registeredAt: user.get('登録日')
          },
          message: 'プランの有効期限が切れています。継続をご希望の場合はプランを更新してください。'
        }, null, 2)
      };
    }

    // ログインポイント付与チェック + プラン変更ボーナス（期限切れでない場合のみ）
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

    // 通常ユーザーのレスポンス
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        isNewUser: false,
        isExpired: false,
        user: {
          email,
          plan: normalizedPlan,
          points: newPoints,
          pointsAdded,
          lastLogin: today,
          expiryDate: expiryDate || null,
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

// 🚫 ウェルカムメール機能は完全削除済み・復活禁止（2025-09-24）
// 削除理由: 8912keibalink.keiba.link不正ドメイン問題解決
// ⚠️ 絶対に復活させてはいけない機能:
//   - sendWelcomeEmail関数・sendWelcomeEmailDirect関数
//   - 90行以上のHTMLメールテンプレート
//   - 環境変数SITE_URLに依存するURL生成
//   - NANKANアナリティクスへようこそメール
//   - マイページログインリンク付きメール
//
// 📧 新規ユーザー通知が必要な場合は、独立したuser-notification.jsを使用
// 復活防止ガイド: WELCOME_EMAIL_REVIVAL_PREVENTION.md参照