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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Read-only: just fetch from cache
    console.log('Fetching avatars from cache...');
    const startTime = Date.now();

    const { data, error } = await supabase
      .from('heygen_cache')
      .select('payload, cached_at')
      .eq('key', 'avatars_v2')
      .maybeSingle();

    if (error) {
      console.error('Cache read error:', error);
      throw error;
    }

    const readTime = Date.now() - startTime;
    console.log(`Cache read completed in ${readTime}ms`);

    // Cache empty - return warming flag
    if (!data) {
      console.log('Cache empty, returning warming state');
      return new Response(
        JSON.stringify({
          success: true,
          avatars: [],
          total: 0,
          cached: false,
          warming: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate cache age
    const cacheAgeHours = (Date.now() - new Date(data.cached_at).getTime()) / (1000 * 60 * 60);
    const stale = cacheAgeHours >= CACHE_MAX_AGE_HOURS;

    console.log(`Returning ${data.payload?.avatars?.length || 0} cached avatars (${cacheAgeHours.toFixed(1)}h old, stale: ${stale})`);

    return new Response(
      JSON.stringify({
        success: true,
        avatars: data.payload?.avatars ?? [],
        total: data.payload?.total ?? (data.payload?.avatars?.length ?? 0),
        cached: true,
        cached_at: data.cached_at,
        cache_age_hours: cacheAgeHours.toFixed(1),
        stale,
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
