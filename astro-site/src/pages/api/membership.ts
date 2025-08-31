// src/pages/api/membership.ts
import type { APIRoute } from 'astro';
import { getStore } from '@netlify/blobs';

export const GET: APIRoute = async ({ url }) => {
  try {
    const emailRaw = (url.searchParams.get('email') || '').trim();
    if (!emailRaw) {
      return new Response(JSON.stringify({ error: 'missing email' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const email = emailRaw.toLowerCase();
    const key = `users/${encodeURIComponent(email)}.json`;

    const store = getStore('membership');
    // ✅ ここがポイント：type:'json' を指定
    const data = await store.get(key, { type: 'json' as const });

    if (!data) {
      return new Response(JSON.stringify({ found: false }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ found: true, data }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[api/membership] 500:', e?.message || e);
    return new Response(JSON.stringify({
      error: 'server_error', details: e?.message || 'unknown',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};