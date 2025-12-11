import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vapi Public Key for web SDK - this is safe to expose to frontend
    const VAPI_PUBLIC_KEY = Deno.env.get('VITE_VAPI_PUBLIC_KEY');
    
    if (!VAPI_PUBLIC_KEY) {
      console.error('VAPI_PUBLIC_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Voice web session not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { assistantId } = await req.json();

    if (!assistantId) {
      return new Response(
        JSON.stringify({ error: 'assistantId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Returning Vapi public key for web session, assistantId:', assistantId);

    return new Response(
      JSON.stringify({ 
        publicKey: VAPI_PUBLIC_KEY,
        assistantId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in vapi-web-session:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
