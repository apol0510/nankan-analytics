// テストメールアドレスを無効ドメインに更新するスクリプト
// example.comドメインから完全に存在しないドメインに変更

import 'dotenv/config';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

const customersUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Customers`;
const blacklistUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/EmailBlacklist`;

// 現在のテストメールと新しい無効ドメインのマッピング
const emailMappings = {
  'invalid@example.com': 'invalid@nonexistdomain99999.fake',
  'warning@example.com': 'warning@bouncedomain88888.invalid', 
  'limit@example.com': 'limit@failmail77777.nonexist',
  'test@example.com': 'test@errormail66666.fake'
};

async function updateCustomersTable() {
  console.log('🔄 Customersテーブルのテストメール更新開始...');
  
  try {
    // Test プランの顧客を取得
    const filterFormula = "{プラン} = 'Test'";
    const response = await fetch(`${customersUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Customers取得失敗: ${response.status}`);
    }

    const data = await response.json();
    console.log(`📧 取得したTestプラン顧客: ${data.records.length}件`);

    // 各レコードを更新
    for (const record of data.records) {
      const oldEmail = record.fields.Email;
      const newEmail = emailMappings[oldEmail];
      
      if (newEmail) {
        console.log(`🔄 更新: ${oldEmail} → ${newEmail}`);
        
        const updateResponse = await fetch(`${customersUrl}/${record.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              Email: newEmail
            }
          })
        });

        if (updateResponse.ok) {
          console.log(`✅ ${oldEmail} 更新完了`);
        } else {
          console.error(`❌ ${oldEmail} 更新失敗:`, updateResponse.status);
        }
      } else {
        console.log(`⚠️  マッピングなし: ${oldEmail}`);
      }
    }

  } catch (error) {
    console.error('❌ Customersテーブル更新エラー:', error);
  }
}

async function updateBlacklistTable() {
  console.log('🔄 EmailBlacklistテーブルのテストメール更新開始...');
  
  try {
    // 全ての EmailBlacklist レコードを取得
    const response = await fetch(blacklistUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`EmailBlacklist取得失敗: ${response.status}`);
    }

    const data = await response.json();
    console.log(`📧 取得したBlacklistレコード: ${data.records.length}件`);

    // 各レコードを確認・更新
    for (const record of data.records) {
      const oldEmail = record.fields.Email;
      const newEmail = emailMappings[oldEmail];
      
      if (newEmail) {
        console.log(`🔄 Blacklist更新: ${oldEmail} → ${newEmail}`);
        
        const updateResponse = await fetch(`${blacklistUrl}/${record.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              Email: newEmail
            }
          })
        });

        if (updateResponse.ok) {
          console.log(`✅ Blacklist ${oldEmail} 更新完了`);
        } else {
          console.error(`❌ Blacklist ${oldEmail} 更新失敗:`, updateResponse.status);
        }
      } else {
        console.log(`⚠️  Blacklist マッピングなし: ${oldEmail}`);
      }
    }

  } catch (error) {
    console.error('❌ EmailBlacklistテーブル更新エラー:', error);
  }
}

async function main() {
  console.log('🚀 テストメールアドレス更新スクリプト開始');
  console.log('📋 更新予定マッピング:', emailMappings);
  
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.error('❌ Airtable認証情報が設定されていません');
    process.exit(1);
  }

  // Customersテーブル更新
  await updateCustomersTable();
  
  // EmailBlacklistテーブル更新  
  await updateBlacklistTable();
  
  console.log('🎉 テストメールアドレス更新完了！');
  console.log('📧 新しいテストメール:');
  Object.values(emailMappings).forEach(email => {
    console.log(`   - ${email}`);
  });
}

main().catch(console.error);