#!/usr/bin/env node

// EmailBlacklistに直接テストレコードを作成
// ドメイン保護システムの動作確認用

import { config } from 'dotenv';
config();

async function testDirectBlacklist() {
    console.log('📝 EmailBlacklistへの直接記録テスト');

    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
        console.error('❌ Airtable環境変数が設定されていません');
        return;
    }

    const testEmail = '1testapolon_05@example.com';

    // EmailBlacklistに記録
    const recordData = {
        fields: {
            Email: testEmail,
            BounceCount: 1,
            BounceType: 'hard',
            Status: 'HARD_BOUNCE',
            AddedAt: new Date().toISOString().split('T')[0],
            Notes: 'テスト: SendGrid Webhook経由のバウンス記録をシミュレート'
        }
    };

    console.log('📤 記録するデータ:', JSON.stringify(recordData, null, 2));

    try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/EmailBlacklist`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(recordData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ EmailBlacklistへの記録成功!');
            console.log('📋 レコードID:', result.id);
            console.log('📧 記録されたメール:', result.fields.Email);
            console.log('🚫 ステータス:', result.fields.Status);

            console.log('\n🎯 次のステップ:');
            console.log('1. 管理画面でこのメールアドレスに送信を試みる');
            console.log('2. ドメイン保護システムが自動的にフィルタリングすることを確認');
            console.log('3. 「スキップされたメール」に表示されることを確認');

        } else {
            const error = await response.text();
            console.error('❌ 記録失敗:', error);
        }

    } catch (error) {
        console.error('❌ エラー:', error.message);
    }

    // 記録確認
    console.log('\n📊 EmailBlacklist内容確認中...');
    try {
        const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/EmailBlacklist?filterByFormula=SEARCH("${testEmail}", {Email})`;
        const searchResponse = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`
            }
        });

        if (searchResponse.ok) {
            const data = await searchResponse.json();
            console.log(`✅ ${testEmail} のレコード数: ${data.records.length}`);
            if (data.records.length > 0) {
                console.log('📋 最新レコード:', data.records[0].fields);
            }
        }
    } catch (error) {
        console.error('❌ 確認エラー:', error.message);
    }
}

// 実行
testDirectBlacklist().catch(console.error);