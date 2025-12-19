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
    const HEYGEN_API_KEY = Deno.env.get('HEYGEN_API_KEY');
    if (!HEYGEN_API_KEY) {
      throw new Error('HEYGEN_API_KEY is not configured');
    }

    console.log('Fetching voices from HeyGen...');

    // Fetch voices from HeyGen API
    const response = await fetch('https://api.heygen.com/v2/voices', {
      method: 'GET',
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HeyGen API error:', response.status, errorText);
      throw new Error(`HeyGen API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('HeyGen voices response received, processing...');

    // Format voices for our UI
    const voices = data.data?.voices || [];
    
    const formattedVoices = voices.map((voice: any) => ({
      voice_id: voice.voice_id,
      name: voice.name || voice.display_name || voice.voice_id,
      language: voice.language || 'en',
      gender: voice.gender || 'unknown',
      preview_audio_url: voice.preview_audio || null,
      is_premium: voice.is_premium || false,
      support_pause: voice.support_pause || false,
      emotion_support: voice.emotion_support || false,
    }));

    console.log(`Found ${formattedVoices.length} voices`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        voices: formattedVoices,
        total: formattedVoices.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching voices:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
