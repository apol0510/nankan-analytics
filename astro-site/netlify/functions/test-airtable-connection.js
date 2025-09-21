// AirtableのEmailBlacklistテーブル接続テスト
// テーブル存在確認・フィールド名確認

export default async function handler(request, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Airtable環境変数が設定されていません',
          missing: {
            apiKey: !AIRTABLE_API_KEY,
            baseId: !AIRTABLE_BASE_ID
          }
        }),
        { status: 500, headers }
      );
    }

    const testResults = {
      baseConnection: false,
      emailBlacklistTable: false,
      fieldsAnalysis: {},
      sampleData: [],
      recommendations: []
    };

    // 1. ベース接続テスト
    console.log('🔍 Airtableベース接続テスト開始...');

    try {
      const baseResponse = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`,
        {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (baseResponse.ok) {
        testResults.baseConnection = true;
        console.log('✅ ベース接続成功');
      } else {
        console.log('❌ ベース接続失敗:', baseResponse.status);
        testResults.recommendations.push('Airtable API キーまたはベースIDを確認してください');
      }

    } catch (error) {
      console.error('ベース接続エラー:', error);
      testResults.recommendations.push('ネットワーク接続またはAPI設定を確認してください');
    }

    // 2. EmailBlacklistテーブル存在確認
    console.log('🔍 EmailBlacklistテーブル確認...');

    try {
      const tableResponse = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/EmailBlacklist?maxRecords=3`,
        {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (tableResponse.ok) {
        testResults.emailBlacklistTable = true;
        console.log('✅ EmailBlacklistテーブル存在');

        const tableData = await tableResponse.json();

        // フィールド分析
        if (tableData.records && tableData.records.length > 0) {
          const firstRecord = tableData.records[0].fields;
          testResults.fieldsAnalysis = {
            availableFields: Object.keys(firstRecord),
            expectedFields: ['Email', 'BounceCount', 'BounceType', 'Status', 'LastBounceDate'],
            fieldMatches: {}
          };

          // 期待するフィールドの存在確認
          testResults.fieldsAnalysis.expectedFields.forEach(expectedField => {
            const exists = firstRecord.hasOwnProperty(expectedField);
            testResults.fieldsAnalysis.fieldMatches[expectedField] = exists;

            if (!exists) {
              testResults.recommendations.push(`フィールド '${expectedField}' が見つかりません`);
            }
          });

          // サンプルデータ
          testResults.sampleData = tableData.records.map(record => ({
            id: record.id,
            fields: record.fields
          }));

        } else {
          testResults.recommendations.push('EmailBlacklistテーブルにデータが存在しません（テスト用データを作成することを推奨）');
        }

      } else {
        const errorText = await tableResponse.text();
        console.log('❌ EmailBlacklistテーブル接続失敗:', tableResponse.status, errorText);

        if (tableResponse.status === 404) {
          testResults.recommendations.push('EmailBlacklistテーブルが存在しません。Airtableで作成してください');
        } else {
          testResults.recommendations.push(`テーブル接続エラー: ${tableResponse.status} - 権限を確認してください`);
        }
      }

    } catch (error) {
      console.error('テーブル確認エラー:', error);
      testResults.recommendations.push('EmailBlacklistテーブルへのアクセスでエラーが発生しました');
    }

    // 3. 必要に応じてテーブル作成指示
    if (!testResults.emailBlacklistTable) {
      testResults.tableCreationInstructions = {
        tableName: 'EmailBlacklist',
        requiredFields: [
          { name: 'Email', type: 'Single line text', description: 'メールアドレス' },
          { name: 'BounceCount', type: 'Number', description: '失敗回数' },
          { name: 'BounceType', type: 'Single select', options: ['hard', 'soft'], description: 'バウンス種別' },
          { name: 'Status', type: 'Single select', options: ['HARD_BOUNCE', 'SOFT_BOUNCE', 'COMPLAINT'], description: 'ステータス' },
          { name: 'LastBounceDate', type: 'Date', description: '最終失敗日時' },
          { name: 'AddedAt', type: 'Date', description: '追加日時' },
          { name: 'Source', type: 'Single line text', description: '失敗の発生源' },
          { name: 'Notes', type: 'Long text', description: '備考' }
        ]
      };
    }

    // 4. テスト用データ作成の提案
    if (testResults.emailBlacklistTable && testResults.sampleData.length === 0) {
      testResults.testDataSuggestion = {
        description: 'システムテスト用のサンプルデータを作成することを推奨します',
        sampleRecords: [
          {
            Email: 'test-hard-bounce@invalid-domain.test',
            BounceCount: 1,
            BounceType: 'hard',
            Status: 'HARD_BOUNCE',
            LastBounceDate: new Date().toISOString().split('T')[0],
            Source: 'Test Data',
            Notes: 'ハードバウンステスト用'
          },
          {
            Email: 'test-soft-bounce@example.test',
            BounceCount: 3,
            BounceType: 'soft',
            Status: 'SOFT_BOUNCE',
            LastBounceDate: new Date().toISOString().split('T')[0],
            Source: 'Test Data',
            Notes: 'ソフトバウンステスト用（警告レベル）'
          }
        ]
      };
    }

    // 5. 総合判定
    const overallSuccess = testResults.baseConnection && testResults.emailBlacklistTable;
    const criticalIssues = testResults.recommendations.filter(rec =>
      rec.includes('存在しません') || rec.includes('確認してください')
    );

    return new Response(
      JSON.stringify({
        success: overallSuccess,
        timestamp: new Date().toISOString(),
        testResults,
        summary: {
          status: overallSuccess ? 'テーブル接続成功' : '設定に問題があります',
          criticalIssues: criticalIssues.length,
          totalRecommendations: testResults.recommendations.length
        },
        nextSteps: overallSuccess ?
          ['ドメイン保護システムは正常に動作します', 'テスト配信でシステムを確認してください'] :
          ['推奨事項に従ってAirtable設定を修正してください', 'テーブルとフィールドを作成してください']
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('Airtable接続テストエラー:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        recommendations: [
          'Airtable API キーが正しく設定されているか確認してください',
          'ベースIDが正しいか確認してください',
          'ネットワーク接続を確認してください'
        ]
      }),
      { status: 500, headers }
    );
  }
}