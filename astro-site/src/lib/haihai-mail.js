/**
 * 配配メール（ハイハイメール）API連携ライブラリ
 * Standard プラン対応
 */

class HaihaiMailAPI {
    constructor() {
        // 環境変数から取得（本番環境ではNetlifyで設定）
        this.apiUrl = import.meta.env.HAIHAI_API_URL || 'https://api.haihai-mail.jp/v1';
        this.apiKey = import.meta.env.HAIHAI_API_KEY;
        this.accountId = import.meta.env.HAIHAI_ACCOUNT_ID;
        
        if (!this.apiKey || !this.accountId) {
            console.warn('配配メールAPI設定が不完全です');
        }
    }

    /**
     * APIリクエストを送信
     */
    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.apiUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Account-ID': this.accountId
        };

        const options = {
            method,
            headers
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`配配メールAPI エラー: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('配配メールAPI リクエストエラー:', error);
            throw error;
        }
    }

    /**
     * 会員ランク別グループID定義
     */
    getGroupId(plan) {
        const groups = {
            'free': process.env.HAIHAI_GROUP_FREE || 'group_free',
            'standard': process.env.HAIHAI_GROUP_STANDARD || 'group_standard', 
            'premium': process.env.HAIHAI_GROUP_PREMIUM || 'group_premium'
        };
        
        return groups[plan?.toLowerCase()] || groups.free;
    }

    /**
     * 顧客をグループに追加
     */
    async addToGroup(email, plan, userData = {}) {
        const groupId = this.getGroupId(plan);
        
        const customerData = {
            email: email,
            group_id: groupId,
            custom_fields: {
                plan: plan,
                registration_date: new Date().toISOString(),
                source: 'nankan-analytics',
                ...userData
            }
        };

        try {
            const result = await this.request('/customers', 'POST', customerData);
            console.log(`配配メール: ${email} を ${plan} グループに追加`, result);
            return result;
        } catch (error) {
            console.error('グループ追加エラー:', error);
            throw error;
        }
    }

    /**
     * 顧客のグループを変更
     */
    async moveToGroup(email, newPlan, oldPlan = null) {
        const newGroupId = this.getGroupId(newPlan);
        
        try {
            // 既存の顧客情報を更新
            const updateData = {
                email: email,
                group_id: newGroupId,
                custom_fields: {
                    plan: newPlan,
                    updated_date: new Date().toISOString(),
                    previous_plan: oldPlan
                }
            };

            const result = await this.request(`/customers/${encodeURIComponent(email)}`, 'PUT', updateData);
            console.log(`配配メール: ${email} を ${newPlan} グループに移動`, result);
            return result;
        } catch (error) {
            console.error('グループ移動エラー:', error);
            throw error;
        }
    }

    /**
     * 顧客をグループから削除
     */
    async removeFromGroup(email) {
        try {
            const result = await this.request(`/customers/${encodeURIComponent(email)}`, 'DELETE');
            console.log(`配配メール: ${email} をグループから削除`, result);
            return result;
        } catch (error) {
            console.error('グループ削除エラー:', error);
            throw error;
        }
    }

    /**
     * メルマガ配信
     */
    async sendNewsletter(groupIds, subject, content, isHTML = true) {
        const mailData = {
            subject: subject,
            content: content,
            content_type: isHTML ? 'html' : 'text',
            target_groups: Array.isArray(groupIds) ? groupIds : [groupIds],
            send_immediately: false, // 下書き保存
            sender: {
                name: 'NANKANアナリティクス',
                email: 'info@nankan-analytics.keiba.link'
            }
        };

        try {
            const result = await this.request('/newsletters', 'POST', mailData);
            console.log('メルマガ作成:', result);
            return result;
        } catch (error) {
            console.error('メルマガ配信エラー:', error);
            throw error;
        }
    }

    /**
     * グループ一覧取得
     */
    async getGroups() {
        try {
            const result = await this.request('/groups');
            return result;
        } catch (error) {
            console.error('グループ一覧取得エラー:', error);
            throw error;
        }
    }

    /**
     * 顧客一覧取得（グループ別）
     */
    async getCustomersByGroup(plan) {
        const groupId = this.getGroupId(plan);
        
        try {
            const result = await this.request(`/groups/${groupId}/customers`);
            return result;
        } catch (error) {
            console.error('グループ別顧客取得エラー:', error);
            throw error;
        }
    }

    /**
     * API接続テスト
     */
    async testConnection() {
        try {
            await this.request('/account');
            return { success: true, message: '配配メールAPI接続成功' };
        } catch (error) {
            return { success: false, message: `配配メールAPI接続失敗: ${error.message}` };
        }
    }
}

// シングルトンパターンでエクスポート
const haihaiMail = new HaihaiMailAPI();
export default haihaiMail;

// 個別関数のエクスポート
export const {
    addToGroup,
    moveToGroup, 
    removeFromGroup,
    sendNewsletter,
    getGroups,
    getCustomersByGroup,
    testConnection
} = haihaiMail;