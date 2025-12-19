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

    // Get request body
    const { 
      training_video_id,
      avatar_id, 
      avatar_name,
      voice_id, 
      voice_name,
      script_text, 
      title,
      vertical,
      linked_vertical_id
    } = await req.json();

    if (!avatar_id || !voice_id || !script_text || !title) {
      throw new Error('Missing required fields: avatar_id, voice_id, script_text, title');
    }

    console.log(`Generating training video: ${title}`);
    console.log(`Avatar: ${avatar_id}, Voice: ${voice_id}`);
    console.log(`Script length: ${script_text.length} characters`);
    console.log(`Linked vertical ID: ${linked_vertical_id || 'none'}`);

    // Estimate cost (~$0.05 per second, average 150 words/min)
    const wordCount = script_text.split(/\s+/).length;
    const estimatedMinutes = wordCount / 150;
    const estimatedCost = estimatedMinutes * 3; // ~$3 per minute

    // Create or update the training video record
    let videoRecord;
    if (training_video_id) {
      const { data, error } = await supabase
        .from('training_videos')
        .update({
          status: 'processing',
          avatar_id,
          avatar_name,
          voice_id,
          voice_name,
          script_text,
          title,
          vertical,
          linked_vertical_id: linked_vertical_id || null,
          estimated_cost_usd: estimatedCost,
          error_message: null,
        })
        .eq('id', training_video_id)
        .select()
        .single();
      
      if (error) throw error;
      videoRecord = data;
    } else {
      const { data, error } = await supabase
        .from('training_videos')
        .insert({
          status: 'processing',
          avatar_id,
          avatar_name,
          voice_id,
          voice_name,
          script_text,
          title,
          vertical,
          linked_vertical_id: linked_vertical_id || null,
          estimated_cost_usd: estimatedCost,
        })
        .select()
        .single();
      
      if (error) throw error;
      videoRecord = data;
    }

    console.log(`Training video record created/updated: ${videoRecord.id}`);

    // Standard branded background for all training videos
    const TRAINING_VIDEO_BACKGROUND_URL = 'https://mrcfpbkoulldnkqzzprb.supabase.co/storage/v1/object/public/assets/training-video-background.png';

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

    console.log('Calling HeyGen API to generate video...');

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
      console.error('HeyGen generation error:', heygenResponse.status, errorText);
      
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

    console.log(`HeyGen video generation started. Video ID: ${heygenVideoId}`);

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
        heygen_video_id: heygenVideoId,
        estimated_cost_usd: estimatedCost,
        linked_vertical_id: linked_vertical_id || null,
        message: 'Video generation started. You will be notified when complete.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating training video:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});