// src/lib/membership/store.ts
import { getStore } from '@netlify/blobs';

export async function getMembershipByEmail(email: string) {
  try {
    const store = getStore('membership');
    const key = `users/${encodeURIComponent(email.toLowerCase())}.json`;
    const data = await store.get(key, { type: 'json' as const });
    return data;
  } catch (error) {
    console.error('[membership-store] Error:', error);
    return null;
  }
}