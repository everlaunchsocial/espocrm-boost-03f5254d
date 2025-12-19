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

  try {
    const HEYGEN_API_KEY = Deno.env.get('HEYGEN_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!HEYGEN_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify caller is authenticated admin/super_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized: Invalid token');
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('global_role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || !['admin', 'super_admin'].includes(profile.global_role)) {
      throw new Error('Unauthorized: Admin access required');
    }

    console.log(`[generate-training-video] Authorized admin: ${user.email}`);

    // Get request body - training_library_id is now REQUIRED
    const { 
      training_library_id,
      avatar_id, 
      avatar_name,
      voice_id, 
      voice_name,
    } = await req.json();

    if (!training_library_id) {
      throw new Error('Missing required field: training_library_id');
    }

    if (!avatar_id || !voice_id) {
      throw new Error('Missing required fields: avatar_id, voice_id');
    }

    // Load training entry from training_library (server-side, not from client)
    const { data: trainingEntry, error: trainingError } = await supabase
      .from('training_library')
      .select('*')
      .eq('id', training_library_id)
      .single();

    if (trainingError || !trainingEntry) {
      throw new Error(`Training entry not found: ${training_library_id}`);
    }

    console.log(`[generate-training-video] Loaded training: ${trainingEntry.title}`);
    console.log(`[generate-training-video] Script version: ${trainingEntry.script_version}`);
    console.log(`[generate-training-video] Vertical: ${trainingEntry.vertical_key || 'none'}`);

    const script_text = trainingEntry.script;
    const title = trainingEntry.title;

    // Estimate cost (~$0.05 per second, average 150 words/min)
    const wordCount = script_text.split(/\s+/).length;
    const estimatedMinutes = wordCount / 150;
    const estimatedCost = estimatedMinutes * 3; // ~$3 per minute

    console.log(`[generate-training-video] Avatar: ${avatar_id}, Voice: ${voice_id}`);
    console.log(`[generate-training-video] Script: ${wordCount} words, ~$${estimatedCost.toFixed(2)} estimated`);

    // Create the training video record with training_library_id
    const { data: videoRecord, error: insertError } = await supabase
      .from('training_videos')
      .insert({
        status: 'processing',
        avatar_id,
        avatar_name,
        voice_id,
        voice_name,
        script_text,
        title,
        vertical: trainingEntry.vertical_key || null,
        training_library_id: training_library_id,
        estimated_cost_usd: estimatedCost,
      })
      .select()
      .single();
    
    if (insertError) throw insertError;

    console.log(`[generate-training-video] Training video record created: ${videoRecord.id}`);

    // Standard branded background for all training videos
    const TRAINING_VIDEO_BACKGROUND_URL = `${SUPABASE_URL}/storage/v1/object/public/assets/training-video-background.png`;

    // Call HeyGen to generate the video
    const heygenPayload = {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: avatar_id,
            avatar_style: 'normal',
          },
          voice: {
            type: 'text',
            input_text: script_text,
            voice_id: voice_id,
          },
          background: {
            type: 'image',
            url: TRAINING_VIDEO_BACKGROUND_URL,
          },
        },
      ],
      dimension: {
        width: 1920,
        height: 1080,
      },
      callback_id: `training_video_${videoRecord.id}`,
    };

    console.log('[generate-training-video] Calling HeyGen API...');

    const heygenResponse = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(heygenPayload),
    });

    if (!heygenResponse.ok) {
      const errorText = await heygenResponse.text();
      console.error('[generate-training-video] HeyGen error:', heygenResponse.status, errorText);
      
      // Update record with error
      await supabase
        .from('training_videos')
        .update({
          status: 'failed',
          error_message: `HeyGen API error: ${heygenResponse.status} - ${errorText}`,
        })
        .eq('id', videoRecord.id);
      
      throw new Error(`HeyGen API error: ${heygenResponse.status}`);
    }

    const heygenData = await heygenResponse.json();
    const heygenVideoId = heygenData.data?.video_id;

    console.log(`[generate-training-video] HeyGen started. Video ID: ${heygenVideoId}`);

    // Update record with HeyGen video ID
    await supabase
      .from('training_videos')
      .update({
        heygen_video_id: heygenVideoId,
      })
      .eq('id', videoRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        training_video_id: videoRecord.id,
        training_library_id: training_library_id,
        heygen_video_id: heygenVideoId,
        estimated_cost_usd: estimatedCost,
        title: title,
        script_version: trainingEntry.script_version,
        message: 'Video generation started. You will be notified when complete.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-training-video] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
