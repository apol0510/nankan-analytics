// src/pages/api/membership.ts
import type { APIRoute } from 'astro';
import { getStore } from '@netlify/blobs';

export const GET: APIRoute = async ({ url }) => {
  try {
    const emailRaw = (url.searchParams.get('email') || '').trim();
    if (!emailRaw) {
      return new Response(JSON.stringify({ error: 'missing email' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const email = emailRaw.toLowerCase();
    const key = `users/${encodeURIComponent(email)}.json`;

    const store = getStore('membership'); // ← トークン不要、Netlifyで自動注入
    const blob = await store.get(key);

    if (!blob) {
      // 見つからないだけなら 404 を返す（フロントで未契約表示にする）
      return new Response(JSON.stringify({ found: false }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await blob.json();
    return new Response(JSON.stringify({ found: true, data }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    console.error('[api/membership] 500:', e?.message || e);
    return new Response(JSON.stringify({
      error: 'server_error', details: e?.message || 'unknown'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};