#!/usr/bin/env node

// バウンス検知ロジックのテストスクリプト
// SendGrid APIキーなしでもロジックを検証可能

import { config } from 'dotenv';
config();

async function testBounceLogic() {
  console.log('🧪 バウンス検知ロジックテスト開始');

  // テスト用のバウンス応答をシミュレート
  const testScenarios = [
    {
      status: 400,
      errorData: '{"errors":[{"message":"The email address you are trying to reach is invalid.","field":"to","help":null}]}',
      expectedType: 'hard',
      description: '無効なメールアドレス'
    },
    {
      status: 550,
      errorData: '{"errors":[{"message":"The email address does not exist.","field":"to","help":null}]}',
      expectedType: 'hard',
      description: '存在しないメールアドレス'
    },
    {
      status: 421,
      errorData: '{"errors":[{"message":"Service not available, try again later.","field":"to","help":null}]}',
      expectedType: 'soft',
      description: '一時的なサービス停止'
    },
    {
      status: 450,
      errorData: '{"errors":[{"message":"Requested action aborted: local error in processing.","field":"to","help":null}]}',
      expectedType: 'soft',
      description: '一時的な処理エラー'
    },
    {
      status: 500,
      errorData: '{"errors":[{"message":"Internal server error.","field":"to","help":null}]}',
      expectedType: 'unknown',
      description: 'サーバーエラー'
    }
  ];

  console.log('\n📊 バウンス分析テスト結果:');
  console.log('─'.repeat(80));

  let passedTests = 0;
  let totalTests = testScenarios.length;

  for (const scenario of testScenarios) {
    const result = analyzeBounce('test@example.com', scenario.status, scenario.errorData);
    const passed = result.type === scenario.expectedType;

    console.log(`${passed ? '✅' : '❌'} ${scenario.description}`);
    console.log(`   Status: ${scenario.status} → Type: ${result.type} (期待値: ${scenario.expectedType})`);
    console.log(`   理由: ${result.reason}`);
    console.log(`   重要度: ${result.severity}`);
    console.log('');

    if (passed) passedTests++;
  }

  console.log('─'.repeat(80));
  console.log(`📈 テスト結果: ${passedTests}/${totalTests} passed (${Math.round(passedTests/totalTests*100)}%)`);

  // Airtable記録のテスト（実際の記録は行わず、データ形式のみ検証）
  console.log('\n💾 Airtable記録データ形式テスト:');
  const testEmail = 'bounce-test@example.com';
  const testBounce = { type: 'hard', reason: 'Email does not exist', severity: 'high' };

  const recordData = formatAirtableRecord(testEmail, testBounce);
  console.log('📝 生成される記録データ:');
  console.log(JSON.stringify(recordData, null, 2));

  // ドメイン保護判定のテスト
  console.log('\n🛡️ ドメイン保護判定テスト:');
  testDomainProtectionLogic();
}

// バウンス分析関数（send-newsletter.jsから正確に抽出）
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

// Airtable記録データ形式（実際の送信は行わない）
function formatAirtableRecord(email, bounceInfo) {
  return {
    fields: {
      Email: email,
      BounceCount: 1,
      BounceType: bounceInfo.type,
      Status: bounceInfo.type === 'hard' ? 'HARD_BOUNCE' : 'SOFT_BOUNCE',
      LastBounceDate: new Date().toISOString(),
      AddedAt: new Date().toISOString(),
      Source: 'Domain Protection System',
      Notes: `Bounce detected: ${bounceInfo.reason} (${bounceInfo.severity} severity)`
    }
  };
}

// ドメイン保護ロジックのテスト
function testDomainProtectionLogic() {
  const protectionScenarios = [
    { hardBounces: 0, softBounces: 0, expected: 'allow', description: '正常状態' },
    { hardBounces: 1, softBounces: 2, expected: 'monitor', description: '軽微な問題' },
    { hardBounces: 3, softBounces: 5, expected: 'restrict', description: '要注意レベル' },
    { hardBounces: 5, softBounces: 10, expected: 'block', description: '危険レベル - ブロック必要' }
  ];

  protectionScenarios.forEach(scenario => {
    const decision = calculateProtectionLevel(scenario.hardBounces, scenario.softBounces);
    const correct = decision === scenario.expected;

    console.log(`${correct ? '✅' : '❌'} ${scenario.description}`);
    console.log(`   Hard: ${scenario.hardBounces}, Soft: ${scenario.softBounces} → 判定: ${decision}`);
  });
}

// ドメイン保護レベル計算
function calculateProtectionLevel(hardBounces, softBounces) {
  if (hardBounces >= 5) return 'block';
  if (hardBounces >= 3 || softBounces >= 8) return 'restrict';
  if (hardBounces >= 1 || softBounces >= 3) return 'monitor';
  return 'allow';
}

// テスト実行
testBounceLogic().catch(console.error);