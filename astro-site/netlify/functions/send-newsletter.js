// SendGridメルマガ配信Function
// 南関競馬の予想結果や攻略情報を配信

export default async function handler(request, context) {
  // CORS対応ヘッダー
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONSリクエスト対応
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers
    });
  }

  // POSTメソッドのみ受付
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: `Method ${request.method} not allowed` }),
      {
        status: 405,
        headers
      }
    );
  }

  try {
    const requestBody = await request.text();
    console.log('Received request body:', requestBody);

    const { subject, htmlContent, scheduledAt, targetPlan = 'all', retryEmails } = JSON.parse(requestBody);

    // 🔍 デバッグログ追加
    console.log('🎯 パラメータ詳細確認:', {
      subject,
      targetPlan,
      scheduledAt,
      hasRetryEmails: !!retryEmails
    });

    // 必須パラメータチェック
    if (!subject || !htmlContent) {
      return new Response(
        JSON.stringify({ error: 'Subject and htmlContent are required' }),
        {
          status: 400,
          headers
        }
      );
    }

    const isScheduledRequest = !!scheduledAt;

    // 予約配信の場合は自作スケジューラーを使用
    if (isScheduledRequest) {
      console.log('📅 予約配信リクエスト - 自作スケジューラーに転送');

      // 配信リスト取得
      const recipients = await getRecipientsList(targetPlan);
      if (recipients.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No recipients found for scheduling' }),
          { status: 400, headers }
        );
      }

      // 自作スケジューラーにジョブを登録
      const baseUrl = request.url.substring(0, request.url.lastIndexOf('/'));
      const scheduleResponse = await fetch(`${baseUrl}/schedule-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject,
          content: htmlContent,
          recipients: recipients,
          scheduledFor: scheduledAt,
          createdBy: 'admin',
          targetPlan
        })
      });

      if (!scheduleResponse.ok) {
        const errorText = await scheduleResponse.text();
        throw new Error(`スケジューラー登録失敗: ${scheduleResponse.status} - ${errorText}`);
      }

      const scheduleResult = await scheduleResponse.json();

      return new Response(
        JSON.stringify({
          success: true,
          isScheduled: true,
          jobId: scheduleResult.jobId,
          scheduledFor: scheduledAt,
          message: `メール予約完了: ${subject}`,
          data: {
            subject,
            recipientCount: recipients.length,
            scheduledTime: scheduleResult.data.scheduledTime,
            note: '自作スケジューラーで確実配信予定'
          },
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers }
      );
    }

    // 即座に送信の場合
    // 配信リスト取得（再送信の場合は再送信リストを使用）
    let recipients;
    if (retryEmails && Array.isArray(retryEmails)) {
      console.log('再送信モード:', retryEmails.length + '件');
      recipients = retryEmails;
    } else {
      recipients = await getRecipientsList(targetPlan);
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No recipients found' }),
        {
          status: 400,
          headers
        }
      );
    }

    // SendGrid APIでメール送信（即座）
    const result = await sendNewsletterViaSendGrid({
      recipients,
      subject,
      htmlContent
    });

    // 即時配信もAirtableに履歴を保存
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

    if (AIRTABLE_API_KEY && AIRTABLE_BASE_ID) {
      try {
        const now = new Date();
        const historyData = {
          fields: {
            Subject: subject,
            Content: htmlContent.substring(0, 10000), // 最初の10000文字のみ保存
            Recipients: recipients.slice(0, 100).join(', '), // 最初の100件のメールのみ
            ScheduledFor: now.toISOString(),
            Status: 'SENT',
            JobId: `immediate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            CreatedBy: 'admin',
            SentAt: now.toISOString(),
            MessageId: result.messageId || `msg_${Date.now()}`,
            RecipientCount: result.totalSent,
            FailedCount: result.totalFailed,
            TargetPlan: targetPlan || 'all',
            Notes: `即時配信: 成功${result.totalSent}件, 失敗${result.totalFailed}件`
          }
        };

        console.log('📝 即時配信履歴をAirtableに保存中...');

        const airtableResponse = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/ScheduledEmails`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(historyData)
          }
        );

        if (airtableResponse.ok) {
          console.log('✅ 即時配信履歴をAirtableに保存しました');
        } else {
          console.error('⚠️ 履歴保存に失敗しましたが、配信は成功しています');
        }
      } catch (historyError) {
        console.error('履歴保存エラー（配信は成功）:', historyError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Newsletter sent to ${result.totalSent} recipients`,
        details: result,
        recipientCount: result.totalSent,
        failedCount: result.totalFailed,
        failedEmails: result.failedEmails,
        isScheduled: false,
        actualSendTime: new Date().toISOString()
      }),
      {
        status: 200,
        headers
      }
    );

  } catch (error) {
    console.error('Newsletter send error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers
      }
    );
  }
}

// Airtableから受信者リストを取得
async function getRecipientsList(targetPlan) {
  console.log('配信対象プラン:', targetPlan);

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.error('Airtable設定が見つかりません');
    return [];
  }

  try {
    let filterFormula = '';

    // プランに基づくフィルタリング
    if (targetPlan === 'free') {
      filterFormula = "{プラン} = 'Free'";
    } else if (targetPlan === 'standard') {
      filterFormula = "OR({プラン} = 'Standard', {プラン} = 'Premium')";
    } else if (targetPlan === 'premium') {
      filterFormula = "{プラン} = 'Premium'";
    } else if (targetPlan === 'test') {
      filterFormula = "{プラン} = 'Test'"; // バウンス管理テスト専用
    } else if (targetPlan === 'all') {
      // 全員に配信
      filterFormula = '';
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Customers`;
    const queryParams = filterFormula ? `?filterByFormula=${encodeURIComponent(filterFormula)}` : '';

    console.log('🔍 Airtable検索:', {
      url: url + queryParams,
      filterFormula,
      targetPlan: '指定されたプラン'
    });

    const response = await fetch(url + queryParams, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();

    console.log('📋 Airtable生データ:', {
      recordCount: data.records?.length || 0,
      records: data.records?.slice(0, 3).map(r => ({
        email: r.fields.Email,
        plan: r.fields['プラン'] || r.fields.Plan
      })) || []
    });

    const recipients = data.records
      .map(record => record.fields.Email)
      .filter(email => email && email.includes('@'));

    console.log(`📧 取得した受信者数: ${recipients.length}`, recipients);

    // バウンス管理: 無効なメールアドレスをフィルタリング
    const validRecipients = await filterValidEmails(recipients);
    console.log(`✅ 有効な受信者数: ${validRecipients.length} (除外: ${recipients.length - validRecipients.length}件)`);

    return validRecipients;

  } catch (error) {
    console.error('受信者リスト取得エラー:', error);
    return [];
  }
}

// SendGrid APIでメール送信
async function sendNewsletterViaSendGrid({ recipients, subject, htmlContent }) {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

  if (!SENDGRID_API_KEY) {
    throw new Error('SendGrid API key not configured');
  }

  const results = {
    totalSent: 0,
    totalFailed: 0,
    failedEmails: []
  };

  // 🔐 プライバシー保護個別配信システム（BCC問題対応）
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];

    try {
      const emailData = {
        personalizations: [
          {
            to: [{ email: recipient }], // 個別配信でプライバシー完全保護
            subject: subject
          }
        ],
        from: {
          name: "NANKANアナリティクス",
          email: "nankan-analytics@keiba.link"
        },
        content: [
          {
            type: "text/html",
            value: htmlContent
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

      if (response.ok) {
        results.totalSent += 1;
        console.log(`✅ 個別送信成功: ${recipient}`);
      } else {
        const errorData = await response.text();
        console.error(`❌ 個別送信失敗 ${recipient}:`, errorData);

        // 🔍 SendGridエラー詳細解析でバウンス検知
        const bounceInfo = await analyzeSendGridBounce(recipient, response.status, errorData);
        if (bounceInfo.isBounce) {
          await updateBounceRecord(recipient, bounceInfo);
          console.log(`🚫 バウンス検知・記録更新: ${recipient} (${bounceInfo.type})`);
        }

        results.totalFailed += 1;
        results.failedEmails.push(recipient);
      }

    } catch (error) {
      console.error(`個別送信エラー ${recipient}:`, error);
      results.totalFailed += 1;
      results.failedEmails.push(recipient);
    }
  }

  return results;
}

// 🛡️ 高度なバウンス管理システム
async function filterValidEmails(emails) {
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.log('⚠️ バウンス管理: 環境変数未設定のため全メール有効として処理');
    return emails;
  }

  const validEmails = [];
  const invalidEmails = [];
  const quarantinedEmails = []; // 検疫中のメール

  for (const email of emails) {
    try {
      // 基本的なフォーマットチェック
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        invalidEmails.push({ email, reason: 'invalid-format' });
        continue;
      }

      // バウンス履歴チェック
      const bounceStatus = await checkBounceHistory(email);

      if (bounceStatus.isBlacklisted) {
        invalidEmails.push({
          email,
          reason: bounceStatus.reason,
          bounceCount: bounceStatus.bounceCount,
          lastBounce: bounceStatus.lastBounceDate
        });
        continue;
      }

      if (bounceStatus.isQuarantined) {
        quarantinedEmails.push({
          email,
          reason: 'soft-bounce-warning',
          bounceCount: bounceStatus.bounceCount,
          remainingAttempts: 5 - bounceStatus.bounceCount
        });
        // 検疫中でも配信は継続（最後のチャンス）
      }

      validEmails.push(email);

    } catch (error) {
      console.error(`バウンス管理エラー ${email}:`, error);
      // エラー時は安全のため有効として扱う
      validEmails.push(email);
    }
  }

  // 詳細ログ出力
  if (invalidEmails.length > 0) {
    console.log('🚫 ブラックリスト除外:', invalidEmails);
  }
  if (quarantinedEmails.length > 0) {
    console.log('⚠️ 検疫中（最後のチャンス）:', quarantinedEmails);
  }

  console.log(`📊 バウンス管理結果: 有効${validEmails.length}件, 除外${invalidEmails.length}件, 検疫${quarantinedEmails.length}件`);

  return validEmails;
}

// バウンス履歴の詳細チェック
async function checkBounceHistory(email) {
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/EmailBlacklist?filterByFormula=SEARCH('${email}',{Email})`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return { isBlacklisted: false, isQuarantined: false };
    }

    const data = await response.json();

    if (data.records.length === 0) {
      return { isBlacklisted: false, isQuarantined: false };
    }

    const record = data.records[0].fields;
    const bounceCount = record.BounceCount || 0;
    const bounceType = record.BounceType || 'unknown';
    const status = record.Status || 'UNKNOWN';
    const lastBounceDate = record.LastBounceDate;

    // 永続的エラー（Hard Bounce）= 即座にブラックリスト
    if (bounceType === 'hard' || status === 'HARD_BOUNCE' || status === 'COMPLAINT') {
      return {
        isBlacklisted: true,
        isQuarantined: false,
        reason: bounceType === 'hard' ? 'hard-bounce' : 'complaint',
        bounceCount,
        lastBounceDate
      };
    }

    // 一時的エラー（Soft Bounce）= 5回で昇格
    if (bounceType === 'soft' && bounceCount >= 5) {
      // 5回に達したので永続的エラーに昇格
      await upgradeToHardBounce(email, record);
      return {
        isBlacklisted: true,
        isQuarantined: false,
        reason: 'soft-bounce-upgraded',
        bounceCount,
        lastBounceDate
      };
    }

    // 一時的エラー（Soft Bounce）= 検疫中（3-4回）
    if (bounceType === 'soft' && bounceCount >= 3) {
      return {
        isBlacklisted: false,
        isQuarantined: true,
        reason: 'soft-bounce-warning',
        bounceCount,
        lastBounceDate
      };
    }

    // その他は有効
    return { isBlacklisted: false, isQuarantined: false };

  } catch (error) {
    console.error(`バウンス履歴チェックエラー ${email}:`, error);
    return { isBlacklisted: false, isQuarantined: false };
  }
}

// Soft BounceをHard Bounceに昇格
async function upgradeToHardBounce(email, currentRecord) {
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

  try {
    const recordId = currentRecord.id || currentRecord.recordId;

    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/EmailBlacklist/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          Status: 'HARD_BOUNCE',
          BounceType: 'hard',
          UpgradedAt: new Date().toISOString(),
          Notes: `Soft bounce上限(5回)に達したため永続エラーに昇格`
        }
      })
    });

    console.log(`🔄 ${email}: Soft→Hard Bounce昇格完了`);

  } catch (error) {
    console.error(`Bounce昇格エラー ${email}:`, error);
  }
}

// 🔍 SendGridエラー詳細解析でバウンス種別判定
async function analyzeSendGridBounce(email, statusCode, errorData) {
  const bounceInfo = {
    isBounce: false,
    type: 'unknown',
    reason: 'unknown'
  };

  try {
    // SendGrid APIエラーレスポンス解析
    let errorObj;
    try {
      errorObj = JSON.parse(errorData);
    } catch {
      errorObj = { message: errorData };
    }

    const errorMessage = (errorObj.message || errorData || '').toLowerCase();

    // Hard Bounce判定条件
    const hardBounceIndicators = [
      'invalid',
      'not exist',
      'unknown user',
      'mailbox not found',
      'no such user',
      'user unknown',
      'recipient address rejected',
      'does not match a verified sender identity'
    ];

    // Soft Bounce判定条件
    const softBounceIndicators = [
      'mailbox full',
      'quota',
      'temporary failure',
      'deferred',
      'try again later',
      'service unavailable'
    ];

    // Hard Bounce判定
    if (statusCode === 400 || hardBounceIndicators.some(indicator => errorMessage.includes(indicator))) {
      bounceInfo.isBounce = true;
      bounceInfo.type = 'hard';
      bounceInfo.reason = 'hard-bounce';
    }
    // Soft Bounce判定
    else if (statusCode === 421 || statusCode === 450 || softBounceIndicators.some(indicator => errorMessage.includes(indicator))) {
      bounceInfo.isBounce = true;
      bounceInfo.type = 'soft';
      bounceInfo.reason = 'soft-bounce';
    }
    // 一般的な送信エラー（400番台）もバウンスとして扱う
    else if (statusCode >= 400 && statusCode < 500) {
      bounceInfo.isBounce = true;
      bounceInfo.type = 'hard'; // 安全のためHard Bounceとして扱う
      bounceInfo.reason = 'send-error';
    }

    console.log(`🔍 バウンス解析結果 ${email}:`, {
      statusCode,
      errorMessage: errorMessage.substring(0, 100),
      bounceInfo
    });

  } catch (error) {
    console.error(`バウンス解析エラー ${email}:`, error);
  }

  return bounceInfo;
}

// 📝 バウンス記録更新・新規作成
async function updateBounceRecord(email, bounceInfo) {
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.log('⚠️ Airtable環境変数未設定のためバウンス記録をスキップ');
    return;
  }

  try {
    // 既存記録チェック
    const existingRecordResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/EmailBlacklist?filterByFormula=SEARCH('${email}',{Email})`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!existingRecordResponse.ok) {
      throw new Error(`既存記録検索失敗: ${existingRecordResponse.status}`);
    }

    const existingData = await existingRecordResponse.json();
    const now = new Date().toISOString();

    if (existingData.records.length > 0) {
      // 既存記録更新
      const record = existingData.records[0];
      const currentCount = record.fields.BounceCount || 0;
      const newCount = currentCount + 1;

      // Soft Bounceが5回に達したらHard Bounceに昇格
      const finalType = bounceInfo.type === 'soft' && newCount >= 5 ? 'hard' : bounceInfo.type;
      const finalStatus = finalType === 'hard' ? 'HARD_BOUNCE' : 'SOFT_BOUNCE';

      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/EmailBlacklist/${record.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            BounceCount: newCount,
            BounceType: finalType,
            Status: finalStatus,
            LastBounceDate: now,
            Notes: `${bounceInfo.reason} (${currentCount}→${newCount}回)${newCount >= 5 && bounceInfo.type === 'soft' ? ' [自動昇格]' : ''}`
          }
        })
      });

      console.log(`📝 バウンス記録更新完了: ${email} (${currentCount}→${newCount}回, ${finalType})`);

    } else {
      // 新規記録作成
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/EmailBlacklist`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            Email: email,
            BounceCount: 1,
            BounceType: bounceInfo.type,
            Status: bounceInfo.type === 'hard' ? 'HARD_BOUNCE' : 'SOFT_BOUNCE',
            LastBounceDate: now,
            AddedAt: now,
            Source: 'SendGrid API Direct',
            Notes: `初回バウンス: ${bounceInfo.reason}`
          }
        })
      });

      console.log(`📝 新規バウンス記録作成: ${email} (${bounceInfo.type})`);
    }

  } catch (error) {
    console.error(`バウンス記録更新エラー ${email}:`, error);
  }
}