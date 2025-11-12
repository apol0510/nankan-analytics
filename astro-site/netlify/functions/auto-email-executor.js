// 🤖 完全自動メール実行Function
// execute-scheduled-emailsを定期的に自動実行
// Netlify Scheduled Functionsで1分ごとに実行

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
    console.log('🤖 自動実行トリガー開始:', new Date().toISOString());

    // execute-scheduled-emailsを呼び出し
    const executeUrl = `${process.env.URL || 'https://nankan-analytics.netlify.app'}/.netlify/functions/execute-scheduled-emails`;

    const response = await fetch(executeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    console.log('✅ execute-scheduled-emails実行完了:', result);

    // 結果を返す
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Auto execution completed',
        result: result,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('❌ 自動実行エラー:', error);

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

// Netlify Scheduled Functions設定
// このFunctionを1分ごとに自動実行
export const config = {
  schedule: "*/1 * * * *" // 毎分実行
};
