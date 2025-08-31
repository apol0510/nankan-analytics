// メンバーシップ情報取得API - Netlify Blobsからデータを読み取り
import type { APIRoute } from 'astro';
import { getStore } from '@netlify/blobs';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // URLパラメータまたはCookieからemailを取得
    const email = url.searchParams.get('email') || getCookieValue(request.headers.get('cookie'), 'na_email');
    
    if (!email) {
      return new Response(JSON.stringify({ 
        error: 'Email parameter or na_email cookie is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Netlify Blobsからメンバーシップデータを取得
    const store = getStore('membership');
    const key = `users/${encodeURIComponent(email.toLowerCase())}.json`;
    
    console.log('[membership-api] Looking for key:', key);
    
    const result = await store.get(key);
    
    if (!result) {
      console.log('[membership-api] No membership data found for:', email);
      return new Response(JSON.stringify({ 
        plan: 'free',
        status: 'inactive',
        email: email,
        message: 'No subscription found'
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const membershipData = await result.json();
    console.log('[membership-api] Found membership data for:', email, membershipData);

    // レスポンス形式を統一
    const response = {
      plan: membershipData.plan || 'free',
      status: membershipData.status || 'inactive',
      email: membershipData.email,
      subscriptionId: membershipData.subscriptionId,
      customerId: membershipData.customerId,
      priceId: membershipData.priceId,
      currentPeriodStart: membershipData.currentPeriodStart,
      currentPeriodEnd: membershipData.currentPeriodEnd,
      updatedAt: membershipData.updatedAt
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[membership-api] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Cookie値を取得するヘルパー関数
function getCookieValue(cookieString: string | null, name: string): string | null {
  if (!cookieString) return null;
  
  const match = cookieString.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}