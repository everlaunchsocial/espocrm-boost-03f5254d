import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Helper function to detect image MIME type from URL
function getImageMimeType(url: string): string {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('.png')) {
    return 'image/png';
  } else if (lowerUrl.includes('.webp')) {
    return 'image/webp';
  } else if (lowerUrl.includes('.gif')) {
    return 'image/gif';
  } else if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) {
    return 'image/jpeg';
  }

  // Default to JPEG
  return 'image/jpeg';
}

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

    if (!heygenApiKey || !elevenlabsApiKey) {
      throw new Error('Missing required API keys (HEYGEN_API_KEY or ELEVENLABS_API_KEY)');
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

    // Service role client for updates
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { photo_urls, voice_audio_url } = await req.json();

    // Validate inputs
    if (!photo_urls || !Array.isArray(photo_urls) || photo_urls.length !== 5) {
      throw new Error('Exactly 5 photo URLs are required');
    }

    if (!voice_audio_url) {
      throw new Error('Voice audio URL is required');
    }

    // Get affiliate ID for user
    const { data: affiliate, error: affError } = await supabase
      .from('affiliates')
      .select('id, username')
      .eq('user_id', user.id)
      .single();

    if (affError || !affiliate) {
      throw new Error('Affiliate record not found');
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('affiliate_avatar_profiles')
      .select('id, status')
      .eq('affiliate_id', affiliate.id)
      .single();

    let profileId: string;

    if (existingProfile) {
      // Update existing profile
      profileId = existingProfile.id;
      await supabase
        .from('affiliate_avatar_profiles')
        .update({
          photo_urls,
          voice_audio_url,
          status: 'uploading',
          error_message: null,
        })
        .eq('id', profileId);
    } else {
      // Create new profile
      const { data: newProfile, error: createError } = await supabase
        .from('affiliate_avatar_profiles')
        .insert({
          affiliate_id: affiliate.id,
          photo_urls,
          voice_audio_url,
          status: 'uploading',
        })
        .select('id')
        .single();

      if (createError) {
        throw new Error(`Failed to create profile: ${createError.message}`);
      }
      profileId = newProfile.id;
    }

    console.log(`[create-avatar-profile] Starting for affiliate ${affiliate.id}, profile ${profileId}`);

    // ============================================
    // STEP 1: Upload photos to HeyGen Asset API
    // ============================================
    const uploadedAssetIds: string[] = [];
    
    for (let i = 0; i < photo_urls.length; i++) {
      const photoUrl = photo_urls[i];
      console.log(`[create-avatar-profile] Uploading photo ${i + 1}/5 to HeyGen...`);

      // Download photo from Supabase storage
      const photoResponse = await fetch(photoUrl);
      if (!photoResponse.ok) {
        throw new Error(`Failed to fetch photo ${i + 1}: ${photoResponse.statusText}`);
      }

      // Get raw binary data
      const photoArrayBuffer = await photoResponse.arrayBuffer();

      // Detect correct MIME type from URL
      const mimeType = getImageMimeType(photoUrl);

      console.log('[create-avatar-profile] Uploading photo to HeyGen:', {
        photoIndex: i + 1,
        byteLength: photoArrayBuffer.byteLength,
        mimeType,
        url: photoUrl,
      });

      // Send RAW BINARY to HeyGen with correct Content-Type
      const heygenUploadResponse = await fetch('https://upload.heygen.com/v1/asset', {
        method: 'POST',
        headers: {
          'X-Api-Key': heygenApiKey,
          'Content-Type': mimeType,
          'Accept': 'application/json',
        },
        body: photoArrayBuffer,
      });

      console.log('[create-avatar-profile] HeyGen response:', {
        status: heygenUploadResponse.status,
        statusText: heygenUploadResponse.statusText,
      });

      if (!heygenUploadResponse.ok) {
        const errorText = await heygenUploadResponse.text();
        console.error('[create-avatar-profile] HeyGen upload failed:', {
          photoIndex: i + 1,
          status: heygenUploadResponse.status,
          statusText: heygenUploadResponse.statusText,
          error: errorText,
        });
        throw new Error(`Failed to upload photo ${i + 1}: ${errorText}`);
      }

      const uploadResult = await heygenUploadResponse.json();
      console.log(`[create-avatar-profile] Photo ${i + 1} upload response:`, JSON.stringify(uploadResult));

      // HeyGen returns the asset ID in data.image_key or data.asset_id
      const assetId = uploadResult.data?.image_key || uploadResult.data?.asset_id || uploadResult.image_key || uploadResult.asset_id;
      if (!assetId) {
        console.error(`[create-avatar-profile] No asset ID in response:`, uploadResult);
        throw new Error(`No asset ID returned for photo ${i + 1}`);
      }

      uploadedAssetIds.push(assetId);
      console.log(`[create-avatar-profile] Photo ${i + 1} uploaded, asset_id: ${assetId}`);
    }

    console.log(`[create-avatar-profile] All photos uploaded. Asset IDs:`, uploadedAssetIds);

    // Update status to training
    await supabase
      .from('affiliate_avatar_profiles')
      .update({ status: 'training' })
      .eq('id', profileId);

    // ============================================
    // STEP 2: Create HeyGen Photo Avatar Group
    // ============================================
    console.log(`[create-avatar-profile] Creating HeyGen avatar group...`);
    
    // FIXED: Correct endpoint and use image_key from uploaded asset
    const avatarGroupResponse = await fetch('https://api.heygen.com/v2/photo_avatar/avatar_group/create', {
      method: 'POST',
      headers: {
        'X-Api-Key': heygenApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `${affiliate.username}_avatar`,
        image_key: uploadedAssetIds[0], // Use the first uploaded asset ID
      }),
    });

    if (!avatarGroupResponse.ok) {
      const errorText = await avatarGroupResponse.text();
      console.error(`[create-avatar-profile] HeyGen avatar creation failed:`, {
        status: avatarGroupResponse.status,
        statusText: avatarGroupResponse.statusText,
        body: errorText
      });
      
      await supabase
        .from('affiliate_avatar_profiles')
        .update({ 
          status: 'failed', 
          error_message: `HeyGen avatar creation failed: ${avatarGroupResponse.status} - ${errorText}` 
        })
        .eq('id', profileId);
      
      throw new Error(`Failed to create HeyGen avatar: ${avatarGroupResponse.status} ${avatarGroupResponse.statusText}`);
    }

    const avatarResult = await avatarGroupResponse.json();
    console.log(`[create-avatar-profile] Avatar group response:`, JSON.stringify(avatarResult));
    
    // HeyGen returns: data.id (the talking_photo_id) and data.group_id (the avatar group)
    const avatarGroupId = avatarResult.data?.group_id || avatarResult.group_id;
    const avatarId = avatarResult.data?.id || avatarResult.id;  // This IS the talking_photo_id

    // CRITICAL: Validate we got the required IDs
    if (!avatarGroupId) {
      console.error(`[create-avatar-profile] No group_id in response:`, avatarResult);
      await supabase
        .from('affiliate_avatar_profiles')
        .update({ 
          status: 'failed', 
          error_message: 'HeyGen did not return group_id' 
        })
        .eq('id', profileId);
      throw new Error('HeyGen did not return group_id');
    }

    if (!avatarId) {
      console.error(`[create-avatar-profile] No id (talking_photo_id) in response:`, avatarResult);
      await supabase
        .from('affiliate_avatar_profiles')
        .update({ 
          status: 'failed', 
          error_message: 'HeyGen did not return id (talking_photo_id)' 
        })
        .eq('id', profileId);
      throw new Error('HeyGen did not return id (talking_photo_id)');
    }

    console.log(`[create-avatar-profile] Avatar created. Group: ${avatarGroupId}, TalkingPhoto: ${avatarId}`);

    // ============================================
    // STEP 2b: Add additional looks (remaining photos)
    // ============================================
    if (uploadedAssetIds.length > 1) {
      const additionalImageKeys = uploadedAssetIds.slice(1); // All except first
      console.log(`[create-avatar-profile] Adding ${additionalImageKeys.length} additional looks to avatar group ${avatarGroupId}...`);
      
      // Correct endpoint: /v2/photo_avatar/avatar_group/add with image_keys array
      const addLooksResponse = await fetch('https://api.heygen.com/v2/photo_avatar/avatar_group/add', {
        method: 'POST',
        headers: {
          'X-Api-Key': heygenApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group_id: avatarGroupId,
          image_keys: additionalImageKeys,
        }),
      });

      if (!addLooksResponse.ok) {
        const errorText = await addLooksResponse.text();
        console.warn(`[create-avatar-profile] Failed to add additional looks:`, {
          status: addLooksResponse.status,
          statusText: addLooksResponse.statusText,
          body: errorText,
          group_id: avatarGroupId,
          image_keys: additionalImageKeys,
        });
        // Continue anyway - the avatar will work with just one look
      } else {
        const addLooksResult = await addLooksResponse.json();
        console.log(`[create-avatar-profile] Successfully added ${additionalImageKeys.length} looks:`, JSON.stringify(addLooksResult));
      }
    }

    // ============================================
    // STEP 3: Clone voice with ElevenLabs
    // ============================================
    console.log(`[create-avatar-profile] Cloning voice with ElevenLabs...`);
    
    // Download voice file from Supabase storage
    const voiceResponse = await fetch(voice_audio_url);
    if (!voiceResponse.ok) {
      throw new Error(`Failed to fetch voice file: ${voiceResponse.statusText}`);
    }

    const voiceArrayBuffer = await voiceResponse.arrayBuffer();
    const voiceFile = new File([voiceArrayBuffer], 'voice.mp3', {
      type: 'audio/mpeg',
    });

    // Clone voice with ElevenLabs
    const voiceFormData = new FormData();
    voiceFormData.append('name', `${affiliate.username}_voice`);
    voiceFormData.append('files', voiceFile);
    voiceFormData.append('description', `Voice clone for affiliate ${affiliate.username}`);

    const elevenlabsResponse = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenlabsApiKey,
      },
      body: voiceFormData,
    });

    if (!elevenlabsResponse.ok) {
      const errorText = await elevenlabsResponse.text();
      console.error(`[create-avatar-profile] ElevenLabs voice clone failed:`, {
        status: elevenlabsResponse.status,
        statusText: elevenlabsResponse.statusText,
        body: errorText
      });
      
      await supabase
        .from('affiliate_avatar_profiles')
        .update({ 
          status: 'failed', 
          error_message: `ElevenLabs voice clone failed: ${elevenlabsResponse.status} - ${errorText}` 
        })
        .eq('id', profileId);
      
      throw new Error(`Failed to clone voice: ${elevenlabsResponse.status} ${elevenlabsResponse.statusText}`);
    }

    const voiceResult = await elevenlabsResponse.json();
    const elevenlabsVoiceId = voiceResult.voice_id;

    console.log(`[create-avatar-profile] Voice cloned. ElevenLabs ID: ${elevenlabsVoiceId}`);

    // ============================================
    // STEP 4: Update profile with all IDs
    // ============================================
    await supabase
      .from('affiliate_avatar_profiles')
      .update({
        heygen_avatar_group_id: avatarGroupId,
        heygen_avatar_id: avatarId,
        elevenlabs_voice_id: elevenlabsVoiceId,
        status: 'ready',
        error_message: null,
      })
      .eq('id', profileId);

    // ============================================
    // STEP 5: Log estimated costs
    // ============================================
    // Estimated costs: HeyGen avatar creation ~$10-15, ElevenLabs voice clone ~$5-15
    await supabase
      .from('video_cost_log')
      .insert([
        {
          affiliate_id: affiliate.id,
          operation_type: 'avatar_creation',
          provider: 'heygen',
          estimated_credits: 1,
          estimated_cost_usd: 12.00,
          metadata: { profile_id: profileId, avatar_group_id: avatarGroupId },
        },
        {
          affiliate_id: affiliate.id,
          operation_type: 'voice_clone',
          provider: 'elevenlabs',
          estimated_credits: 1,
          estimated_cost_usd: 8.00,
          metadata: { profile_id: profileId, voice_id: elevenlabsVoiceId },
        },
      ]);

    console.log(`[create-avatar-profile] Profile ${profileId} ready!`);

    return new Response(JSON.stringify({
      success: true,
      profile_id: profileId,
      status: 'ready',
      heygen_avatar_id: avatarId,
      heygen_avatar_group_id: avatarGroupId,
      elevenlabs_voice_id: elevenlabsVoiceId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[create-avatar-profile] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
