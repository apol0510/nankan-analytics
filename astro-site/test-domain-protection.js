#!/usr/bin/env node

// ドメイン保護システムのテストスクリプト
// バウンス検知とAirtable記録の動作確認

import { config } from 'dotenv';
config();

async function testDomainProtection() {
  console.log('🔍 ドメイン保護システムテスト開始');

  // 環境変数確認
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

  console.log('📋 環境変数確認:');
  console.log('- Airtable API Key:', AIRTABLE_API_KEY ? '✅ 設定済み' : '❌ 未設定');
  console.log('- Airtable Base ID:', AIRTABLE_BASE_ID ? '✅ 設定済み' : '❌ 未設定');
  console.log('- SendGrid API Key:', SENDGRID_API_KEY ? '✅ 設定済み' : '❌ 未設定');

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !SENDGRID_API_KEY) {
    console.error('❌ 必要な環境変数が設定されていません');
    return;
  }

  // 1. Airtable EmailBlacklistテーブル存在確認
  console.log('\n📊 Step 1: Airtableテーブル確認');
  try {
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/EmailBlacklist?maxRecords=3`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (airtableResponse.ok) {
      const data = await airtableResponse.json();
      console.log('✅ EmailBlacklistテーブル接続成功');
      console.log(`📊 既存レコード数: ${data.records?.length || 0}`);

      if (data.records && data.records.length > 0) {
        const fields = Object.keys(data.records[0].fields);
        console.log(`📋 利用可能フィールド: ${fields.join(', ')}`);
      }
    } else {
      const errorText = await airtableResponse.text();
      console.error('❌ Airtableテーブル接続失敗:', airtableResponse.status, errorText);
      return;
    }
  } catch (error) {
    console.error('❌ Airtableテスト中にエラー:', error.message);
    return;
  }

  // 2. 無効なメールアドレスでのSendGridテスト
  console.log('\n📧 Step 2: SendGrid無効アドレステスト');
  const testEmails = [
    'invalid-test-email@nonexistent-domain-12345.invalid',
    'test@invalid',  // 明らかに無効な形式
    'invalid.email',  // @がない
    ''  // 空のメールアドレス
  ];

  for (const testEmail of testEmails) {
    console.log(`\n🧪 テスト: ${testEmail || '(空文字)'}`);

    const emailData = {
      personalizations: [
        {
          to: [{ email: testEmail }],
          subject: 'ドメイン保護テスト - 無効アドレス'
        }
      ],
      from: {
        name: "NANKAN Domain Protection Test",
        email: "nankan-analytics@keiba.link"
      },
      content: [
        {
          type: "text/html",
          value: "<p>これはドメイン保護システムのテストメールです。</p>"
        }
      ]
    };

    try {
      const sendResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      console.log(`📤 SendGrid送信ステータス: ${sendResponse.status}`);

      if (!sendResponse.ok) {
        const errorData = await sendResponse.text();
        console.log('🔍 SendGridエラー詳細:', errorData.substring(0, 300));

        // バウンス分析を実行
        const bounceInfo = analyzeBounce(testEmail, sendResponse.status, errorData);
        console.log('📊 バウンス分析結果:', bounceInfo);

        // 3. Airtableへの記録テスト
        if (bounceInfo.type !== 'unknown') {
          console.log('\n💾 Step 3: Airtable記録テスト');
          await testAirtableRecord(testEmail, bounceInfo, AIRTABLE_API_KEY, AIRTABLE_BASE_ID);
        }
      } else {
        console.log('⚠️ 送信が成功してしまいました（無効アドレスのはずですが...）');
      }

    } catch (error) {
      console.error('❌ SendGridテスト中にエラー:', error.message);
    }
  }
}

// バウンス分析関数（send-newsletter.jsと完全同期）
function analyzeBounce(email, statusCode, errorData) {
  console.log(`🔍 バウンス分析: ${email} - Status: ${statusCode}`);

  const bounceInfo = {
    isBounce: false,
    type: 'unknown',
    reason: 'unknown'
  };

  try {
    // SendGrid APIエラーレスポンス解析
    let errorObj;
    try {
      errorObj = JSON.parse(errorData);
    } catch {
      errorObj = { message: errorData };
    }

    const errorMessage = (errorObj.message || errorData || '').toLowerCase();

    // Hard Bounce判定条件
    const hardBounceIndicators = [
      'invalid',
      'not exist',
      'unknown user',
      'mailbox not found',
      'no such user',
      'user unknown',
      'recipient address rejected',
      'does not match a verified sender identity',
      'does not contain a valid address'
    ];

    // Soft Bounce判定条件
    const softBounceIndicators = [
      'mailbox full',
      'quota',
      'temporary failure',
      'deferred',
      'try again later',
      'service unavailable'
    ];

    // Hard Bounce判定
    if (statusCode === 400 || hardBounceIndicators.some(indicator => errorMessage.includes(indicator))) {
      bounceInfo.isBounce = true;
      bounceInfo.type = 'hard';
      bounceInfo.reason = 'hard-bounce';
    }
    // Soft Bounce判定
    else if (statusCode === 421 || statusCode === 450 || softBounceIndicators.some(indicator => errorMessage.includes(indicator))) {
      bounceInfo.isBounce = true;
      bounceInfo.type = 'soft';
      bounceInfo.reason = 'soft-bounce';
    }

    return {
      type: bounceInfo.type,
      reason: bounceInfo.reason,
      severity: bounceInfo.type === 'hard' ? 'high' : bounceInfo.type === 'soft' ? 'medium' : 'low'
    };

  } catch (error) {
    console.error('バウンス分析エラー:', error);
    return { type: 'unknown', reason: 'Analysis error', severity: 'low' };
  }
}

// Airtable記録テスト
async function testAirtableRecord(email, bounceInfo, apiKey, baseId) {
  try {
    const recordData = {
      fields: {
        Email: email,
        BounceCount: 1,
        BounceType: bounceInfo.type,
        Status: bounceInfo.type === 'hard' ? 'HARD_BOUNCE' : 'SOFT_BOUNCE',
        AddedAt: new Date().toISOString().split('T')[0],
        Notes: `Test bounce: ${bounceInfo.reason} (${bounceInfo.severity} severity)`
      }
    };

    console.log('📝 Airtable記録データ:', JSON.stringify(recordData, null, 2));

    const response = await fetch(`https://api.airtable.com/v0/${baseId}/EmailBlacklist`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(recordData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Airtable記録成功:', result.id);
    } else {
      const errorData = await response.text();
      console.error('❌ Airtable記録失敗:', response.status, errorData);
    }

  } catch (error) {
    console.error('❌ Airtable記録エラー:', error.message);
  }
}

// テスト実行
testDomainProtection().catch(console.error);