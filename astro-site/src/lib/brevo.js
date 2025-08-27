/**
 * Brevo API連携ライブラリ
 * 旧ハイハイメールからの移行対応
 * 月額コスト: €69 (約¥10,350) - 元¥50,000から大幅削減
 */

class BrevoAPI {
    constructor() {
        // 環境変数から取得
        this.apiUrl = 'https://api.brevo.com/v3';
        this.apiKey = import.meta.env.BREVO_API_KEY;
        
        if (!this.apiKey) {
            console.warn('Brevo API設定が不完全です。環境変数BREVO_API_KEYを設定してください。');
        }
    }

    /**
     * APIリクエストを送信
     */
    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.apiUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'api-key': this.apiKey
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
                const errorText = await response.text();
                throw new Error(`Brevo API エラー: ${response.status} ${response.statusText} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Brevo API リクエストエラー:', error);
            throw error;
        }
    }

    /**
     * 会員ランク別リストID定義
     * Brevoでは「リスト」でグループを管理
     */
    getListId(plan) {
        const lists = {
            'free': parseInt(process.env.BREVO_LIST_FREE) || 1,
            'standard': parseInt(process.env.BREVO_LIST_STANDARD) || 2, 
            'premium': parseInt(process.env.BREVO_LIST_PREMIUM) || 3
        };
        
        return lists[plan?.toLowerCase()] || lists.free;
    }

    /**
     * 連絡先を追加・更新
     */
    async addContact(email, plan, userData = {}) {
        const listIds = [this.getListId(plan)];
        
        const contactData = {
            email: email,
            listIds: listIds,
            attributes: {
                PLAN: plan,
                REGISTRATION_DATE: new Date().toISOString().split('T')[0],
                SOURCE: 'nankan-analytics',
                FIRSTNAME: userData.firstName || '',
                LASTNAME: userData.lastName || '',
                ...userData
            },
            updateEnabled: true // 既存の場合は更新
        };

        try {
            const result = await this.request('/contacts', 'POST', contactData);
            console.log(`Brevo: ${email} を ${plan} リストに追加`, result);
            return result;
        } catch (error) {
            console.error('連絡先追加エラー:', error);
            throw error;
        }
    }

    /**
     * 連絡先のリストを変更
     */
    async moveContact(email, newPlan, oldPlan = null) {
        const newListId = this.getListId(newPlan);
        const oldListId = oldPlan ? this.getListId(oldPlan) : null;
        
        try {
            // 新しいリストに追加
            const updateData = {
                listIds: [newListId],
                attributes: {
                    PLAN: newPlan,
                    UPDATED_DATE: new Date().toISOString().split('T')[0],
                    PREVIOUS_PLAN: oldPlan || ''
                },
                unlinkListIds: oldListId ? [oldListId] : [] // 古いリストから削除
            };

            const result = await this.request(`/contacts/${encodeURIComponent(email)}`, 'PUT', updateData);
            console.log(`Brevo: ${email} を ${newPlan} リストに移動`, result);
            return result;
        } catch (error) {
            console.error('リスト移動エラー:', error);
            throw error;
        }
    }

    /**
     * 連絡先を削除
     */
    async removeContact(email) {
        try {
            const result = await this.request(`/contacts/${encodeURIComponent(email)}`, 'DELETE');
            console.log(`Brevo: ${email} を削除`, result);
            return result;
        } catch (error) {
            console.error('連絡先削除エラー:', error);
            throw error;
        }
    }

    /**
     * メルマガ配信（キャンペーン作成）
     */
    async sendNewsletter(listIds, subject, htmlContent, textContent = '') {
        const campaignData = {
            name: `${subject} - ${new Date().toLocaleDateString('ja-JP')}`,
            subject: subject,
            htmlContent: htmlContent,
            textContent: textContent || this.stripHtml(htmlContent),
            sender: {
                name: 'NANKANアナリティクス',
                email: 'info@nankan-analytics.keiba.link'
            },
            recipients: {
                listIds: Array.isArray(listIds) ? listIds.map(id => this.getListId(id)) : [this.getListId(listIds)]
            },
            scheduledAt: null // 下書きとして保存
        };

        try {
            const result = await this.request('/emailCampaigns', 'POST', campaignData);
            console.log('Brevo キャンペーン作成:', result);
            return result;
        } catch (error) {
            console.error('キャンペーン作成エラー:', error);
            throw error;
        }
    }

    /**
     * キャンペーンを送信
     */
    async sendCampaign(campaignId) {
        try {
            const result = await this.request(`/emailCampaigns/${campaignId}/sendNow`, 'POST');
            console.log(`Brevo キャンペーン ${campaignId} 送信:`, result);
            return result;
        } catch (error) {
            console.error('キャンペーン送信エラー:', error);
            throw error;
        }
    }

    /**
     * リスト一覧取得
     */
    async getLists() {
        try {
            const result = await this.request('/contacts/lists');
            return result;
        } catch (error) {
            console.error('リスト一覧取得エラー:', error);
            throw error;
        }
    }

    /**
     * リスト別連絡先数取得
     */
    async getContactsByList(plan) {
        const listId = this.getListId(plan);
        
        try {
            const result = await this.request(`/contacts/lists/${listId}`);
            return {
                listId,
                totalContacts: result.totalSubscribers,
                plan: plan
            };
        } catch (error) {
            console.error('リスト別連絡先取得エラー:', error);
            throw error;
        }
    }

    /**
     * 統計情報取得
     */
    async getStats() {
        try {
            const results = await Promise.all([
                this.getContactsByList('free').catch(() => ({ totalContacts: 0 })),
                this.getContactsByList('standard').catch(() => ({ totalContacts: 0 })),
                this.getContactsByList('premium').catch(() => ({ totalContacts: 0 }))
            ]);

            return {
                free: results[0].totalContacts,
                standard: results[1].totalContacts,
                premium: results[2].totalContacts,
                total: results[0].totalContacts + results[1].totalContacts + results[2].totalContacts
            };
        } catch (error) {
            console.error('統計情報取得エラー:', error);
            throw error;
        }
    }

    /**
     * API接続テスト
     */
    async testConnection() {
        try {
            const result = await this.request('/account');
            return { 
                success: true, 
                message: 'Brevo API接続成功',
                account: result
            };
        } catch (error) {
            return { 
                success: false, 
                message: `Brevo API接続失敗: ${error.message}` 
            };
        }
    }

    /**
     * HTMLからテキストを抽出（簡易版）
     */
    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    /**
     * 一括インポート用データ準備
     */
    prepareBulkImport(contacts, plan) {
        return contacts.map(contact => ({
            email: contact.email,
            attributes: {
                PLAN: plan,
                FIRSTNAME: contact.firstName || '',
                LASTNAME: contact.lastName || '',
                REGISTRATION_DATE: contact.registrationDate || new Date().toISOString().split('T')[0],
                SOURCE: 'migration-from-haihai'
            }
        }));
    }
}

// シングルトンパターンでエクスポート
const brevo = new BrevoAPI();
export default brevo;

// 個別関数のエクスポート（ハイハイメールAPIとの互換性維持）
export const {
    addContact: addToGroup,        // ハイハイメール互換
    moveContact: moveToGroup,       // ハイハイメール互換
    removeContact: removeFromGroup, // ハイハイメール互換
    sendNewsletter,
    getLists: getGroups,           // ハイハイメール互換
    getContactsByList: getCustomersByGroup, // ハイハイメール互換
    testConnection,
    getStats
} = brevo;