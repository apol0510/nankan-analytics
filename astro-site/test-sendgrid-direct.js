#!/usr/bin/env node

// SendGrid APIに直接アクセスして実際のアドレスをテスト

import { config } from 'dotenv';
config();

async function testSendGridDirect() {
  console.log('🔍 SendGrid直接テスト: 1testapolon_05@example.com');

  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  if (!SENDGRID_API_KEY) {
    console.error('❌ SendGrid API key not found');
    return;
  }

  const testEmail = 'invalid-test@nonexistentdomain99999.invalid';

  const emailData = {
    personalizations: [
      {
        to: [{ email: testEmail }],
        subject: 'ドメイン保護テスト - 実在しないアドレス'
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

  console.log('📤 送信先:', testEmail);
  console.log('📧 送信データ構造準備完了');

  try {
    console.log('🚀 SendGrid API呼び出し中...');

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    console.log(`📊 SendGridレスポンス: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.text();
      console.log('🔍 エラーレスポンス:');
      console.log(errorData);

      // バウンス分析実行
      console.log('\n📈 バウンス分析:');
      const bounceInfo = analyzeBounce(testEmail, response.status, errorData);
      console.log('結果:', bounceInfo);

      if (bounceInfo.type === 'hard') {
        console.log('🛡️ Hard bounce検知 - Airtableに記録すべき');
        await recordToAirtable(testEmail, bounceInfo);
      }

    } else {
      console.log('✅ 送信成功（202 Accepted）');
      console.log('📌 重要: example.comは有効なドメインのため、SendGridは即座にエラーを返しません');
      console.log('📌 実際のバウンスは配信後にwebhook経由で通知されます');

      console.log('\n💡 解決策:');
      console.log('1. SendGrid Webhookを設定してバウンス通知を受け取る');
      console.log('2. より明確に無効なドメインを使用する');
      console.log('3. SendGrid Activity Feed でバウンス状況を確認する');
    }

  } catch (error) {
    console.error('❌ APIエラー:', error.message);
  }
}

// バウンス分析関数（既存のロジック）
function analyzeBounce(email, statusCode, errorData) {
  try {
    let errorObj;
    try {
      errorObj = JSON.parse(errorData);
    } catch {
      errorObj = { message: errorData };
    }

    const errorMessage = (errorObj.message || errorData || '').toLowerCase();

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

    if (statusCode === 400 || hardBounceIndicators.some(indicator => errorMessage.includes(indicator))) {
      return { type: 'hard', reason: 'hard-bounce', severity: 'high' };
    }

    return { type: 'unknown', reason: 'No immediate bounce detected', severity: 'low' };

  } catch (error) {
    return { type: 'error', reason: 'Analysis failed', severity: 'low' };
  }
}

// Airtable記録関数
async function recordToAirtable(email, bounceInfo) {
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.log('⚠️ Airtable環境変数未設定');
    return;
  }

  try {
    const recordData = {
      fields: {
        Email: email,
        BounceCount: 1,
        BounceType: bounceInfo.type,
        Status: 'HARD_BOUNCE',
        AddedAt: new Date().toISOString().split('T')[0],
        Notes: `Direct test: ${bounceInfo.reason}`
      }
    };

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
      console.log(`✅ Airtable記録成功: ${result.id}`);
    } else {
      const error = await response.text();
      console.log(`❌ Airtable記録失敗: ${error}`);
    }

  } catch (error) {
    console.error('❌ Airtable記録エラー:', error.message);
  }
}

// テスト実行
testSendGridDirect().catch(console.error);