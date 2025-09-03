// 特典申請テスト用Function
import { handler as claimRewardHandler } from './claim-reward.js';

export const handler = async (event, context) => {
  // GETリクエストでテストUI表示
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      },
      body: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>特典申請テスト</title>
          <meta charset="utf-8">
          <style>
            body {
              font-family: sans-serif;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
              background: #f0f0f0;
            }
            .form-group {
              margin-bottom: 1rem;
            }
            label {
              display: block;
              margin-bottom: 0.5rem;
            }
            input[type="email"] {
              width: 100%;
              padding: 0.75rem;
              border: 1px solid #ccc;
              border-radius: 0.5rem;
              font-size: 1rem;
            }
            button {
              background: #3b82f6;
              color: white;
              padding: 15px 30px;
              border: none;
              border-radius: 5px;
              font-size: 16px;
              cursor: pointer;
              width: 100%;
              margin-top: 1rem;
            }
            button:hover {
              background: #1d4ed8;
            }
            button:disabled {
              background: #64748b;
              cursor: not-allowed;
            }
            #result {
              margin-top: 20px;
              padding: 20px;
              background: white;
              border-radius: 5px;
              white-space: pre-wrap;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <h1>🎁 特典申請テスト</h1>
          <p>Airtableの顧客データで特典申請をテストします</p>
          
          <div class="form-group">
            <label for="email">顧客メールアドレス:</label>
            <input type="email" id="email" placeholder="test@example.com">
          </div>
          
          <button onclick="testClaimReward()" id="testBtn">特典申請をテスト</button>
          <div id="result"></div>
          
          <script>
            async function testClaimReward() {
              const email = document.getElementById('email').value;
              const resultDiv = document.getElementById('result');
              const btn = document.getElementById('testBtn');
              
              if (!email) {
                alert('メールアドレスを入力してください');
                return;
              }
              
              btn.disabled = true;
              btn.textContent = 'テスト実行中...';
              resultDiv.innerHTML = '';
              
              try {
                const response = await fetch('/.netlify/functions/test-claim-reward', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                
                if (data.success) {
                  resultDiv.innerHTML = '✅ 成功！\\n' + JSON.stringify(data, null, 2);
                } else {
                  resultDiv.innerHTML = '❌ エラー:\\n' + JSON.stringify(data, null, 2);
                }
                
              } catch (error) {
                resultDiv.innerHTML = '❌ エラー: ' + error.message;
              } finally {
                btn.disabled = false;
                btn.textContent = '特典申請をテスト';
              }
            }
          </script>
        </body>
        </html>
      `
    };
  }
  
  // POSTリクエストで実際の処理を実行
  if (event.httpMethod === 'POST') {
    return await claimRewardHandler(event, context);
  }
  
  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method Not Allowed' })
  };
};