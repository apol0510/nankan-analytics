// Apolon予約配信実行Function
// Apolon_ScheduledEmailsテーブルから実行時刻が来たジョブを実行

export default async function handler(request, context) {
  const headers = {
    'Content-Type': 'application/json'
  };

  console.log('🐴 Apolon予約配信実行チェック開始');

  try {
    const airtableApiKey = process.env.AIRTABLE_API_KEY;
    const airtableBaseId = process.env.AIRTABLE_BASE_ID;
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    const scheduledTable = 'Apolon_ScheduledEmails'; // Apolon専用テーブル

    if (!airtableApiKey || !airtableBaseId || !sendGridApiKey) {
      throw new Error('Required environment variables not configured');
    }

    const now = new Date();
    const nowISO = now.toISOString();

    // 実行時刻が来たPENDINGジョブを取得
    const filterFormula = `AND(
      {Status} = 'PENDING',
      IS_BEFORE({ScheduledFor}, '${nowISO}')
    )`;

    const response = await fetch(
      `https://api.airtable.com/v0/${airtableBaseId}/${scheduledTable}?filterByFormula=${encodeURIComponent(filterFormula)}`,
      {
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Airtable fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const jobs = data.records;

    if (jobs.length === 0) {
      console.log('✅ Apolon実行待ちジョブなし');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No Apolon jobs to execute',
          timestamp: nowISO
        }),
        { status: 200, headers }
      );
    }

    console.log(`📦 Apolon実行対象ジョブ: ${jobs.length}件`);

    const results = [];

    // Apolon専用送信元アドレス
    const FROM_EMAIL = 'apolon@nankankeiba.jp';
    const FROM_NAME = 'アポロン競馬';

    for (const job of jobs) {
      const jobId = job.id;
      const fields = job.fields;
      const subject = fields.Subject;
      const content = fields.Content;
      const recipientsString = fields.Recipients;

      console.log(`🔄 Apolonジョブ ${jobId} 実行開始`);

      try {
        // ステータスをEXECUTINGに更新
        await fetch(`https://api.airtable.com/v0/${airtableBaseId}/${scheduledTable}/${jobId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${airtableApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: { Status: 'EXECUTING' }
          })
        });

        // 受信者リストをパース
        let recipients;
        try {
          recipients = JSON.parse(recipientsString);
        } catch (e) {
          throw new Error('Invalid recipients format');
        }

        if (!Array.isArray(recipients) || recipients.length === 0) {
          throw new Error('No recipients found');
        }

        console.log(`📧 Apolon配信先: ${recipients.length}件`);

        // バッチ送信（1000件ごと）
        const batchSize = 1000;
        let successCount = 0;

        for (let i = 0; i < recipients.length; i += batchSize) {
          const batch = recipients.slice(i, i + batchSize);

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
                  value: content
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
            console.log(`✅ Apolonバッチ送信成功: ${batch.length}件`);
          } else {
            const errorText = await sendResponse.text();
            console.error(`❌ Apolonバッチ送信失敗:`, errorText);
          }

          // レート制限対策
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // ステータスをSENTに更新
        await fetch(`https://api.airtable.com/v0/${airtableBaseId}/${scheduledTable}/${jobId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${airtableApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              Status: 'SENT',
              SentAt: new Date().toISOString()
            }
          })
        });

        console.log(`✅ Apolonジョブ ${jobId} 完了 - ${successCount}/${recipients.length}件送信`);

        results.push({
          jobId,
          subject,
          success: true,
          recipientCount: recipients.length,
          successCount
        });

      } catch (error) {
        console.error(`❌ Apolonジョブ ${jobId} 失敗:`, error);

        // ステータスをFAILEDに更新
        await fetch(`https://api.airtable.com/v0/${airtableBaseId}/${scheduledTable}/${jobId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${airtableApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              Status: 'FAILED',
              FailedAt: new Date().toISOString(),
              ErrorMessage: error.message,
              RetryCount: (fields.RetryCount || 0) + 1
            }
          })
        });

        results.push({
          jobId,
          subject,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Apolon予約配信実行完了: ${jobs.length}件`,
        results,
        timestamp: nowISO
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('🐴 Apolon予約配信実行エラー:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers }
    );
  }
}
