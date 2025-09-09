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
    
    const { subject, htmlContent, scheduledAt, targetPlan = 'all' } = JSON.parse(requestBody);

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

    // Airtableから配信リスト取得
    const recipients = await getRecipientsList(targetPlan);
    
    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No recipients found' }),
        {
          status: 400,
          headers
        }
      );
    }

    // Brevo APIでメール送信
    const result = await sendNewsletterViaBrevo({
      recipients,
      subject,
      htmlContent,
      scheduledAt
    });

    // 配信履歴はフロントエンドのLocalStorageで管理

    return new Response(
      JSON.stringify({
        success: true,
        message: `Newsletter sent to ${recipients.length} recipients`,
        details: result,
        recipientCount: recipients.length,
        isScheduled: !!scheduledAt
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

// Brevo経由でメール送信
async function sendNewsletterViaBrevo({ recipients, subject, htmlContent, scheduledAt }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  
  try {
    const results = [];
    
    // 各受信者に個別送信（プライバシー保護のため）
    for (const recipient of recipients) {
      const emailData = {
        sender: {
          name: "NANKANアナリティクス",
          email: "info@keiba.link"
        },
        to: [{ email: recipient.email }], // 1人ずつ送信
        subject: subject,
        htmlContent: htmlContent,
        headers: {
          'X-Mailin-custom': 'newsletter',
          'charset': 'UTF-8'
        }
      };

      // スケジュール配信の場合（有効な日付のみ）
      if (scheduledAt && scheduledAt !== 'null' && scheduledAt.trim() !== '') {
        // 日本時間からUTCに変換
        const scheduledDate = new Date(scheduledAt);
        const now = new Date();
        
        console.log('スケジュール配信デバッグ:', {
          originalInput: scheduledAt,
          parsedDate: scheduledDate.toISOString(),
          currentTime: now.toISOString(),
          timeDifference: scheduledDate.getTime() - now.getTime(),
          isInFuture: scheduledDate > now
        });
        
        if (!isNaN(scheduledDate.getTime()) && scheduledDate > now) {
          emailData.scheduledAt = scheduledDate.toISOString();
          console.log('✅ スケジュール配信設定:', emailData.scheduledAt);
        } else if (scheduledDate <= now) {
          console.log('⚠️ 過去の時刻が指定されたため即座に送信:', scheduledAt);
          // 過去の時刻の場合はscheduledAtを設定しない（即座に送信）
        } else {
          console.log('❌ 無効な日付のためスケジュール配信をスキップ:', scheduledAt);
        }
      }

      console.log('Brevo APIリクエストデータ:', {
        senderEmail: emailData.sender.email,
        recipientEmail: emailData.to[0].email, // 個別送信なので1件のみ
        hasSubject: !!emailData.subject,
        hasHtmlContent: !!emailData.htmlContent,
        hasScheduledAt: !!emailData.scheduledAt
      });

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
        console.error('Brevo API error:', errorData);
        throw new Error(`Brevo API error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      results.push({
        email: recipient.email,
        messageId: result.messageId || 'sent',
        status: 'success'
      });

      // API制限を避けるため少し待機（100ms）
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`全${recipients.length}件の個別送信完了`);
    return results;

  } catch (error) {
    console.error('Error sending via Brevo:', error);
    throw error;
  }
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