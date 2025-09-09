// Test API route
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
    console.log('[test] GET request received');
    return new Response(JSON.stringify({ message: 'GET OK' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};

export const POST: APIRoute = async ({ request }) => {
    console.log('[test] POST request received');
    const body = await request.text();
    console.log('[test] Body:', body);
    
    return new Response(JSON.stringify({ 
        message: 'POST OK', 
        received: body 
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};