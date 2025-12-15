import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-heygen-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('HEYGEN_WEBHOOK_SECRET');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);

    // ============================================
    // VERIFY WEBHOOK SIGNATURE (if secret is set)
    // ============================================
    if (webhookSecret) {
      const signature = req.headers.get('x-heygen-signature') || req.headers.get('X-HeyGen-Signature');
      
      if (!signature) {
        console.warn('[heygen-webhook] Missing signature header');
        return new Response(JSON.stringify({ error: 'Missing signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify HMAC signature
      // TODO: Verify exact HeyGen signature format from docs
      const expectedSignature = createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature && signature !== `sha256=${expectedSignature}`) {
        console.error('[heygen-webhook] Invalid signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('[heygen-webhook] Received payload:', JSON.stringify(payload, null, 2));

    // ============================================
    // PROCESS WEBHOOK EVENT
    // ============================================
    const eventType = payload.event || payload.type || payload.event_type;
    const videoId = payload.data?.video_id || payload.video_id;
    const videoUrl = payload.data?.video_url || payload.video_url;
    const status = payload.data?.status || payload.status;

    if (!videoId) {
      console.warn('[heygen-webhook] No video_id in payload');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find video by heygen_video_id
    const { data: video, error: videoError } = await supabase
      .from('affiliate_videos')
      .select('id, affiliate_id, landing_page_slug')
      .eq('heygen_video_id', videoId)
      .single();

    if (videoError || !video) {
      console.warn(`[heygen-webhook] Video not found for heygen_video_id: ${videoId}`);
      return new Response(JSON.stringify({ received: true, warning: 'Video not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle video completion
    if (eventType === 'video.completed' || eventType === 'video_completed' || status === 'completed' || status === 'ready') {
      console.log(`[heygen-webhook] Video ${video.id} completed. URL: ${videoUrl}`);

      // Generate slug if not exists
      let slug = video.landing_page_slug;
      if (!slug) {
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('username')
          .eq('id', video.affiliate_id)
          .single();

        const baseSlug = `${affiliate?.username || 'video'}-${Date.now()}`.toLowerCase();
        slug = baseSlug;
      }

      await supabase
        .from('affiliate_videos')
        .update({
          status: 'ready',
          heygen_video_url: videoUrl,
          landing_page_slug: slug,
          error_message: null,
        })
        .eq('id', video.id);

      console.log(`[heygen-webhook] Video ${video.id} marked as ready`);
    }

    // Handle video failure
    if (eventType === 'video.failed' || eventType === 'video_failed' || status === 'failed' || status === 'error') {
      const errorMessage = payload.data?.error || payload.error || 'Video generation failed';
      console.error(`[heygen-webhook] Video ${video.id} failed: ${errorMessage}`);

      await supabase
        .from('affiliate_videos')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', video.id);
    }

    return new Response(JSON.stringify({ received: true, video_id: video.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[heygen-webhook] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
