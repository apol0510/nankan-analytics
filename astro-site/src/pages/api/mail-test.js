// 緊急メールテスト用API - シンプル版
export const prerender = false;

export async function GET({ url }) {
  try {
    // 動的インポートでメール機能をテスト
    const { sendEmail } = await import('../../lib/email.js');
    
    const email = url.searchParams.get('email') || 'test@example.com';
    
    // テストデータ
    const data = {
      email: email,
      planName: 'プレミアム',
      amount: '9,980',
      nextBillingDate: '2025年9月27日',
      features: '<ul><li>全レース予想</li><li>全コンテンツアクセス</li></ul>'
    };
    
    // メール送信実行
    const result = await sendEmail(email, 'PAYMENT_SUCCESS', data);
    
    // 結果を返す
    return new Response(JSON.stringify({
      test: true,
      success: result.success,
      email: email,
      message: result.success ? 'メール送信成功' : result.error,
      messageId: result.messageId
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      test: true,
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}