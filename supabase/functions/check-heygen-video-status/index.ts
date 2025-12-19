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
    const heygenApiKey = Deno.env.get('HEYGEN_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('global_role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.global_role)) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { training_video_id } = await req.json();

    if (!training_video_id) {
      return new Response(JSON.stringify({ error: 'training_video_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the training video record
    const { data: trainingVideo, error: tvError } = await supabase
      .from('training_videos')
      .select('id, heygen_video_id, status, training_library_id, title')
      .eq('id', training_video_id)
      .single();

    if (tvError || !trainingVideo) {
      return new Response(JSON.stringify({ error: 'Training video not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!trainingVideo.heygen_video_id) {
      return new Response(JSON.stringify({ error: 'No HeyGen video ID found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[check-heygen-video-status] Checking status for video: ${trainingVideo.heygen_video_id}`);

    // Poll HeyGen API for video status
    const heygenResponse = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${trainingVideo.heygen_video_id}`,
      {
        headers: {
          'X-Api-Key': heygenApiKey,
          'Accept': 'application/json',
        },
      }
    );

    if (!heygenResponse.ok) {
      const errorText = await heygenResponse.text();
      console.error(`[check-heygen-video-status] HeyGen API error: ${errorText}`);
      return new Response(JSON.stringify({ 
        error: 'HeyGen API error', 
        details: errorText 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const heygenData = await heygenResponse.json();
    console.log(`[check-heygen-video-status] HeyGen response:`, JSON.stringify(heygenData, null, 2));

    const videoStatus = heygenData.data?.status;
    const videoUrl = heygenData.data?.video_url;
    const errorMsg = heygenData.data?.error;

    // Handle completed video
    if (videoStatus === 'completed' && videoUrl) {
      console.log(`[check-heygen-video-status] Video completed! URL: ${videoUrl}`);

      // Download and upload to storage
      let storagePath: string | null = null;

      try {
        console.log('[check-heygen-video-status] Downloading video from HeyGen...');
        const videoResponse = await fetch(videoUrl);

        if (videoResponse.ok) {
          const videoBlob = await videoResponse.blob();
          const videoBuffer = await videoBlob.arrayBuffer();

          const timestamp = Date.now();
          const fileName = `${trainingVideo.training_library_id || 'orphan'}/${timestamp}.mp4`;
          storagePath = fileName;

          console.log(`[check-heygen-video-status] Uploading to storage: ${storagePath}`);

          const { error: uploadError } = await supabase.storage
            .from('training-videos')
            .upload(storagePath, videoBuffer, {
              contentType: 'video/mp4',
              upsert: false,
            });

          if (uploadError) {
            console.error('[check-heygen-video-status] Storage upload failed:', uploadError);
            storagePath = null;
          } else {
            console.log(`[check-heygen-video-status] Video uploaded to storage: ${storagePath}`);
          }
        }
      } catch (downloadError) {
        console.error('[check-heygen-video-status] Video download/upload failed:', downloadError);
      }

      // Update training_videos record
      const updateData: Record<string, unknown> = {
        status: 'ready',
        video_url: videoUrl,
        error_message: null,
        updated_at: new Date().toISOString(),
      };

      if (storagePath) {
        updateData.video_path = storagePath;
      }

      await supabase
        .from('training_videos')
        .update(updateData)
        .eq('id', training_video_id);

      // Update training_library.latest_video_path
      if (trainingVideo.training_library_id) {
        const latestPath = storagePath || videoUrl;

        await supabase
          .from('training_library')
          .update({
            latest_video_path: latestPath,
            updated_at: new Date().toISOString(),
          })
          .eq('id', trainingVideo.training_library_id);

        console.log(`[check-heygen-video-status] Updated training_library.latest_video_path`);
      }

      return new Response(JSON.stringify({
        success: true,
        status: 'ready',
        video_url: videoUrl,
        storage_path: storagePath,
        message: 'Video completed and processed',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle failed video
    if (videoStatus === 'failed' || videoStatus === 'error') {
      const errorMessage = errorMsg || 'Video generation failed';

      await supabase
        .from('training_videos')
        .update({
          status: 'failed',
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', training_video_id);

      return new Response(JSON.stringify({
        success: true,
        status: 'failed',
        error: errorMessage,
        message: 'Video generation failed',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Still processing
    return new Response(JSON.stringify({
      success: true,
      status: videoStatus || 'processing',
      message: `Video is still ${videoStatus || 'processing'}`,
      heygen_status: heygenData.data,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[check-heygen-video-status] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
