// メール送信テスト用API
import { sendEmail } from '../../lib/email.js';

export const prerender = false;

export async function GET({ request }) {
  try {
    // テスト用のメールアドレス
    const url = new URL(request.url);
    const testEmail = url.searchParams.get('email') || 'test@example.com';
    
    // テスト用のデータ
    const testData = {
      email: testEmail,
      planName: 'プレミアム',
      amount: '9,980',
      nextBillingDate: '2025年9月27日',
      features: '<ul><li>1R-12R 全レース予想閲覧</li><li>全コンテンツアクセス</li><li>無制限データアクセス</li><li>優先サポート</li><li>AI分析レポート</li></ul>'
    };

    // メール送信テスト
    const result = await sendEmail(testEmail, 'PAYMENT_SUCCESS', testData);
    
    if (result.success) {
      return new Response(JSON.stringify({
        success: true,
        message: `テストメールを送信しました: ${testEmail}`,
        messageId: result.messageId
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: result.error
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}