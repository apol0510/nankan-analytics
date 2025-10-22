// ポイント交換申請処理
// 管理者通知 + ユーザー自動返信

const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.handler = async (event, context) => {
  // CORSヘッダー設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONSリクエスト（プリフライト）対応
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // POSTリクエストのみ受付
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // リクエストボディ解析
    const { userEmail, userName, userPlan, currentPoints, requiredPoints, rewardName } = JSON.parse(event.body);

    console.log('📧 ポイント交換申請受付:', {
      userEmail,
      userName,
      userPlan,
      currentPoints,
      requiredPoints,
      rewardName,
      timestamp: new Date().toISOString()
    });

    // バリデーション
    if (!userEmail || !requiredPoints || !rewardName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '必須項目が不足しています' })
      };
    }

    // ポイント不足チェック
    if (currentPoints < requiredPoints) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'ポイント不足',
          message: `交換には${requiredPoints}pt必要です（現在: ${currentPoints}pt）`
        })
      };
    }

    // 1. 管理者向け通知メール
    const adminEmail = {
      to: 'nankan.analytics@gmail.com',
      from: 'nankan-analytics@keiba.link',
      subject: `【ポイント交換申請】${userName || userEmail} - ${rewardName}`,
      html: `
        <div style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
          <h2 style="color: #fbbf24; border-bottom: 2px solid #fbbf24; padding-bottom: 10px;">
            🎁 ポイント交換申請通知
          </h2>

          <div style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #3b82f6; margin-top: 0;">📋 申請内容</h3>
            <p><strong>交換特典:</strong> ${rewardName}</p>
            <p><strong>必要ポイント:</strong> ${requiredPoints}pt</p>
            <p><strong>現在の保有ポイント:</strong> ${currentPoints}pt</p>
            <p><strong>交換後の残高:</strong> ${currentPoints - requiredPoints}pt</p>
          </div>

          <div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #10b981; margin-top: 0;">👤 申請者情報</h3>
            <p><strong>メールアドレス:</strong> ${userEmail}</p>
            <p><strong>ユーザー名:</strong> ${userName || '（未登録）'}</p>
            <p><strong>プラン:</strong> ${userPlan || 'Free'}</p>
            <p><strong>申請日時:</strong> ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
          </div>

          <div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #f59e0b; margin-top: 0;">📌 対応必要事項</h3>
            <ol style="margin: 10px 0; padding-left: 20px;">
              <li>ユーザーのポイント残高を確認</li>
              <li>特典情報を準備（AI解析データ等）</li>
              <li>ユーザーにメールで特典を送付</li>
              <li>Airtableでポイント残高を更新（-${requiredPoints}pt）</li>
            </ol>
          </div>

          <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 20px 0;">

          <p style="font-size: 0.85rem; color: #94a3b8; margin: 10px 0;">
            このメールはNANKANアナリティクス自動通知システムから送信されました。<br>
            ユーザーには自動返信メールが送信済みです。
          </p>
        </div>
      `,
      tracking_settings: {
        click_tracking: { enable: false, enable_text: false },
        open_tracking: { enable: false },
        subscription_tracking: { enable: false },
        ganalytics: { enable: false }
      }
    };

    // 2. ユーザー向け自動返信メール
    const userEmail_message = {
      to: userEmail,
      from: 'nankan-analytics@keiba.link',
      subject: '【申請受付完了】ポイント交換申請 - NANKANアナリティクス',
      html: `
        <div style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
          <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px;">
            ✅ ポイント交換申請を受け付けました
          </h2>

          <p style="font-size: 1rem; line-height: 1.6;">
            ${userName || 'お客様'}、いつもNANKANアナリティクスをご利用いただきありがとうございます。
          </p>

          <div style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #3b82f6; margin-top: 0;">📋 申請内容</h3>
            <p><strong>交換特典:</strong> ${rewardName}</p>
            <p><strong>必要ポイント:</strong> ${requiredPoints}pt</p>
            <p><strong>申請日時:</strong> ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
          </div>

          <div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #10b981; margin-top: 0;">📧 今後の流れ</h3>
            <ol style="margin: 10px 0; padding-left: 20px; line-height: 1.8;">
              <li>管理者が申請内容を確認（通常1営業日以内）</li>
              <li>特典情報をメールで送付いたします</li>
              <li>ポイント残高が自動的に更新されます</li>
            </ol>
          </div>

          <div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #f59e0b; margin-top: 0;">⏰ お届け予定</h3>
            <p style="margin: 5px 0;">
              <strong>特典情報:</strong> 1営業日以内にメールで送付<br>
              <strong>ポイント反映:</strong> 特典送付と同時に自動更新
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 20px 0;">

          <p style="font-size: 0.9rem; color: #cbd5e1; line-height: 1.6;">
            何かご不明点がございましたら、お気軽にお問い合わせください。<br>
            引き続きNANKANアナリティクスをよろしくお願いいたします。
          </p>

          <p style="font-size: 0.85rem; color: #94a3b8; margin-top: 20px;">
            NANKANアナリティクス運営チーム<br>
            <a href="https://nankan-analytics.keiba.link/" style="color: #3b82f6; text-decoration: none;">https://nankan-analytics.keiba.link/</a>
          </p>
        </div>
      `,
      tracking_settings: {
        click_tracking: { enable: false, enable_text: false },
        open_tracking: { enable: false },
        subscription_tracking: { enable: false },
        ganalytics: { enable: false }
      }
    };

    // SendGridでメール送信
    try {
      // 管理者通知
      await sgMail.send(adminEmail);
      console.log('✅ 管理者通知メール送信成功:', adminEmail.to);

      // ユーザー自動返信
      await sgMail.send(userEmail_message);
      console.log('✅ ユーザー自動返信メール送信成功:', userEmail);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'ポイント交換申請を受け付けました。1営業日以内にメールで特典をお送りします。'
        })
      };

    } catch (emailError) {
      console.error('❌ メール送信エラー:', emailError);

      // メール送信失敗でも申請は受け付ける
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'ポイント交換申請を受け付けました。メール通知に遅延が発生する可能性があります。',
          warning: 'メール送信に問題が発生しましたが、申請は正常に処理されました。'
        })
      };
    }

  } catch (error) {
    console.error('❌ ポイント交換処理エラー:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '申請処理中にエラーが発生しました',
        details: error.message
      })
    };
  }
};
