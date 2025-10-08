// 期限切れチェックcron（毎日午前9時実行）
// Netlify Scheduled Functionsで設定

exports.handler = async (event, context) => {
  console.log('⏰ 期限切れチェックcron開始:', new Date().toISOString());

  try {
    // 期限切れ通知Functionを呼び出し
    const functionsUrl = process.env.URL || 'https://nankan-analytics.netlify.app';
    const response = await fetch(`${functionsUrl}/.netlify/functions/expiry-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    console.log('✅ 期限切れチェック完了:', result);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: '期限切れチェック完了',
        result
      })
    };

  } catch (error) {
    console.error('🚨 期限切れチェックエラー:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Cron execution error',
        details: error.message
      })
    };
  }
};
