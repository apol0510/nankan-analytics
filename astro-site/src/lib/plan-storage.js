// Netlify Blobsでのプラン情報保存（STRIPE_SPEC.md準拠）
import { getStore } from '@netlify/blobs';

// プラン情報保存
export async function savePlan(email, planData) {
    try {
        const store = getStore('stripe-plans');
        const key = `users/${encodeURIComponent(email.toLowerCase())}.json`;
        
        const data = {
            email: email.toLowerCase(),
            ...planData,
            updatedAt: new Date().toISOString()
        };
        
        await store.set(key, JSON.stringify(data));
        console.log(`[plan-storage] プラン保存完了: ${email} -> ${planData.plan}`);
        return data;
    } catch (error) {
        console.error('[plan-storage] 保存エラー:', error);
        throw error;
    }
}

// プラン情報取得
export async function getPlan(email) {
    try {
        const store = getStore('stripe-plans');
        const key = `users/${encodeURIComponent(email.toLowerCase())}.json`;
        
        const data = await store.get(key, { type: 'json' });
        
        if (!data) {
            console.log(`[plan-storage] プラン情報なし: ${email}`);
            return {
                email: email.toLowerCase(),
                plan: 'free',
                status: 'active',
                createdAt: new Date().toISOString()
            };
        }
        
        console.log(`[plan-storage] プラン取得完了: ${email} -> ${data.plan}`);
        return data;
    } catch (error) {
        console.error('[plan-storage] 取得エラー:', error);
        return {
            email: email.toLowerCase(),
            plan: 'free',
            status: 'active',
            createdAt: new Date().toISOString()
        };
    }
}

// 有効期限計算（1ヶ月後）
export function calculateExpiration() {
    const now = new Date();
    const expiration = new Date(now);
    expiration.setMonth(expiration.getMonth() + 1);
    return expiration.toISOString();
}