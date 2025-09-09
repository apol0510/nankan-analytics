// Brevoメルマガ配信Function
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

    // Brevo APIでメール送信（即座）
    const result = await sendNewsletterViaBrevo({
      recipients,
      subject,
      htmlContent
    });

    // 配信履歴はフロントエンドのLocalStorageで管理

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
        error: 'Failed to send newsletter',
        details: error.message 
      }),
      {
        status: 500,
        headers
      }
    );
  }
}

// Airtableから配信リスト取得
async function getRecipientsList(targetPlan) {
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  
  console.log('Airtable環境変数確認:', {
    hasApiKey: !!AIRTABLE_API_KEY,
    hasBaseId: !!AIRTABLE_BASE_ID,
    targetPlan: targetPlan
  });
  
  try {
    // プランによるフィルタリング（日本語フィールド名「プラン」を使用）
    let filterFormula = '';
    if (targetPlan === 'free') {
      filterFormula = '&filterByFormula=' + encodeURIComponent("{プラン}='Free'");
    } else if (targetPlan === 'standard') {
      filterFormula = '&filterByFormula=' + encodeURIComponent("OR({プラン}='Standard',{プラン}='standard')");
    } else if (targetPlan === 'premium') {
      filterFormula = '&filterByFormula=' + encodeURIComponent("OR({プラン}='Premium',{プラン}='premium')");
    } else if (targetPlan === 'paid') {
      filterFormula = '&filterByFormula=' + encodeURIComponent("OR({プラン}='Standard',{プラン}='Premium',{プラン}='standard',{プラン}='premium')");
    }
    // targetPlan === 'all' の場合はフィルタなし

    const apiUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Customers?fields%5B%5D=Email&fields%5B%5D=プラン${filterFormula}`;
    console.log('Airtable APIリクエストURL:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`
      }
    });

    console.log('Airtable APIレスポンス:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable APIエラーの詳細:', errorText);
      throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('取得したAirtableデータ:', {
      recordCount: data.records?.length || 0,
      firstRecord: data.records?.[0] || null
    });
    
    // メールアドレスのリストを作成
    const recipients = data.records
      .filter(record => record.fields.Email)
      .map(record => ({
        email: record.fields.Email,
        plan: record.fields.プラン || 'Free'
      }));

    console.log(`Found ${recipients.length} recipients for plan: ${targetPlan}`);
    console.log('Recipients preview:', recipients.slice(0, 3));
    
    return recipients;

  } catch (error) {
    console.error('Error fetching recipients:', error);
    throw error;
  }
}

// Brevo経由でメール送信（バッチ送信対応）
async function sendNewsletterViaBrevo({ recipients, subject, htmlContent, scheduledAt }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  
  try {
    const results = [];
    const failedEmails = [];
    
    // バッチサイズ（Brevoの制限に合わせて調整）
    const BATCH_SIZE = 50; // 一度に50件まで送信
    
    // 重要: Brevo SMTPの予約配信は動作しないため、常に即座に送信
    // scheduledAtパラメータは履歴記録用にのみ使用
    let isScheduledRequest = false;
    if (scheduledAt && scheduledAt !== 'null' && scheduledAt.trim() !== '') {
      const scheduledDate = new Date(scheduledAt);
      const now = new Date();
      
      console.log('予約配信リクエスト（注意: 即座に送信されます）:', {
        requestedTime: scheduledAt,
        parsedDate: scheduledDate.toISOString(),
        currentTime: now.toISOString(),
        note: 'Brevo制限により即座送信、履歴には予約として記録'
      });
      
      // 予約配信リクエストであることを記録（実際は即座に送信）
      isScheduledRequest = true;
      
      // 重要: scheduledAtISO は設定しない（Brevoの予約機能は使わない）
      // scheduledAtISO = null; // 明示的にnullを維持
    }
    
    // 受信者をバッチに分割して送信
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      
      // バッチ送信用のデータ準備
      const emailData = {
        sender: {
          name: "NANKANアナリティクス",
          email: "info@keiba.link"
        },
        to: batch.map(recipient => ({ 
          email: recipient.email,
          name: recipient.name || ''
        })),
        subject: subject,
        htmlContent: htmlContent,
        headers: {
          'X-Mailin-custom': 'newsletter',
          'charset': 'UTF-8'
        }
      };
      
      // 重要: scheduledAtは設定しない（Brevoの予約機能は動作しないため）
      // if (scheduledAtISO) {
      //   emailData.scheduledAt = scheduledAtISO;
      // }
      
      console.log(`バッチ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length}件送信中...`, {
        batchSize: batch.length,
        totalBatches: Math.ceil(recipients.length / BATCH_SIZE),
        hasScheduledAt: false, // 常にfalse（予約機能は使わない）
        firstEmail: batch[0]?.email
      });

      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': BREVO_API_KEY,
            'content-type': 'application/json'
          },
          body: JSON.stringify(emailData)
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error(`バッチ${Math.floor(i/BATCH_SIZE) + 1} エラー:`, errorData);
          
          // バッチ送信が失敗した場合、個別送信にフォールバック
          console.log('バッチ送信失敗のため個別送信にフォールバック...');
          for (const recipient of batch) {
            try {
              await sendIndividualEmail({ recipient, subject, htmlContent, scheduledAtISO: null, BREVO_API_KEY });
              results.push({
                email: recipient.email,
                messageId: 'individual-fallback',
                status: 'success',
                method: 'individual-fallback'
              });
            } catch (individualError) {
              console.error('個別送信もエラー:', recipient.email, individualError);
              failedEmails.push({
                email: recipient.email,
                error: individualError.message,
                plan: recipient.plan
              });
            }
          }
        } else {
          const result = await response.json();
          // バッチ送信成功
          batch.forEach(recipient => {
            results.push({
              email: recipient.email,
              messageId: result.messageId || 'batch-sent',
              status: 'success',
              method: 'batch'
            });
          });
          
          console.log(`✅ バッチ${Math.floor(i/BATCH_SIZE) + 1}送信完了: ${batch.length}件`);
        }
        
      } catch (error) {
        console.error(`バッチ${Math.floor(i/BATCH_SIZE) + 1} 送信エラー:`, error);
        
        // バッチエラーの場合も個別送信でフォールバック
        for (const recipient of batch) {
          failedEmails.push({
            email: recipient.email,
            error: error.message,
            plan: recipient.plan
          });
        }
      }
      
      // バッチ間の待機（API制限回避）
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`✅ バッチ送信完了: 成功${results.length}件、失敗${failedEmails.length}件`);
    
    // 失敗したメールがある場合の処理
    if (failedEmails.length > 0) {
      console.warn('送信失敗メール:', failedEmails);
    }
    
    return {
      results,
      failedEmails,
      totalSent: results.length,
      totalFailed: failedEmails.length
    };

  } catch (error) {
    console.error('Error sending via Brevo:', error);
    throw error;
  }
}

// 個別送信のフォールバック関数
async function sendIndividualEmail({ recipient, subject, htmlContent, scheduledAtISO, BREVO_API_KEY }) {
  const emailData = {
    sender: {
      name: "NANKANアナリティクス",
      email: "info@keiba.link"
    },
    to: [{ email: recipient.email }],
    subject: subject,
    htmlContent: htmlContent,
    headers: {
      'X-Mailin-custom': 'newsletter-individual',
      'charset': 'UTF-8'
    }
  };
  
  if (scheduledAtISO) {
    emailData.scheduledAt = scheduledAtISO;
  }
  
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify(emailData)
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Individual send failed: ${response.status} - ${errorData}`);
  }
  
  return await response.json();
}

// デフォルトテンプレート生成関数（オプション）
export function generateNewsletterTemplate({ 
  title, 
  mainContent, 
  predictions = [],
  ctaUrl = 'https://nankan-analytics.keiba.link/pricing/',
  ctaText = '有料プランで全レース予想を見る'
}) {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 40px 30px; text-align: center; }
        .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
        .tagline { font-size: 14px; color: #94a3b8; }
        .content { padding: 40px 30px; }
        .section-title { font-size: 24px; color: #0f172a; margin-bottom: 20px; font-weight: bold; }
        .prediction-card { background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #3b82f6; }
        .race-title { font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 10px; }
        .horses { margin: 10px 0; }
        .horse-item { padding: 5px 0; color: #475569; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 30px 0; }
        .footer { background: #f1f5f9; padding: 30px; text-align: center; color: #64748b; font-size: 12px; }
        .social-links { margin: 20px 0; }
        .social-link { color: #3b82f6; text-decoration: none; margin: 0 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏇 NANKANアナリティクス</div>
            <div class="tagline">AI・機械学習で勝つ南関競馬</div>
        </div>
        
        <div class="content">
            <h2 class="section-title">${title}</h2>
            
            <div style="color: #475569; line-height: 1.8;">
                ${mainContent}
            </div>
            
            ${predictions.length > 0 ? `
            <h3 style="color: #1e293b; margin-top: 40px; margin-bottom: 20px;">🎯 本日の注目予想</h3>
            ${predictions.map(p => `
            <div class="prediction-card">
                <div class="race-title">🏁 ${p.raceName}</div>
                <div class="horses">
                    ${p.horses.map(h => `
                    <div class="horse-item">${h}</div>
                    `).join('')}
                </div>
            </div>
            `).join('')}
            ` : ''}
            
            <div style="text-align: center;">
                <a href="${ctaUrl}" class="cta-button">${ctaText}</a>
            </div>
            
            <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin-top: 30px;">
                <h4 style="color: #92400e; margin-top: 0;">💡 お知らせ</h4>
                <p style="color: #78350f; line-height: 1.6; margin: 0;">
                    毎日ログインでポイントが貯まる！Premium会員なら1日50pt獲得。
                    貯めたポイントで特典と交換できます。
                </p>
            </div>
        </div>
        
        <div class="footer">
            <div class="social-links">
                <a href="#" class="social-link">Twitter</a>
                <a href="#" class="social-link">Facebook</a>
                <a href="https://nankan-analytics.keiba.link/" class="social-link">公式サイト</a>
            </div>
            <p>このメールは NANKANアナリティクス から配信されています。</p>
            <p>配信停止をご希望の場合は、<a href="#" style="color: #3b82f6;">こちら</a>からお手続きください。</p>
            <p>© 2025 NANKANアナリティクス All Rights Reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
}

// 配信履歴はフロントエンドのLocalStorageで管理するため、この関数は不要