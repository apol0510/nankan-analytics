// 環境変数テスト用Function
export const handler = async (event, context) => {
  console.log('環境変数チェック開始');
  
  // すべての環境変数の存在チェック
  const envVars = {
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    FROM_EMAIL: process.env.FROM_EMAIL,
    SITE_URL: process.env.SITE_URL
  };
  
  // 環境変数の状態を確認
  const envStatus = {};
  for (const [key, value] of Object.entries(envVars)) {
    if (value) {
      // 値の一部をマスキング
      if (key.includes('KEY') || key.includes('SECRET')) {
        envStatus[key] = value.substring(0, 10) + '...' + value.substring(value.length - 4);
      } else {
        envStatus[key] = value;
      }
    } else {
      envStatus[key] = '❌ 未設定';
    }
  }
  
  console.log('環境変数の状態:', envStatus);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      message: '環境変数チェック完了',
      envStatus: envStatus,
      timestamp: new Date().toISOString()
    })
  };
};