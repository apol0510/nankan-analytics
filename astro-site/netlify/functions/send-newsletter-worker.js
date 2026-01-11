// Queue方式メルマガ配信システム - 送信ワーカー（Background Functions）
// PayPal Webhook Phase 7の冪等性設計応用
// pending → sending → success/failed の状態遷移で重複配信を構造的に防止

export default async function handler(request, context) {
  const headers = {
    'Content-Type': 'application/json'
  };

  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !SENDGRID_API_KEY) {
      throw new Error('Missing configuration');
    }

    // リクエストボディ解析
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      throw new Error('Missing required field: jobId');
    }

    console.log('🚀 送信ワーカー開始:', jobId);

    // 設定
    const BATCH_SIZE = 100; // 1回あたり100件
    const SEND_RATE_MS = 125; // 8通/秒（125ms/通）
    const MAX_EXECUTION_TIME = 13 * 60 * 1000; // 13分（余裕持たせる）
    const AIRTABLE_RATE_DELAY = 200; // Airtableレート制限対策（5rps）

    const startTime = Date.now();
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFailed = 0;

    // ===========================================
    // Step 0: ジョブ情報取得
    // ===========================================
    const jobsUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/NewsletterJobs`;
    const jobFilterFormula = `{JobId} = "${jobId}"`;
    const jobUrl = `${jobsUrl}?filterByFormula=${encodeURIComponent(jobFilterFormula)}`;

    const jobResponse = await fetch(jobUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`
      }
    });

    if (!jobResponse.ok) {
      throw new Error(`Job fetch failed: ${jobResponse.status}`);
    }

    const jobData = await jobResponse.json();
    if (jobData.records.length === 0) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const job = jobData.records[0];
    const { Subject, Content } = job.fields;

    console.log('📋 ジョブ情報:', Subject);

    // ===========================================
    // メインループ: 時間制限内で繰り返し
    // ===========================================
    while (Date.now() - startTime < MAX_EXECUTION_TIME) {
      console.log('🔄 バッチ処理開始...');

      // 1. pending のみ取得（BATCH_SIZE件）
      const queueUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/NewsletterQueue`;
      const filterFormula = `AND({JobId} = "${jobId}", {Status} = "pending")`;
      const queueFetchUrl = `${queueUrl}?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=${BATCH_SIZE}`;

      const queueResponse = await fetch(queueFetchUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`
        }
      });

      if (!queueResponse.ok) {
        throw new Error(`Queue fetch failed: ${queueResponse.status}`);
      }

      const queueData = await queueResponse.json();
      const queueRecords = queueData.records || [];

      if (queueRecords.length === 0) {
        console.log('✅ 全件送信完了（pendingレコード0件）');
        break;
      }

      console.log(`📊 取得: ${queueRecords.length}件（pending）`);

      // 2. 即座に sending に更新（バッチ操作・冪等性保証）
      const updatePayload = {
        records: queueRecords.map(record => ({
          id: record.id,
          fields: { 'Status': 'sending' }
        }))
      };

      const updateResponse = await fetch(queueUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });

      if (!updateResponse.ok) {
        console.error('❌ Status更新失敗:', updateResponse.status);
        // 失敗しても続行（次回実行でpendingが残っている可能性）
      } else {
        console.log('✅ Status更新完了: pending → sending');
      }

      await sleep(AIRTABLE_RATE_DELAY);

      // 3. SendGrid送信（スロットリング付き）
      let batchSuccess = 0;
      let batchFailed = 0;

      for (const record of queueRecords) {
        const email = record.fields.Email;
        const recordId = record.id;

        try {
          // 配信停止リンク追加
          const unsubscribeLink = `https://nankan-analytics.netlify.app/.netlify/functions/unsubscribe?email=${encodeURIComponent(email)}`;
          const htmlContent = `
            ${Content}

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <div style="text-align: center; padding: 20px; background-color: #f9fafb; font-size: 12px; color: #6b7280; font-family: Arial, sans-serif;">
              <p style="margin: 0 0 10px 0;">このメールは NANKANアナリティクス からお送りしています</p>
              <p style="margin: 10px 0;">
                <a href="${unsubscribeLink}" style="color: #dc2626; text-decoration: underline;">
                  🚫 配信停止はこちら
                </a>
              </p>
            </div>
          `;

          // SendGrid送信
          const emailData = {
            personalizations: [
              {
                to: [{ email: email.trim() }],
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
                value: htmlContent
              }
            ],
            tracking_settings: {
              click_tracking: { enable: false },
              open_tracking: { enable: false },
              subscription_tracking: { enable: false }
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
            // 成功 → success
            await fetch(`${queueUrl}/${recordId}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                fields: {
                  'Status': 'success',
                  'SentAt': new Date().toISOString()
                }
              })
            });

            batchSuccess++;
            console.log(`✅ 送信成功: ${email}`);

          } else {
            // 失敗 → failed
            const errorData = await sendGridResponse.text();

            await fetch(`${queueUrl}/${recordId}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                fields: {
                  'Status': 'failed',
                  'LastError': errorData.substring(0, 500), // 最大500文字
                  'RetryCount': (record.fields.RetryCount || 0) + 1
                }
              })
            });

            batchFailed++;
            console.error(`❌ 送信失敗: ${email} - ${errorData.substring(0, 100)}`);
          }

        } catch (individualError) {
          // 例外 → failed
          await fetch(`${queueUrl}/${recordId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fields: {
                'Status': 'failed',
                'LastError': individualError.message.substring(0, 500),
                'RetryCount': (record.fields.RetryCount || 0) + 1
              }
            })
          }).catch(err => console.error('❌ Status更新失敗:', err));

          batchFailed++;
          console.error(`❌ 例外発生: ${email} - ${individualError.message}`);
        }

        // スロットリング（8通/秒 = 125ms/通）
        await sleep(SEND_RATE_MS);
      }

      totalProcessed += queueRecords.length;
      totalSuccess += batchSuccess;
      totalFailed += batchFailed;

      console.log(`📊 バッチ結果: 成功${batchSuccess}件、失敗${batchFailed}件`);

      // 4. Job集計更新
      await fetch(`${jobsUrl}/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            'SentSuccess': job.fields.SentSuccess + batchSuccess,
            'SentFailed': job.fields.SentFailed + batchFailed
          }
        })
      });

      await sleep(AIRTABLE_RATE_DELAY);

      // タイムアウトチェック
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log('⏱️ タイムアウト接近・次回実行へ');
        break;
      }
    }

    // ===========================================
    // 完了判定
    // ===========================================
    const remainingUrl = `${queueUrl}?filterByFormula=${encodeURIComponent(`AND({JobId} = "${jobId}", {Status} = "pending")`)}`;
    const remainingResponse = await fetch(remainingUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`
      }
    });

    const remainingData = await remainingResponse.json();
    const remainingCount = remainingData.records.length;

    if (remainingCount === 0) {
      // 全件完了
      await fetch(`${jobsUrl}/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            'Status': 'completed',
            'CompletedAt': new Date().toISOString()
          }
        })
      });

      console.log('🎉 全件送信完了: completed');
    } else {
      // 送信中
      await fetch(`${jobsUrl}/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            'Status': 'sending'
          }
        })
      });

      console.log(`🔄 送信継続中: 残り${remainingCount}件`);
    }

    // ===========================================
    // 完了レスポンス
    // ===========================================
    const result = {
      success: true,
      jobId,
      totalProcessed,
      totalSuccess,
      totalFailed,
      remainingCount,
      status: remainingCount === 0 ? 'completed' : 'sending',
      executionTime: Math.round((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString()
    };

    console.log('✅ ワーカー完了:', result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('❌ ワーカーエラー:', error);

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

// ヘルパー関数: Sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
