// src/pages/api/membership/get.ts
import type { APIRoute } from 'astro';
import { getMembershipByEmail } from '../../../lib/membership/store';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (!email) {
      console.error('[membership/get] Email parameter missing');
      return new Response(
        JSON.stringify({ error: 'missing_email' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[membership/get] Getting membership for:', email);

    // Netlify Blobsから会員情報を取得
    const membershipData = await getMembershipByEmail(email);
    
    if (!membershipData) {
      console.log('[membership/get] No membership found for:', email, '- returning free plan');
      // 会員情報がない場合は無料会員として扱う
      return new Response(
        JSON.stringify({
          email,
          plan: 'free',
          status: 'active',
          createdAt: new Date().toISOString(),
          source: 'default_free'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[membership/get] Membership data found:', membershipData);

    // 会員データを返す
    return new Response(
      JSON.stringify({
        email: membershipData.email || email,
        plan: membershipData.plan || 'free',
        status: membershipData.status || 'active',
        createdAt: membershipData.createdAt || new Date().toISOString(),
        stripeCustomerId: membershipData.stripeCustomerId,
        source: 'netlify_blobs'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[membership/get] Error:', error);
    
    // エラーが発生した場合も無料会員として扱う
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    
    return new Response(
      JSON.stringify({
        email: email || 'unknown',
        plan: 'free',
        status: 'active',
        createdAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'unknown_error',
        source: 'error_fallback'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};