import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CACHE_MAX_AGE_HOURS = 24;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HEYGEN_API_KEY = Deno.env.get('HEYGEN_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!HEYGEN_API_KEY) {
      throw new Error('HEYGEN_API_KEY is not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration is missing');
    }

    // Check if force refresh is requested (from body or URL param)
    let forceRefresh = false;
    try {
      const body = await req.json();
      forceRefresh = body?.refresh === true;
    } catch {
      // No body or invalid JSON, check URL param
      const url = new URL(req.url);
      forceRefresh = url.searchParams.get('refresh') === 'true';
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      console.log('Checking avatar cache...');
      
      const { data: cachedAvatars, error: cacheError } = await supabase
        .from('heygen_avatars_cache')
        .select('*')
        .order('name', { ascending: true });

      if (!cacheError && cachedAvatars && cachedAvatars.length > 0) {
        // Check if cache is still fresh
        const oldestCache = cachedAvatars[0]?.cached_at;
        const cacheAge = oldestCache ? 
          (Date.now() - new Date(oldestCache).getTime()) / (1000 * 60 * 60) : 
          Infinity;

        if (cacheAge < CACHE_MAX_AGE_HOURS) {
          console.log(`Returning ${cachedAvatars.length} cached avatars (${cacheAge.toFixed(1)}h old)`);
          
          // Format cached data to match expected structure
          const formattedAvatars = cachedAvatars.map((avatar) => ({
            avatar_id: avatar.avatar_id,
            name: avatar.name,
            gender: avatar.gender,
            preview_image_url: avatar.preview_image_url,
            preview_video_url: avatar.preview_video_url,
            is_premium: avatar.is_premium,
            tags: avatar.tags || [],
            default_voice_id: avatar.default_voice_id,
            default_voice_name: avatar.default_voice_name,
          }));

          return new Response(
            JSON.stringify({ 
              success: true, 
              avatars: formattedAvatars,
              total: formattedAvatars.length,
              cached: true,
              cached_at: oldestCache,
              cache_age_hours: cacheAge.toFixed(1)
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.log(`Cache is stale (${cacheAge.toFixed(1)}h old), refreshing...`);
        }
      } else {
        console.log('No cached avatars found, fetching from HeyGen...');
      }
    } else {
      console.log('Force refresh requested, fetching from HeyGen...');
    }

    // Fetch fresh data from HeyGen API
    console.log('Fetching stock avatars from HeyGen...');

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

    console.log(`Found ${formattedAvatars.length} avatars, updating cache...`);

    // Update cache: delete old entries and insert new ones
    const { error: deleteError } = await supabase
      .from('heygen_avatars_cache')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error clearing cache:', deleteError);
    }

    // Insert new avatars in batches to avoid timeout
    const BATCH_SIZE = 100;
    const now = new Date().toISOString();
    
    for (let i = 0; i < formattedAvatars.length; i += BATCH_SIZE) {
      const batch = formattedAvatars.slice(i, i + BATCH_SIZE).map((avatar: any) => ({
        avatar_id: avatar.avatar_id,
        name: avatar.name,
        gender: avatar.gender,
        preview_image_url: avatar.preview_image_url,
        preview_video_url: avatar.preview_video_url,
        is_premium: avatar.is_premium,
        tags: avatar.tags,
        default_voice_id: avatar.default_voice_id,
        default_voice_name: avatar.default_voice_name,
        cached_at: now,
      }));

      const { error: insertError } = await supabase
        .from('heygen_avatars_cache')
        .upsert(batch, { onConflict: 'avatar_id' });

      if (insertError) {
        console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError);
      }
    }

    console.log(`Cache updated with ${formattedAvatars.length} avatars`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        avatars: formattedAvatars,
        total: formattedAvatars.length,
        cached: false,
        cached_at: now,
        cache_age_hours: 0
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
