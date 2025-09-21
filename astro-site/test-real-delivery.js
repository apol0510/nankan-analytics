#!/usr/bin/env node

// 実際のメール配信でのバウンス検知テスト
// 管理画面と同じ環境でテスト

import { config } from 'dotenv';
config();

async function testRealDelivery() {
  console.log('📧 実際のメール配信テスト開始');

  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  if (!SENDGRID_API_KEY) {
    console.error('❌ SendGrid API key not found');
    return;
  }

  // 管理画面と同じパラメータでテスト
  const testData = {
    subject: 'ドメイン保護テスト - 実際の配信',
    htmlContent: '<p>これは実際の配信でのドメイン保護テストです。</p>',
    targetPlan: 'all',
    // retryEmails に無効なアドレスを直接指定
    retryEmails: ['1testapolon_05@example.com']
  };

  console.log('📤 送信データ:', JSON.stringify(testData, null, 2));

  try {
    // 管理画面と同じエンドポイントに送信
    const response = await fetch('http://localhost:4321/.netlify/functions/send-newsletter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log(`📨 レスポンスステータス: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ エラーレスポンス:', errorText);
    } else {
      const result = await response.json();
      console.log('✅ 成功レスポンス:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('❌ 送信エラー:', error.message);
  }

  // 数秒後にAirtableを確認
  console.log('\n⏳ 5秒待機後、Airtableを確認...');
  setTimeout(async () => {
    await checkAirtable();
  }, 5000);
}

async function checkAirtable() {
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/EmailBlacklist?filterByFormula=SEARCH("1testapolon_05@example.com", {Email})`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log('📊 Airtable検索結果:');
      if (data.records.length > 0) {
        console.log('✅ 見つかりました:', data.records[0].fields);
      } else {
        console.log('❌ EmailBlacklistに記録されていません');

        // 全レコードの最新3件を確認
        console.log('\n📋 最新3件のレコード:');
        const allResponse = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/EmailBlacklist?maxRecords=3&sort[0][field]=AddedAt&sort[0][direction]=desc`,
          {
            headers: {
              'Authorization': `Bearer ${AIRTABLE_API_KEY}`
            }
          }
        );

        if (allResponse.ok) {
          const allData = await allResponse.json();
          allData.records.forEach((record, index) => {
            console.log(`${index + 1}. ${record.fields.Email} - ${record.fields.Status} (${record.fields.AddedAt})`);
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ Airtable確認エラー:', error.message);
  }
}

// テスト実行
testRealDelivery().catch(console.error);