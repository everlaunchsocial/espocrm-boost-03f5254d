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
    const videoId = payload.event_data?.video_id || payload.data?.video_id || payload.video_id;
    const videoUrl = payload.event_data?.video_url || payload.data?.video_url || payload.video_url;
    const status = payload.event_data?.status || payload.data?.status || payload.status;
    const errorMsg = payload.event_data?.msg || payload.data?.error || payload.error;
    const callbackId = payload.callback_id || payload.event_data?.callback_id || payload.data?.callback_id;

    if (!videoId) {
      console.warn('[heygen-webhook] No video_id in payload');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================
    // CHECK IF THIS IS A TRAINING VIDEO
    // ============================================
    if (callbackId && callbackId.startsWith('training_video_')) {
      const trainingVideoId = callbackId.replace('training_video_', '');
      console.log(`[heygen-webhook] Processing training video callback: ${trainingVideoId}`);
      
      // Handle training video completion
      if (eventType === 'avatar_video.success' || eventType === 'video.completed' || eventType === 'video_completed' || status === 'completed' || status === 'ready') {
        console.log(`[heygen-webhook] Training video ${trainingVideoId} completed. URL: ${videoUrl}`);
        
        // Get the training video record to find the vertical
        const { data: trainingVideo, error: tvError } = await supabase
          .from('training_videos')
          .select('id, vertical, linked_vertical_id, title')
          .eq('id', trainingVideoId)
          .single();
        
        if (tvError || !trainingVideo) {
          console.warn(`[heygen-webhook] Training video not found: ${trainingVideoId}`);
        } else {
          // Update training video with completed status and URL
          await supabase
            .from('training_videos')
            .update({
              status: 'ready',
              video_url: videoUrl,
              error_message: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', trainingVideoId);
          
          console.log(`[heygen-webhook] Training video ${trainingVideoId} marked as ready`);
          
          // AUTO-LINK: If linked_vertical_id is set, update vertical_training.video_path
          if (trainingVideo.linked_vertical_id) {
            await supabase
              .from('vertical_training')
              .update({
                video_path: videoUrl,
                updated_at: new Date().toISOString(),
              })
              .eq('id', trainingVideo.linked_vertical_id);
            
            console.log(`[heygen-webhook] Auto-linked video to vertical_training: ${trainingVideo.linked_vertical_id}`);
          }
          // FALLBACK: Try to match by vertical name if no linked_vertical_id
          else if (trainingVideo.vertical) {
            // Try to find matching vertical_training by industry_name (case-insensitive)
            const { data: matchingVertical } = await supabase
              .from('vertical_training')
              .select('id, industry_name')
              .ilike('industry_name', `%${trainingVideo.vertical}%`)
              .limit(1)
              .single();
            
            if (matchingVertical) {
              // Update vertical_training with the video path
              await supabase
                .from('vertical_training')
                .update({
                  video_path: videoUrl,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', matchingVertical.id);
              
              // Also update training_videos with the linked_vertical_id
              await supabase
                .from('training_videos')
                .update({
                  linked_vertical_id: matchingVertical.id,
                })
                .eq('id', trainingVideoId);
              
              console.log(`[heygen-webhook] Auto-matched and linked to vertical: ${matchingVertical.industry_name}`);
            } else {
              console.log(`[heygen-webhook] No matching vertical found for: ${trainingVideo.vertical}`);
            }
          }
        }
        
        return new Response(JSON.stringify({ received: true, training_video_id: trainingVideoId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Handle training video failure
      if (eventType === 'avatar_video.fail' || eventType === 'video.failed' || eventType === 'video_failed' || status === 'failed' || status === 'error') {
        const errorMessage = errorMsg || 'Video generation failed';
        console.error(`[heygen-webhook] Training video ${trainingVideoId} failed: ${errorMessage}`);
        
        await supabase
          .from('training_videos')
          .update({
            status: 'failed',
            error_message: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', trainingVideoId);
        
        return new Response(JSON.stringify({ received: true, training_video_id: trainingVideoId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ============================================
    // EXISTING AFFILIATE VIDEO HANDLING
    // ============================================
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
    if (eventType === 'avatar_video.success' || eventType === 'video.completed' || eventType === 'video_completed' || status === 'completed' || status === 'ready') {
      console.log(`[heygen-webhook] Video ${video.id} completed. URL: ${videoUrl}`);

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
    if (eventType === 'avatar_video.fail' || eventType === 'video.failed' || eventType === 'video_failed' || status === 'failed' || status === 'error') {
      const errorMessage = errorMsg || payload.data?.error || payload.error || 'Video generation failed';
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
