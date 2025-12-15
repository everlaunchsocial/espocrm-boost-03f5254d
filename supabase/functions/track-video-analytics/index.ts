import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { video_id, event_type, referrer } = await req.json();

    if (!video_id || !event_type) {
      throw new Error('Missing required fields: video_id, event_type');
    }

    // Validate event_type
    const validEventTypes = ['view', 'phone_cta', 'chat_cta', 'voice_cta'];
    if (!validEventTypes.includes(event_type)) {
      throw new Error(`Invalid event_type. Must be one of: ${validEventTypes.join(', ')}`);
    }

    // Get video to find affiliate_id
    const { data: video, error: videoError } = await supabase
      .from('affiliate_videos')
      .select('id, affiliate_id')
      .eq('id', video_id)
      .single();

    if (videoError || !video) {
      throw new Error('Video not found');
    }

    // Extract IP and user agent from request
    const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('cf-connecting-ip')
      || req.headers.get('x-real-ip')
      || 'unknown';
    const user_agent = req.headers.get('user-agent') || 'unknown';

    // Insert analytics event
    const { error: insertError } = await supabase
      .from('video_analytics')
      .insert({
        video_id: video.id,
        affiliate_id: video.affiliate_id,
        event_type,
        ip_address,
        user_agent,
        referrer: referrer || null,
      });

    if (insertError) {
      console.error('[track-video-analytics] Insert error:', insertError);
      throw new Error(`Failed to log analytics: ${insertError.message}`);
    }

    console.log(`[track-video-analytics] Logged ${event_type} for video ${video_id}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[track-video-analytics] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
