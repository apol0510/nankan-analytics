// Membership保存状況デバッグAPI
import type { APIRoute } from 'astro';
import { getStore } from '@netlify/blobs';

export const GET: APIRoute = async ({ url }) => {
  const email = url.searchParams.get('email') || '';
  
  if (!email) {
    return new Response('missing email parameter', { 
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  try {
    const store = getStore('membership');
    const membershipData = await store.get(`users/${encodeURIComponent(email)}.json`);
    
    if (!membershipData) {
      return new Response(`No membership data found for: ${email}`, { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const dataText = await membershipData.text();
    
    return new Response(dataText, { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('[debug] Error fetching membership data:', error);
    
    return new Response(`Error: ${error.message}`, { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};