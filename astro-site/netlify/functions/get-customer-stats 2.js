// 顧客統計取得API（メルマガ配信システム用）

exports.handler = async function(event, context) {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Airtable設定エラー' })
        };
    }

    try {
        // 全顧客データを取得
        let allRecords = [];
        let offset = null;

        do {
            let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Customers?pageSize=100`;
            if (offset) url += `&offset=${offset}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`
                }
            });

            if (!response.ok) {
                throw new Error('Airtable API error');
            }

            const data = await response.json();
            allRecords.push(...data.records);
            offset = data.offset;

        } while (offset);

        // プラン別に集計
        const stats = {
            total: allRecords.length,
            free: 0,
            standard: 0,
            premium: 0,
            premiumSanrenpuku: 0,
            premiumCombo: 0
        };

        // デバッグ用：全プラン値を記録
        const planCounts = {};

        allRecords.forEach(record => {
            const fields = record.fields;
            let plan = (fields['Plan'] || fields['plan'] || 'Free').trim();
            const planLower = plan.toLowerCase();

            // デバッグ用カウント
            planCounts[plan] = (planCounts[plan] || 0) + 1;

            if (planLower === 'free' || plan === '' || planLower === '') {
                stats.free++;
            } else if (planLower === 'standard') {
                stats.standard++;
            } else if (planLower === 'premium' || planLower === 'premium predictions') {
                stats.premium++;
            } else if (planLower === 'premium sanrenpuku') {
                stats.premiumSanrenpuku++;
            } else if (planLower === 'premium combo') {
                stats.premiumCombo++;
            }
        });

        console.log('📊 プラン別カウント:', planCounts);
        console.log('📈 統計結果:', stats);

        // デバッグ情報も返す
        const response = {
            ...stats,
            debug: {
                planCounts,
                sampleRecords: allRecords.slice(0, 5).map(r => ({
                    email: r.fields.Email || r.fields.email,
                    plan: r.fields.Plan || r.fields.plan,
                    mailingList: r.fields.MailingList,
                    planRaw: JSON.stringify(r.fields.Plan || r.fields.plan),
                    mailingListRaw: JSON.stringify(r.fields.MailingList),
                    allFields: Object.keys(r.fields) // 全フィールド名を表示
                })),
                firstRecordAllFields: allRecords[0] ? Object.keys(allRecords[0].fields) : []
            }
        };

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(response)
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
