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

export async function saveMembershipData(email: string, membershipData: any) {
  try {
    const store = getStore('membership');
    const key = `users/${encodeURIComponent(email.toLowerCase())}.json`;
    
    // 既存データとマージ
    const existingData = await getMembershipByEmail(email) || {};
    const updatedData = {
      ...existingData,
      ...membershipData,
      email: email.toLowerCase(),
      updatedAt: new Date().toISOString()
    };
    
    // Netlify Blobsに保存
    await store.set(key, updatedData);
    
    console.log('[membership-store] Saved membership data for:', email, updatedData);
    return updatedData;
  } catch (error) {
    console.error('[membership-store] Save error:', error);
    throw error;
  }
}