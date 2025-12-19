import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Starting HeyGen avatar refresh...');
  const startTime = Date.now();

  try {
    const HEYGEN_API_KEY = Deno.env.get('HEYGEN_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!HEYGEN_API_KEY) {
      throw new Error('HEYGEN_API_KEY is not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Fetching avatars from HeyGen API...');

    // Use AbortController to set a longer timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000); // 55 second timeout

    try {
      const response = await fetch('https://api.heygen.com/v2/avatars', {
        method: 'GET',
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HeyGen API error:', response.status, errorText);
        throw new Error(`HeyGen API error: ${response.status}`);
      }

      const data = await response.json();
      const fetchTime = Date.now() - startTime;
      console.log(`HeyGen API responded in ${fetchTime}ms`);

      // Transform avatars
      const avatarsRaw = data.data?.avatars || [];
      const avatars = avatarsRaw.map((avatar: any) => ({
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

      console.log(`Transformed ${avatars.length} avatars, upserting to cache...`);

      // Single upsert with full payload as JSONB
      const payload = { avatars, total: avatars.length };
      const now = new Date().toISOString();

      const { error: upsertError } = await supabase
        .from('heygen_cache')
        .upsert({
          key: 'avatars_v2',
          payload,
          cached_at: now,
        });

      if (upsertError) {
        console.error('Cache upsert error:', upsertError);
        throw upsertError;
      }

      const totalTime = Date.now() - startTime;
      console.log(`Cache refresh complete in ${totalTime}ms - ${avatars.length} avatars cached`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          total: avatars.length,
          fetch_time_ms: fetchTime,
          total_time_ms: totalTime,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (fetchError) {
      clearTimeout(timeout);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('HeyGen API request timed out after 55 seconds');
        throw new Error('HeyGen API request timed out');
      }
      throw fetchError;
    }

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`Error refreshing avatars after ${totalTime}ms:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        elapsed_ms: totalTime,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
