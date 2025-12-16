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
    const heygenApiKey = Deno.env.get('HEYGEN_API_KEY');
    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');

    if (!heygenApiKey) {
      throw new Error('Missing HEYGEN_API_KEY');
    }
    if (!elevenlabsApiKey) {
      throw new Error('Missing ELEVENLABS_API_KEY');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create authenticated client
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Service role client for operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { profile_id, template_id, video_name } = await req.json();

    if (!profile_id || !template_id || !video_name) {
      throw new Error('Missing required fields: profile_id, template_id, video_name');
    }

    // Get affiliate ID
    const { data: affiliate, error: affError } = await supabase
      .from('affiliates')
      .select('id, username')
      .eq('user_id', user.id)
      .single();

    if (affError || !affiliate) {
      throw new Error('Affiliate record not found');
    }

    // Get profile and verify it belongs to affiliate and is ready
    const { data: profile, error: profileError } = await supabase
      .from('affiliate_avatar_profiles')
      .select('*')
      .eq('id', profile_id)
      .eq('affiliate_id', affiliate.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Avatar profile not found');
    }

    if (profile.status !== 'ready') {
      throw new Error('Avatar profile is not ready. Please wait for training to complete.');
    }

    if (!profile.elevenlabs_voice_id) {
      throw new Error('Avatar profile has no ElevenLabs voice ID');
    }

    if (!profile.heygen_avatar_id) {
      throw new Error('Avatar profile has no HeyGen avatar ID');
    }

    // ============================================
    // CHECK MAX_VIDEOS_PER_AFFILIATE LIMIT
    // ============================================
    const { data: settings } = await supabase
      .from('video_system_settings')
      .select('setting_value')
      .eq('setting_key', 'max_videos_per_affiliate')
      .single();

    const maxVideos = parseInt(settings?.setting_value || '5', 10);

    const { count: existingVideoCount } = await supabase
      .from('affiliate_videos')
      .select('*', { count: 'exact', head: true })
      .eq('affiliate_id', affiliate.id);

    if ((existingVideoCount || 0) >= maxVideos) {
      throw new Error('Video limit reached. Contact admin for more.');
    }

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('video_script_templates')
      .select('*')
      .eq('id', template_id)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      throw new Error('Template not found or inactive');
    }

    // Generate unique slug
    const baseSlug = `${affiliate.username}-${template.video_type}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    let slug = baseSlug;
    let slugSuffix = 1;
    
    while (true) {
      const { data: existingSlug } = await supabase
        .from('affiliate_videos')
        .select('id')
        .eq('landing_page_slug', slug)
        .single();
      
      if (!existingSlug) break;
      slug = `${baseSlug}-${slugSuffix}`;
      slugSuffix++;
    }

    // Create video record with status 'generating'
    const { data: videoRecord, error: insertError } = await supabase
      .from('affiliate_videos')
      .insert({
        affiliate_id: affiliate.id,
        profile_id: profile_id,
        video_name,
        video_type: template.video_type,
        script_template_id: template_id,
        status: 'generating',
        landing_page_slug: slug,
        is_active: true,
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error(`Failed to create video record: ${insertError.message}`);
    }

    console.log(`[generate-affiliate-video] Creating video ${videoRecord.id} for affiliate ${affiliate.id}`);

    // ============================================
    // STEP 1: GENERATE AUDIO VIA ELEVENLABS TTS
    // ============================================
    console.log(`[generate-affiliate-video] Generating audio with ElevenLabs voice: ${profile.elevenlabs_voice_id}`);
    
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${profile.elevenlabs_voice_id}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenlabsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: template.script_text,
          model_id: 'eleven_multilingual_v2',
          output_format: 'mp3_44100_128',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error(`[generate-affiliate-video] ElevenLabs TTS failed: ${errorText}`);
      
      await supabase
        .from('affiliate_videos')
        .update({
          status: 'failed',
          error_message: `ElevenLabs audio generation failed: ${ttsResponse.statusText}`,
        })
        .eq('id', videoRecord.id);
      
      throw new Error(`ElevenLabs audio generation failed: ${ttsResponse.statusText}`);
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    console.log(`[generate-affiliate-video] Audio generated, size: ${audioBuffer.byteLength} bytes`);

    // ============================================
    // STEP 2: UPLOAD AUDIO TO SUPABASE STORAGE
    // ============================================
    const audioFileName = `${videoRecord.id}.mp3`;
    const audioPath = `video-audio/${affiliate.id}/${audioFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('affiliate-voices')
      .upload(audioPath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error(`[generate-affiliate-video] Failed to upload audio: ${uploadError.message}`);
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    // Get public URL for the audio
    const { data: audioUrlData } = supabase.storage
      .from('affiliate-voices')
      .getPublicUrl(audioPath);

    const audioUrl = audioUrlData.publicUrl;
    console.log(`[generate-affiliate-video] Audio uploaded to: ${audioUrl}`);

    // ============================================
    // STEP 3: CALL HEYGEN VIDEO GENERATE API
    // ============================================
    const videoBackgroundUrl = Deno.env.get('VIDEO_BACKGROUND_URL') || 'https://mrcfpbkoulldnkqzzprb.supabase.co/storage/v1/object/public/assets/video-background.png';
    
    console.log(`[generate-affiliate-video] Using background: ${videoBackgroundUrl}`);
    console.log(`[generate-affiliate-video] Using avatar_id: ${profile.heygen_avatar_id}`);
    
    // Use audio type instead of elevenlabs type
    const heygenPayload = {
      video_inputs: [
        {
          character: {
            type: 'talking_photo',
            talking_photo_id: profile.heygen_avatar_id,
          },
          voice: {
            type: 'audio',
            audio_url: audioUrl,
          },
          background: {
            type: 'image',
            url: videoBackgroundUrl,
          },
        },
      ],
      dimension: {
        width: 1280,
        height: 720,
      },
      callback_url: `${supabaseUrl}/functions/v1/heygen-webhook`,
    };
    
    console.log(`[generate-affiliate-video] HeyGen payload:`, JSON.stringify(heygenPayload, null, 2));

    const heygenResponse = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': heygenApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(heygenPayload),
    });

    if (!heygenResponse.ok) {
      const errorText = await heygenResponse.text();
      console.error(`[generate-affiliate-video] HeyGen video generation failed: ${errorText}`);
      
      await supabase
        .from('affiliate_videos')
        .update({
          status: 'failed',
          error_message: `HeyGen video generation failed: ${heygenResponse.statusText}`,
        })
        .eq('id', videoRecord.id);
      
      throw new Error(`HeyGen video generation failed: ${heygenResponse.statusText}`);
    }

    const heygenResult = await heygenResponse.json();
    const heygenVideoId = heygenResult.data?.video_id || heygenResult.video_id;

    console.log(`[generate-affiliate-video] HeyGen video ID: ${heygenVideoId}`);

    // Update record with HeyGen video ID
    await supabase
      .from('affiliate_videos')
      .update({
        heygen_video_id: heygenVideoId,
      })
      .eq('id', videoRecord.id);

    // Log estimated cost (~$2-5 per video)
    await supabase
      .from('video_cost_log')
      .insert({
        affiliate_id: affiliate.id,
        operation_type: 'video_generation',
        provider: 'heygen',
        estimated_credits: 1,
        estimated_cost_usd: 3.50,
        metadata: {
          video_id: videoRecord.id,
          heygen_video_id: heygenVideoId,
          template_id,
          video_type: template.video_type,
        },
      });

    return new Response(JSON.stringify({
      success: true,
      video_id: videoRecord.id,
      heygen_video_id: heygenVideoId,
      landing_page_slug: slug,
      status: 'generating',
      message: 'Video generation started. This typically takes 5-10 minutes.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[generate-affiliate-video] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
