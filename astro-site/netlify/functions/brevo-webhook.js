// Brevo Webhookエンドポイント
// バウンス、エラー、配信失敗をリアルタイムで受信してAirtable更新

export default async function handler(request, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONS対応
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  // POSTメソッドのみ受付
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { status: 405, headers }
    );
  }

  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      console.error('Airtable configuration missing');
      return new Response(
        JSON.stringify({ error: 'Configuration error' }),
        { status: 500, headers }
      );
    }

    // Brevoからのイベントデータ
    const event = await request.json();
    console.log('📨 Brevo Webhook受信:', {
      event: event.event,
      email: event.email,
      messageId: event['message-id'],
      reason: event.reason,
      timestamp: event.ts
    });

    // イベントタイプ判定
    const eventType = event.event;
    const email = event.email;

    if (!email) {
      console.log('⚠️ メールアドレスなし、スキップ');
      return new Response(
        JSON.stringify({ success: true, message: 'No email to process' }),
        { status: 200, headers }
      );
    }

    // バウンス関連イベントの処理
    const bounceEvents = ['hard_bounce', 'soft_bounce', 'blocked', 'invalid_email', 'deferred'];
    
    if (bounceEvents.includes(eventType)) {
      console.log(`🔴 バウンスイベント検出: ${eventType} for ${email}`);
      
      // バウンスタイプ判定
      const isHardBounce = ['hard_bounce', 'blocked', 'invalid_email'].includes(eventType);
      const bounceType = isHardBounce ? 'hard' : 'soft';
      
      // EmailBlacklistテーブル更新
      await updateEmailBlacklist(email, {
        bounceType,
        eventType,
        reason: event.reason || eventType,
        messageId: event['message-id'],
        timestamp: new Date(event.ts * 1000).toISOString()
      });

      // Customersテーブルのステータス更新
      await updateCustomerStatus(email, eventType);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Bounce recorded for ${email}`,
          bounceType,
          eventType
        }),
        { status: 200, headers }
      );
    }

    // 配信成功イベント
    if (eventType === 'delivered') {
      console.log(`✅ 配信成功: ${email}`);
      // 必要に応じて成功記録
    }

    // 開封・クリックイベント
    if (['opened', 'click'].includes(eventType)) {
      console.log(`📧 エンゲージメント: ${eventType} by ${email}`);
      // エンゲージメント記録（オプション）
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Event processed: ${eventType}` 
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('Webhook処理エラー:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Processing error',
        success: false 
      }),
      { status: 500, headers }
    );
  }

  // EmailBlacklistテーブル更新関数
  async function updateEmailBlacklist(email, bounceInfo) {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const blacklistUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/EmailBlacklist`;

    try {
      // 既存レコード検索
      const searchUrl = `${blacklistUrl}?filterByFormula={Email}="${email}"`;
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const searchData = await searchResponse.json();
      const existingRecord = searchData.records?.[0];

      if (existingRecord) {
        // 既存レコード更新
        const currentCount = existingRecord.fields.BounceCount || 0;
        const newCount = currentCount + 1;
        
        // 5回以上のソフトバウンスはハードバウンスに昇格
        const finalBounceType = (bounceInfo.bounceType === 'soft' && newCount >= 5) ? 'hard' : bounceInfo.bounceType;
        const finalStatus = finalBounceType === 'hard' ? 'HARD_BOUNCE' : 'SOFT_BOUNCE';

        const updateResponse = await fetch(`${blacklistUrl}/${existingRecord.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              BounceCount: newCount,
              BounceType: finalBounceType,
              Status: finalStatus,
              LastBounceDate: bounceInfo.timestamp,
              LastBounceReason: bounceInfo.reason,
              LastMessageId: bounceInfo.messageId,
              Notes: `${bounceInfo.eventType} - ${bounceInfo.reason} (Count: ${newCount})`
            }
          })
        });

        if (updateResponse.ok) {
          console.log(`✅ EmailBlacklist更新: ${email} (Count: ${newCount}, Type: ${finalBounceType})`);
        } else {
          console.error('EmailBlacklist更新失敗:', await updateResponse.text());
        }

      } else {
        // 新規レコード作成
        const createResponse = await fetch(blacklistUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              Email: email,
              Status: bounceInfo.bounceType === 'hard' ? 'HARD_BOUNCE' : 'SOFT_BOUNCE',
              BounceType: bounceInfo.bounceType,
              BounceCount: 1,
              LastBounceDate: bounceInfo.timestamp,
              LastBounceReason: bounceInfo.reason,
              LastMessageId: bounceInfo.messageId,
              AddedAt: new Date().toISOString(),
              Source: 'Brevo Webhook',
              Notes: `${bounceInfo.eventType} - ${bounceInfo.reason}`
            }
          })
        });

        if (createResponse.ok) {
          console.log(`✅ EmailBlacklist新規追加: ${email}`);
        } else {
          console.error('EmailBlacklist作成失敗:', await createResponse.text());
        }
      }

    } catch (error) {
      console.error('EmailBlacklist更新エラー:', error);
    }
  }

  // Customersテーブルのエラーステータス更新
  async function updateCustomerStatus(email, eventType) {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const customersUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Customers`;

    try {
      // 顧客レコード検索
      const searchUrl = `${customersUrl}?filterByFormula={Email}="${email}"`;
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const searchData = await searchResponse.json();
      const customerRecord = searchData.records?.[0];

      if (customerRecord) {
        // エラー状態を記録（配配メール風）
        const errorType = ['hard_bounce', 'invalid_email'].includes(eventType) 
          ? '永続的なエラー' 
          : eventType === 'soft_bounce' 
          ? '一時的なエラー' 
          : '原因不明のエラー';

        const updateResponse = await fetch(`${customersUrl}/${customerRecord.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              EmailStatus: 'エラー',
              EmailErrorType: errorType,
              LastBounceDate: new Date().toISOString(),
              Notes: `${eventType} detected via webhook`
            }
          })
        });

        if (updateResponse.ok) {
          console.log(`✅ Customer状態更新: ${email} → ${errorType}`);
        } else {
          console.error('Customer更新失敗:', await updateResponse.text());
        }
      }

    } catch (error) {
      console.error('Customer更新エラー:', error);
    }
  }
};