// ユーザー認証関数（メールアドレスでシンプル認証）
const Airtable = require('airtable');

// 🚨 一時的にログイン試行回数制限を無効化（Netlifyデプロイ問題対応）
// const {
//   checkBlacklist,
//   checkLoginAttempt,
//   resetLoginAttempts,
//   recordLoginFailure
// } = require('./login-rate-limiter');

exports.handler = async (event, context) => {
  // IPアドレス抽出
  const ipAddress = event.headers['x-forwarded-for']?.split(',')[0].trim() ||
                    event.headers['x-real-ip'] ||
                    event.requestContext?.identity?.sourceIp ||
                    'unknown';
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
    console.log('🔍 IP Address:', ipAddress);

    if (!email) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    // 🚨 一時的にログイン試行回数制限を無効化（Netlifyデプロイ問題対応）
    // // 🔒 ブラックリストチェック（IPアドレスベース）
    // const isBlacklisted = await checkBlacklist(ipAddress);
    // if (isBlacklisted) {
    //   console.log(`🚨 ブラックリスト登録済みIP: ${ipAddress}`);
    //   return {
    //     statusCode: 403,
    //     headers: { ...headers, 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       error: '複数回のログイン失敗により、このIPアドレスはブロックされています。',
    //       message: 'お問い合わせください: nankan.analytics@gmail.com'
    //     })
    //   };
    // }

    // // 🔒 ログイン試行回数チェック（認証前）
    // const attemptCheck = checkLoginAttempt(ipAddress);
    // if (!attemptCheck.allowed) {
    //   console.log(`🚨 ログイン試行制限: ${ipAddress} - 残り${attemptCheck.remainingMinutes}分`);
    //   return {
    //     statusCode: 429,
    //     headers: { ...headers, 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       error: 'ログイン試行回数が上限に達しました。',
    //       message: `15分後に再度お試しください。（残り${attemptCheck.remainingMinutes}分）`,
    //       remainingMinutes: attemptCheck.remainingMinutes
    //     })
    //   };
    // }

    // Airtable設定
    console.log('🔍 Environment check - AIRTABLE_API_KEY exists:', !!process.env.AIRTABLE_API_KEY);
    console.log('🔍 Environment check - AIRTABLE_BASE_ID exists:', !!process.env.AIRTABLE_BASE_ID);

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID);

    // ユーザー検索（WithdrawalRequestedフィールドも取得）
    const records = await base('Customers')
      .select({
        filterByFormula: `{Email} = '${email}'`,
        maxRecords: 1
      })
      .firstPage();

    if (records.length === 0) {
      // ❌ ユーザーが見つからない = ログイン失敗
      // ※ただし、新規ユーザー登録は許可するため、失敗記録はしない
      // （実際のプロジェクトでは新規登録とログインを分離することを推奨）

      // 新規ユーザーとして登録
      const newRecord = await base('Customers').create({
        'Email': email,
        'プラン': 'Free',
        // PlanTypeは省略（無料登録時は不要、デフォルト値防止のため明示的に含めない）
        'ポイント': 1,
        '最終ポイント付与日': new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).toISOString().split('T')[0],
        'Source': 'nankan-analytics'  // 登録元サイト
      });

      // BlastMail読者登録（無料会員）
      try {
        await registerToBlastMail(email, 'nankan-analytics');
      } catch (blastMailError) {
        console.error('⚠️ BlastMail登録エラー（処理は継続）:', blastMailError.message);
        // BlastMailエラーでも処理は続行
      }

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

      // 🚨 一時的に無効化
      // // ✅ 新規登録成功 → ログイン試行カウンターリセット
      // resetLoginAttempts(ipAddress);

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
    let currentPlan = user.get('プラン') || 'free';
    const lastLogin = user.get('最終ポイント付与日');
    // 日本時間（JST）で日付を取得
    const jstDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const today = jstDate.toISOString().split('T')[0];

    // 🔍 退会申請チェック（2025-11-26追加）
    // 🔧 2025-11-27修正: let に変更（自動リセット時に再代入が必要）
    let withdrawalRequested = user.get('WithdrawalRequested') === 1 || user.get('WithdrawalRequested') === true;

    // 🔍 有効期限チェック（PremiumまたはStandardで期限切れならFreeに自動降格）
    let isExpired = false;
    let wasDowngraded = false;

    // 有効期限フィールド取得（日本語フィールド「有効期限」優先、互換性のためValidUntil/ExpiryDateも確認）
    const validUntil = user.get('有効期限') || user.get('ValidUntil') || user.get('ExpiryDate');

    if (validUntil) {
      const expiry = new Date(validUntil);
      const now = new Date();

      if (expiry < now) {
        isExpired = true;
        console.log(`⚠️ ユーザー ${email} は期限切れです（${validUntil}）`);
        // 🔧 2025-11-10修正: Free自動降格を削除
        // 理由: 退会者メルマガ配信のため、プラン名を維持する必要がある
        // 有効期限切れでもプランは変更せず、クライアントサイドで制御
      }
    }

    // 🔧 プラン値正規化: 大文字小文字混在問題解決
    const normalizedPlan = normalizePlan(currentPlan);

    // 🚨 2025-11-27修正: 有料プラン契約中なのに退会フラグが残っている場合は自動リセット + 有効期限修正
    // 原因: Standard退会 → Premium Sanrenpuku購入時にフラグ・有効期限がリセットされないバグ
    if (withdrawalRequested && !isExpired && (normalizedPlan !== 'Free' && normalizedPlan !== 'free')) {
      console.log(`⚠️ ユーザー ${email} は有料プラン契約中なのに退会フラグが残っています - 自動リセットします`);
      console.log(`   プラン: ${normalizedPlan}, 現在の有効期限: ${validUntil}, 期限切れ: ${isExpired}`);

      // 🔧 2025-11-27追加: 有効期限も正しい値に修正（有料プランなら1ヶ月後）
      const now = new Date();
      const newExpiryDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      const newExpiryDateStr = newExpiryDate.toISOString().split('T')[0];

      console.log(`   新しい有効期限: ${newExpiryDateStr}`);

      // 退会フラグ + 有効期限を自動リセット
      await base('Customers').update(user.id, {
        'WithdrawalRequested': false,
        'WithdrawalDate': null,
        'WithdrawalReason': null,
        '有効期限': newExpiryDateStr
      });

      // ローカル変数も更新（後続処理で正しい値を使用）
      withdrawalRequested = false;
      validUntil = newExpiryDateStr;
      console.log(`✅ 退会フラグ・有効期限リセット完了`);
    } else if (withdrawalRequested) {
      console.log(`🚫 ユーザー ${email} は退会申請済みです`);
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
      'Premium': 30,
      'Premium Combo': 30,
      'premium combo': 30,
      'Premium Sanrenpuku': 30,
      'premium sanrenpuku': 30,
      'Premium Plus': 30,
      'premium plus': 30
    };

    // 🚨 2025-11-26修正: 退会申請済み or 有効期限切れの場合はポイント付与なし
    // 通常のログインポイント（1日1回）
    if (lastLogin !== today) {
      if (withdrawalRequested || isExpired) {
        // 退会申請済み or 有効期限切れ → ポイント付与なし
        console.log(`🚫 ポイント付与停止: withdrawalRequested=${withdrawalRequested}, isExpired=${isExpired}`);
        pointsAdded = 0;
      } else {
        // 通常ユーザー → プラン別ポイント付与
        pointsAdded += POINTS_BY_PLAN[currentPlan] || 1;
      }
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

    // 🚨 一時的に無効化
    // // ✅ ログイン成功 → ログイン試行カウンターリセット
    // resetLoginAttempts(ipAddress);

    // 通常ユーザーのレスポンス
    let message = '';
    if (withdrawalRequested) {
      message = '退会申請済みです。新規ポイント付与・プレミアム機能のご利用はできません。';
    } else if (isExpired) {
      message = '有効期限が切れています。無料会員としてご利用いただけます。';
    } else if (pointsAdded > 0) {
      message = `ログイン成功！本日のポイント${pointsAdded}pt付与`;
    } else {
      message = 'ログイン成功！';
    }

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        isNewUser: false,
        isExpired: isExpired,  // 🔧 有効期限切れフラグを正確に返す
        isWithdrawalRequested: withdrawalRequested,  // 🔧 2025-11-26追加: 退会申請フラグ
        user: {
          email,
          plan: normalizedPlan,  // プランはそのまま（Premiumなど）
          points: newPoints,
          pointsAdded,
          lastLogin: today,
          validUntil: validUntil || null,  // 🔧 有効期限をレスポンスに含める
          registeredAt: user.get('登録日')
        },
        message: message
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
    case 'premium predictions':
    case 'プレミアム':
      return 'Premium';
    case 'premium combo':
    case 'premiumcombo':
    case 'プレミアムコンボ':
      return 'Premium Combo';
    case 'premium sanrenpuku':
    case 'premiumsanrenpuku':
    case 'プレミアム三連複':
      return 'Premium Sanrenpuku';
    case 'premium plus':
    case 'premiumplus':
    case 'プレミアムプラス':
      return 'Premium Plus';
    case 'standard':
    case 'スタンダード':
      return 'Standard';
    case 'free':
    case 'フリー':
    case '無料':
      return 'Free';
    default:
      console.warn(`⚠️ 未知のプラン値: "${planValue}" -> デフォルト 'Free'`);
      return 'Free';
  }
}

// BlastMail読者登録関数
async function registerToBlastMail(email, registrationSource = 'nankan-analytics') {
  const BLASTMAIL_USERNAME = process.env.BLASTMAIL_USERNAME;
  const BLASTMAIL_PASSWORD = process.env.BLASTMAIL_PASSWORD;
  const BLASTMAIL_API_KEY = process.env.BLASTMAIL_API_KEY;

  if (!BLASTMAIL_USERNAME || !BLASTMAIL_PASSWORD || !BLASTMAIL_API_KEY) {
    console.warn('⚠️ BlastMail credentials not configured, skipping reader registration');
    return null;
  }

  try {
    // Step 1: ログイン（access_token取得）
    const loginUrl = 'https://api.bme.jp/rest/1.0/authenticate/login';
    const loginParams = new URLSearchParams({
      username: BLASTMAIL_USERNAME,
      password: BLASTMAIL_PASSWORD,
      api_key: BLASTMAIL_API_KEY,
      format: 'json'
    });

    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: loginParams.toString()
    });

    if (!loginResponse.ok) {
      throw new Error(`BlastMail login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const accessToken = loginData.accessToken;

    if (!accessToken) {
      throw new Error('BlastMail access token not returned');
    }

    console.log('✅ BlastMail login successful, access_token obtained');

    // Step 2: 既存ユーザーチェック（メールアドレスで検索）
    const searchUrl = 'https://api.bme.jp/rest/1.0/contact/list';
    const searchParams = new URLSearchParams({
      access_token: accessToken,
      format: 'json',
      c15: email  // メールアドレスで検索
    });

    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: searchParams.toString()
    });

    let existingContact = null;
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.contacts && searchData.contacts.length > 0) {
        existingContact = searchData.contacts[0];
        console.log('ℹ️ BlastMail existing contact found:', email, 'ContactID:', existingContact.contactID);
      }
    }

    // Step 3: 既存ユーザーの場合は registration_source を追加更新
    if (existingContact) {
      const currentSource = existingContact.c19 || '';
      const sources = currentSource.split(',').map(s => s.trim()).filter(s => s);

      // 既に含まれている場合はスキップ
      if (sources.includes(registrationSource)) {
        console.log('ℹ️ Registration source already includes:', registrationSource);
        return existingContact;
      }

      // 新しいsourceを追加
      sources.push(registrationSource);
      const newSource = sources.join(',');

      // 既存ユーザーを更新
      const updateUrl = 'https://api.bme.jp/rest/1.0/contact/detail/update';
      const updateParams = new URLSearchParams({
        access_token: accessToken,
        format: 'json',
        contact_id: existingContact.contactID,
        c19: newSource  // カンマ区切りで追加
      });

      const updateResponse = await fetch(updateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: updateParams.toString()
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('⚠️ BlastMail update failed:', errorText);
        // BlastMail更新失敗でも処理は継続（ユーザー登録を優先）
        return existingContact;
      }

      console.log('✅ BlastMail registration_source updated:', email, 'New sources:', newSource);
      return existingContact;
    }

    // Step 4: 新規ユーザー登録
    const registerUrl = 'https://api.bme.jp/rest/1.0/contact/detail/create';
    const registerParams = new URLSearchParams({
      access_token: accessToken,
      format: 'json',
      c15: email,                           // E-Mail（必須フィールド）
      c19: registrationSource               // 登録元サイト（registration_source: c19）
    });

    const registerResponse = await fetch(registerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: registerParams.toString()
    });

    if (!registerResponse.ok) {
      const errorText = await registerResponse.text();
      console.log('⚠️ BlastMail registration response (not ok):', registerResponse.status, errorText);
      throw new Error(`BlastMail reader registration failed: ${registerResponse.status} - ${errorText}`);
    }

    const registerData = await registerResponse.json();
    console.log('✅ BlastMail reader registered:', email, 'ContactID:', registerData.contactID, 'registration_source:', registrationSource);
    return registerData;

  } catch (error) {
    console.error('❌ BlastMail registration error:', error);
    // BlastMailエラーでも処理は続行（登録は継続）
    return null;
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