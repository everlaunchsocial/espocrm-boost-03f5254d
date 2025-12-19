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

    console.log('Fetching stock avatars from HeyGen...');

    // Fetch avatars from HeyGen API
    const response = await fetch('https://api.heygen.com/v2/avatars', {
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
    console.log('HeyGen response received, processing avatars...');

    // Format avatars for our UI
    const avatars = data.data?.avatars || [];
    
    const formattedAvatars = avatars.map((avatar: any) => ({
      avatar_id: avatar.avatar_id,
      name: avatar.avatar_name || avatar.avatar_id,
      gender: avatar.gender || 'unknown',
      preview_image_url: avatar.preview_image_url || null,
      preview_video_url: avatar.preview_video_url || null,
      is_premium: avatar.premium || false,
      tags: avatar.tags || [],
      default_voice_id: avatar.default_voice?.voice_id || null,
      default_voice_name: avatar.default_voice?.name || null,
    }));

    console.log(`Found ${formattedAvatars.length} avatars`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        avatars: formattedAvatars,
        total: formattedAvatars.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching avatars:', error);
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
