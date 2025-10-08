// 期限切れチェックcron（毎日午前9時UTC = 日本時間18時実行）
// Netlify Scheduled Functions

export default async function handler(request, context) {
  const headers = {
    'Content-Type': 'application/json'
  };

  console.log('⏰ 期限切れチェックcron開始:', new Date().toISOString());

  try {
    // 期限切れ通知Functionを呼び出し
    const baseUrl = process.env.URL || 'https://nankan-analytics.netlify.app';
    const notificationUrl = `${baseUrl}/.netlify/functions/expiry-notification`;

    console.log('📧 期限切れ通知URL:', notificationUrl);

    const response = await fetch(notificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`期限切れ通知失敗: ${response.status}`);
    }

    const result = await response.json();

    console.log('✅ 期限切れチェック完了:', result);

    return new Response(
      JSON.stringify({
        success: true,
        message: '期限切れチェック完了',
        notificationResult: result,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('❌ 期限切れチェックエラー:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers }
    );
  }
}

// Netlify Scheduled Functions設定
export const config = {
  schedule: "0 9 * * *" // 毎日午前9時UTC（日本時間18時）
};
