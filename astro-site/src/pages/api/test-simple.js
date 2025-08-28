// シンプルなテストAPI
export const prerender = false;

export async function GET() {
  console.log('[API] Simple test endpoint called');
  
  return new Response(JSON.stringify({ 
    message: 'Hello from API',
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST({ request }) {
  console.log('[API] Simple POST endpoint called');
  
  try {
    const body = await request.json();
    console.log('[API] Request body:', body);
    
    return new Response(JSON.stringify({ 
      message: 'POST received successfully',
      data: body,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('[API] Error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Bad request',
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}