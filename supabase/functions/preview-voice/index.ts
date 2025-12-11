import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map numeric speed (0.5-2.0) to Cartesia string values
const mapSpeedToCartesia = (speed: number): string => {
  if (speed <= 0.6) return 'slowest';
  if (speed <= 0.85) return 'slow';
  if (speed <= 1.15) return 'normal';
  if (speed <= 1.5) return 'fast';
  return 'fastest';
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { voice_id, text, speed } = await req.json();

    if (!voice_id) {
      return new Response(
        JSON.stringify({ error: 'voice_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cartesiaApiKey = Deno.env.get('CARTESIA_API_KEY');
    
    // If no Cartesia API key, try using Vapi TTS endpoint
    const vapiApiKey = Deno.env.get('VAPI_API_KEY');
    
    if (!cartesiaApiKey && !vapiApiKey) {
      console.error('No API key configured for voice preview');
      return new Response(
        JSON.stringify({ error: 'Voice preview not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sampleText = text || "Hi there! I'm your AI assistant. How can I help you today?";

    // Try Cartesia API directly
    if (cartesiaApiKey) {
      console.log('Using Cartesia API for voice preview');
      
      // Build request body with optional speed
      const requestBody: any = {
        model_id: 'sonic-english',
        transcript: sampleText,
        voice: {
          mode: 'id',
          id: voice_id,
        },
        output_format: {
          container: 'mp3',
          encoding: 'mp3',
          sample_rate: 44100,
        },
      };

      // Add speed control inside voice object if provided (Cartesia uses __experimental_controls)
      if (speed !== undefined && speed !== null && speed !== 1.0) {
        const cartesiaSpeed = mapSpeedToCartesia(speed);
        requestBody.voice.__experimental_controls = {
          speed: cartesiaSpeed
        };
        console.log('Preview with speed:', speed, '-> Cartesia:', cartesiaSpeed);
      }

      const response = await fetch('https://api.cartesia.ai/tts/bytes', {
        method: 'POST',
        headers: {
          'Cartesia-Version': '2024-06-10',
          'X-API-Key': cartesiaApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cartesia API error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to generate voice preview' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const audioBuffer = await response.arrayBuffer();
      const base64Audio = base64Encode(audioBuffer);

      return new Response(
        JSON.stringify({ audio: base64Audio, format: 'mp3' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: return a message that preview requires API key
    return new Response(
      JSON.stringify({ 
        error: 'Voice preview requires Cartesia API key configuration',
        message: 'Contact support to enable voice preview'
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in preview-voice:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
