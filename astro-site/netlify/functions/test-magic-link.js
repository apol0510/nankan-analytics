// マジックリンク認証テスト用Function
import { handler as sendMagicLinkHandler } from './send-magic-link.js';
import { handler as verifyMagicLinkHandler } from './verify-magic-link.js';

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
          <title>マジックリンク認証テスト</title>
          <meta charset="utf-8">
          <style>
            body {
              font-family: sans-serif;
              max-width: 800px;
              margin: 50px auto;
              padding: 20px;
              background: #f0f0f0;
            }
            .form-section {
              background: white;
              padding: 20px;
              margin-bottom: 20px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .form-group {
              margin-bottom: 1rem;
            }
            label {
              display: block;
              margin-bottom: 0.5rem;
              font-weight: bold;
            }
            input[type="email"], input[type="text"] {
              width: 100%;
              padding: 0.75rem;
              border: 1px solid #ccc;
              border-radius: 0.5rem;
              font-size: 1rem;
              box-sizing: border-box;
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
              border: 1px solid #ddd;
            }
          </style>
        </head>
        <body>
          <h1>🔐 マジックリンク認証テスト</h1>
          <p>Airtableの顧客データでマジックリンク認証をテストします</p>
          
          <!-- マジックリンク送信テスト -->
          <div class="form-section">
            <h2>📧 Step 1: マジックリンク送信</h2>
            <div class="form-group">
              <label for="email1">顧客メールアドレス:</label>
              <input type="email" id="email1" placeholder="test@example.com">
            </div>
            <button onclick="sendMagicLink()" id="sendBtn">マジックリンクを送信</button>
          </div>
          
          <!-- マジックリンク認証テスト -->
          <div class="form-section">
            <h2>🔑 Step 2: マジックリンク認証</h2>
            <div class="form-group">
              <label for="email2">メールアドレス:</label>
              <input type="email" id="email2" placeholder="test@example.com">
            </div>
            <div class="form-group">
              <label for="token">認証トークン:</label>
              <input type="text" id="token" placeholder="トークンをここに入力">
            </div>
            <button onclick="verifyMagicLink()" id="verifyBtn">認証をテスト</button>
          </div>
          
          <div id="result"></div>
          
          <script>
            async function sendMagicLink() {
              const email = document.getElementById('email1').value;
              const resultDiv = document.getElementById('result');
              const btn = document.getElementById('sendBtn');
              
              if (!email) {
                alert('メールアドレスを入力してください');
                return;
              }
              
              btn.disabled = true;
              btn.textContent = '送信中...';
              resultDiv.innerHTML = '';
              
              try {
                const response = await fetch('/.netlify/functions/send-magic-link', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                
                if (data.success) {
                  resultDiv.innerHTML = '✅ マジックリンク送信成功！\\n' + JSON.stringify(data, null, 2);
                  // 次のステップに自動入力
                  document.getElementById('email2').value = email;
                } else {
                  resultDiv.innerHTML = '❌ 送信エラー:\\n' + JSON.stringify(data, null, 2);
                }
                
              } catch (error) {
                resultDiv.innerHTML = '❌ エラー: ' + error.message;
              } finally {
                btn.disabled = false;
                btn.textContent = 'マジックリンクを送信';
              }
            }
            
            async function verifyMagicLink() {
              const email = document.getElementById('email2').value;
              const token = document.getElementById('token').value;
              const resultDiv = document.getElementById('result');
              const btn = document.getElementById('verifyBtn');
              
              if (!email || !token) {
                alert('メールアドレスとトークンを入力してください');
                return;
              }
              
              btn.disabled = true;
              btn.textContent = '認証中...';
              resultDiv.innerHTML = '';
              
              try {
                const response = await fetch('/.netlify/functions/verify-magic-link', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email, token })
                });
                
                const data = await response.json();
                
                if (data.success) {
                  resultDiv.innerHTML = '✅ 認証成功！\\n' + JSON.stringify(data, null, 2);
                } else {
                  resultDiv.innerHTML = '❌ 認証エラー:\\n' + JSON.stringify(data, null, 2);
                }
                
              } catch (error) {
                resultDiv.innerHTML = '❌ エラー: ' + error.message;
              } finally {
                btn.disabled = false;
                btn.textContent = '認証をテスト';
              }
            }
          </script>
        </body>
        </html>
      `
    };
  }
  
  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method Not Allowed' })
  };
};