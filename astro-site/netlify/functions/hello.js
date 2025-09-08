// Netlify Functions v2形式（Responseオブジェクト使用）
export default async function handler(request, context) {
  // CORSヘッダー
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // OPTIONS対応（CORS）
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // レスポンスデータ
  const data = {
    message: '🎉 Netlify Functions ESModule成功！',
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    env: 'Functions v2 with Response object'
  };

  // JSON形式でResponse返却
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    }
  });
}