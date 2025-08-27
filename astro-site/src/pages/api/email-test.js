// シンプルなメール送信テスト用API
import { sendEmail } from '../../lib/email.js';

export const prerender = false;

export async function GET({ url }) {
  try {
    const testEmail = url.searchParams.get('email') || 'test@example.com';
    
    const testData = {
      email: testEmail,
      planName: 'プレミアム',
      amount: '9,980',
      nextBillingDate: '2025年9月27日',
      features: '<ul><li>1R-12R 全レース予想閲覧</li><li>全コンテンツアクセス</li><li>無制限データアクセス</li><li>優先サポート</li><li>AI分析レポート</li></ul>'
    };

    const result = await sendEmail(testEmail, 'PAYMENT_SUCCESS', testData);
    
    return new Response(JSON.stringify({
      success: result.success,
      message: result.success ? `テストメール送信完了: ${testEmail}` : result.error,
      messageId: result.messageId || null
    }), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}