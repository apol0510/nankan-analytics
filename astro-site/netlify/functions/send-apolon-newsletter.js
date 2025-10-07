// Apolonメルマガ配信Function（完全独立版）
// apolon@nankankeiba.jp から配信

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
    console.log('🐴 Apolon配信 - Received request body:', requestBody);

    const { subject, htmlContent, scheduledAt, retryEmails } = JSON.parse(requestBody);

    // 🔍 デバッグログ
    console.log('🐴 Apolon配信パラメータ:', {
      subject,
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
      console.log('📅 Apolon予約配信 - スケジューラーに転送');

      // Apolon配信リスト取得
      const recipients = await getApolonRecipientsList();
      if (recipients.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No Apolon recipients found for scheduling' }),
          { status: 400, headers }
        );
      }

      // Apolon専用スケジューラーにジョブ登録
      const baseUrl = request.url.substring(0, request.url.lastIndexOf('/'));
      const scheduleResponse = await fetch(`${baseUrl}/schedule-apolon-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject,
          content: htmlContent,
          recipients: recipients,
          scheduledFor: scheduledAt,
          createdBy: 'apolon-admin'
        })
      });

      if (!scheduleResponse.ok) {
        const errorText = await scheduleResponse.text();
        throw new Error(`Apolonスケジューラー登録失敗: ${scheduleResponse.status} - ${errorText}`);
      }

      const scheduleResult = await scheduleResponse.json();

      return new Response(
        JSON.stringify({
          success: true,
          isScheduled: true,
          jobId: scheduleResult.jobId,
          scheduledFor: scheduledAt,
          message: `Apolonメール予約完了: ${subject}`,
          data: {
            subject,
            recipientCount: recipients.length,
            scheduledTime: scheduleResult.data.scheduledTime,
            note: 'Apolon専用スケジューラーで配信予定'
          },
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers }
      );
    }

    // 即座に送信の場合
    let recipients;
    if (retryEmails && Array.isArray(retryEmails)) {
      console.log('🐴 Apolon再送信モード:', retryEmails.length + '件');
      recipients = retryEmails;
    } else {
      recipients = await getApolonRecipientsList();
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No Apolon recipients found' }),
        {
          status: 400,
          headers
        }
      );
    }

    console.log(`📧 Apolon即時配信開始: ${recipients.length}件`);

    // SendGrid APIで即時送信
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendGridApiKey) {
      throw new Error('SENDGRID_API_KEY not configured');
    }

    // Apolon専用送信元アドレス
    const FROM_EMAIL = 'apolon@nankankeiba.jp';
    const FROM_NAME = 'アポロン競馬';

    // バッチ送信（1000件ごと）
    const batchSize = 1000;
    const batches = [];
    for (let i = 0; i < recipients.length; i += batchSize) {
      batches.push(recipients.slice(i, i + batchSize));
    }

    let successCount = 0;
    let failedEmails = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`📦 Apolonバッチ ${i + 1}/${batches.length}: ${batch.length}件`);

      try {
        const personalizations = batch.map(email => ({
          to: [{ email }],
          subject: subject
        }));

        const sendResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendGridApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations,
            from: {
              email: FROM_EMAIL,
              name: FROM_NAME
            },
            reply_to: {
              email: FROM_EMAIL,
              name: FROM_NAME
            },
            subject: subject,
            content: [
              {
                type: 'text/html',
                value: htmlContent
              }
            ],
            tracking_settings: {
              click_tracking: { enable: true },
              open_tracking: { enable: true }
            }
          })
        });

        if (sendResponse.ok) {
          successCount += batch.length;
          console.log(`✅ Apolonバッチ ${i + 1} 送信成功`);
        } else {
          const errorText = await sendResponse.text();
          console.error(`❌ Apolonバッチ ${i + 1} 送信失敗:`, errorText);
          failedEmails.push(...batch);
        }
      } catch (error) {
        console.error(`❌ Apolonバッチ ${i + 1} エラー:`, error);
        failedEmails.push(...batch);
      }

      // レート制限対策: バッチ間で少し待機
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Airtableに配信ログ記録
    await recordApolonEmailLog({
      subject,
      recipientCount: recipients.length,
      successCount,
      failedCount: failedEmails.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Apolon配信完了: ${successCount}/${recipients.length}件`,
        data: {
          subject,
          totalRecipients: recipients.length,
          successCount,
          failedCount: failedEmails.length,
          failedEmails: failedEmails.slice(0, 10) // 最初の10件のみ返す
        },
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('🐴 Apolon配信エラー:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers
      }
    );
  }
}

// Apolon配信リスト取得（Apolon_Customersテーブルから）
async function getApolonRecipientsList() {
  const airtableApiKey = process.env.AIRTABLE_API_KEY;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;
  const apolonTable = 'Apolon_Customers'; // Apolon専用テーブル

  if (!airtableApiKey || !airtableBaseId) {
    throw new Error('Airtable credentials not configured');
  }

  console.log(`🔍 Apolon配信リスト取得: ${apolonTable}`);

  let allRecords = [];
  let offset = null;

  // 全レコード取得（ページネーション対応）
  do {
    let url = `https://api.airtable.com/v0/${airtableBaseId}/${apolonTable}?pageSize=100`;
    if (offset) {
      url += `&offset=${offset}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;

  } while (offset);

  console.log(`📊 Apolon総レコード数: ${allRecords.length}`);

  // activeなメールアドレスのみ抽出
  const activeRecipients = allRecords
    .filter(record => {
      const status = record.fields.Status || record.fields.status;
      const email = record.fields.Email || record.fields.email;
      return status === 'active' && email;
    })
    .map(record => record.fields.Email || record.fields.email);

  console.log(`✅ Apolon配信対象: ${activeRecipients.length}件`);

  return activeRecipients;
}

// Apolon配信ログ記録
async function recordApolonEmailLog(logData) {
  const airtableApiKey = process.env.AIRTABLE_API_KEY;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;

  // EmailLogsテーブルがあれば記録（オプション）
  // なければスキップ
  try {
    await fetch(`https://api.airtable.com/v0/${airtableBaseId}/EmailLogs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          Site: 'Apolon',
          Subject: logData.subject,
          RecipientCount: logData.recipientCount,
          SuccessCount: logData.successCount,
          FailedCount: logData.failedCount,
          SentAt: new Date().toISOString()
        }
      })
    });
    console.log('📝 Apolon配信ログ記録完了');
  } catch (error) {
    console.warn('⚠️ Apolon配信ログ記録スキップ:', error.message);
  }
}
