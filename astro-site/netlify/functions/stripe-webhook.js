// Netlify Function: Stripe Webhook Handler
// このファイルは /api/stripe/webhook へのリクエストを処理します

exports.handler = async (event, context) => {
  // Astro APIルートへプロキシ
  const astroApiUrl = `${process.env.URL || 'https://nankan-analytics.keiba.link'}/api/stripe/webhook`;
  
  try {
    const response = await fetch(astroApiUrl, {
      method: event.httpMethod,
      headers: event.headers,
      body: event.body
    });

    const responseBody = await response.text();
    
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json'
      },
      body: responseBody
    };
  } catch (error) {
    console.error('Webhook proxy error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};