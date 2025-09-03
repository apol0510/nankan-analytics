// テスト用: ブラウザから手動実行できる版（ESModule）
import { handler as dailyPointsHandler } from './daily-points.js';

export const handler = async (event, context) => {
  // GETリクエストで簡単にテスト
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
          <title>ポイント付与テスト</title>
          <meta charset="utf-8">
          <style>
            body {
              font-family: sans-serif;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
              background: #f0f0f0;
            }
            button {
              background: #3b82f6;
              color: white;
              padding: 15px 30px;
              border: none;
              border-radius: 5px;
              font-size: 16px;
              cursor: pointer;
            }
            button:hover {
              background: #1d4ed8;
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
          <h1>🎯 デイリーポイント付与テスト</h1>
          <p>ボタンをクリックしてポイント付与を実行します</p>
          <button onclick="runTest()">ポイント付与を実行</button>
          <div id="result"></div>
          
          <script>
            async function runTest() {
              const resultDiv = document.getElementById('result');
              resultDiv.innerHTML = '実行中...';
              
              try {
                const response = await fetch('/.netlify/functions/test-points', {
                  method: 'POST'
                });
                const data = await response.json();
                if (data.success) {
                  resultDiv.innerHTML = '✅ 成功！\\n' + JSON.stringify(data, null, 2);
                } else {
                  resultDiv.innerHTML = '❌ エラー: ' + JSON.stringify(data, null, 2);
                }
              } catch (error) {
                resultDiv.innerHTML = '❌ エラー: ' + error.message;
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
    return await dailyPointsHandler(event, context);
  }
  
  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method Not Allowed' })
  };
};