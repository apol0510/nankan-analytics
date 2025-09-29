// 自作メールスケジューラー - 実行エンジンFunction
// Airtableから予約メールを取得して実行

export default async function handler(request, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !SENDGRID_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing configuration',
          success: false
        }),
        { status: 500, headers }
      );
    }

    const now = new Date();
    console.log('🕐 スケジューラー実行開始:', now.toISOString());

    // Airtableから実行対象のメールを取得
    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/ScheduledEmails`;
    const filterFormula = `AND({Status} = 'PENDING', IS_BEFORE({ScheduledFor}, '${now.toISOString()}'))`;
    
    const airtableResponse = await fetch(
      `${airtableUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!airtableResponse.ok) {
      throw new Error(`Airtable query failed: ${airtableResponse.status}`);
    }

    const scheduledEmails = await airtableResponse.json();
    const emailsToSend = scheduledEmails.records || [];

    console.log(`📧 実行対象メール数: ${emailsToSend.length}`);

    if (emailsToSend.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No emails to send',
          executedCount: 0,
          timestamp: now.toISOString()
        }),
        { status: 200, headers }
      );
    }

    const results = [];

    // 各メールを順次実行
    for (const emailRecord of emailsToSend) {
      const { id: recordId, fields } = emailRecord;
      const { Subject, Content, Recipients, JobId } = fields;

      try {
        console.log(`📤 送信開始: ${Subject} (${JobId})`);

        // ステータスを実行中に更新
        await updateEmailStatus(recordId, 'EXECUTING', AIRTABLE_API_KEY, AIRTABLE_BASE_ID);

        // 受信者リストを解析
        const recipientList = Recipients.split(',').map(email => email.trim()).filter(Boolean);

        // 🔐 プライバシー保護個別配信（SendGrid API使用）
        let successCount = 0;
        let failedCount = 0;

        for (const email of recipientList) {
          try {
            const emailData = {
              personalizations: [
                {
                  to: [{ email: email.trim() }], // 個別配信でプライバシー完全保護
                  subject: Subject
                }
              ],
              from: {
                name: "NANKANアナリティクス",
                email: "noreply@keiba.link"
              },
              content: [
                {
                  type: "text/html",
                  value: Content
                }
              ],
              // 🚨 重要：SendGridトラッキング完全無効化（復活防止対策 2025-09-29）
              tracking_settings: {
                click_tracking: {
                  enable: false,
                  enable_text: false
                },
                open_tracking: {
                  enable: false,
                  substitution_tag: null
                },
                subscription_tracking: {
                  enable: false
                },
                ganalytics: {
                  enable: false
                }
              },
              mail_settings: {
                bypass_list_management: {
                  enable: false
                },
                footer: {
                  enable: false
                },
                sandbox_mode: {
                  enable: false
                }
              }
            };

            const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SENDGRID_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(emailData)
            });

            if (sendGridResponse.ok) {
              successCount++;
              console.log(`✅ 個別送信成功: ${email}`);
            } else {
              failedCount++;
              const errorData = await sendGridResponse.text();
              console.error(`❌ 個別送信失敗 ${email}:`, errorData);
            }
          } catch (individualError) {
            failedCount++;
            console.error(`個別送信エラー ${email}:`, individualError);
          }
        }

        // 送信結果に基づく処理
        if (successCount > 0) {
          // 全部または一部成功
          await updateEmailStatus(recordId, 'SENT', AIRTABLE_API_KEY, AIRTABLE_BASE_ID);
          
          results.push({
            jobId: JobId,
            subject: Subject,
            recipientCount: recipientList.length,
            successCount,
            failedCount,
            status: failedCount === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS'
          });
        } else {
          // 全て失敗
          throw new Error(`全受信者への送信に失敗`);
        }

        console.log(`✅ 送信完了: ${Subject}`);

      } catch (sendError) {
        console.error(`❌ 送信失敗: ${Subject}`, sendError);

        // 送信失敗 - エラーステータス更新
        await updateEmailStatus(recordId, 'FAILED', AIRTABLE_API_KEY, AIRTABLE_BASE_ID, {
          FailedAt: now.toISOString(),
          ErrorMessage: sendError.message,
          RetryCount: (fields.RetryCount || 0) + 1
        });

        results.push({
          jobId: JobId,
          subject: Subject,
          status: 'FAILED',
          error: sendError.message
        });
      }
    }

    const successCount = results.filter(r => r.status === 'SUCCESS').length;
    const failedCount = results.filter(r => r.status === 'FAILED').length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `スケジューラー実行完了: 成功${successCount}件、失敗${failedCount}件`,
        executedCount: emailsToSend.length,
        successCount,
        failedCount,
        results,
        timestamp: now.toISOString()
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('Scheduler execution error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        success: false,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers }
    );
  }
}

// Airtableのメールステータスを更新するヘルパー関数
async function updateEmailStatus(recordId, status, apiKey, baseId, additionalFields = {}) {
  const updateData = {
    fields: {
      Status: status,
      ...additionalFields
    }
  };

  console.log(`🔄 Updating status for ${recordId} to ${status}:`, updateData);

  const response = await fetch(
    `https://api.airtable.com/v0/${baseId}/ScheduledEmails/${recordId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Status update failed for ${recordId}:`, errorText);
    throw new Error(`Status update failed: ${errorText}`);
  } else {
    console.log(`✅ Status updated successfully for ${recordId} to ${status}`);
  }
  
  return response.ok;
}