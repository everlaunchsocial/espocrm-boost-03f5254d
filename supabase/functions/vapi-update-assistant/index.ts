import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  fetchCustomerSettings, 
  generatePromptFromSettings,
  resolveVerticalId,
  buildActionPolicy,
  generateEnforcementPromptSection,
  logConfigResolution,
  computeConfigVersion
} from "../_shared/verticalPromptGenerator.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customer_id, voice_id, voice_speed, greeting_text, ai_name, regenerate_prompt } = await req.json();

    if (!customer_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'customer_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Updating Vapi assistant for customer ${customer_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapiApiKey = Deno.env.get('VAPI_API_KEY');

    if (!vapiApiKey) {
      console.error('VAPI_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Voice service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find customer's Vapi assistant ID
    const { data: phoneRecord, error: phoneError } = await supabase
      .from('customer_phone_numbers')
      .select('vapi_assistant_id, vapi_account_id')
      .eq('customer_id', customer_id)
      .maybeSingle();

    if (phoneError) {
      console.error('Error fetching phone record:', phoneError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to find customer phone record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!phoneRecord?.vapi_assistant_id) {
      console.log('No Vapi assistant found for customer - skipping sync');
      return new Response(
        JSON.stringify({ success: true, message: 'No assistant to update' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the API key to use
    let activeVapiKey = vapiApiKey;
    if (phoneRecord.vapi_account_id) {
      const { data: vapiAccount } = await supabase
        .from('vapi_accounts')
        .select('api_key')
        .eq('id', phoneRecord.vapi_account_id)
        .maybeSingle();
      
      if (vapiAccount?.api_key && vapiAccount.api_key.length > 20 && !vapiAccount.api_key.includes('STORED')) {
        activeVapiKey = vapiAccount.api_key;
      }
    }

    // Map numeric speed to Cartesia string values
    const mapSpeedToCartesia = (speed: number): string => {
      if (speed <= 0.6) return 'slowest';
      if (speed <= 0.85) return 'slow';
      if (speed <= 1.15) return 'normal';
      if (speed <= 1.5) return 'fast';
      return 'fastest';
    };

    // Build update payload
    const updatePayload: any = {};

    // Update voice if voice_id provided
    if (voice_id) {
      updatePayload.voice = {
        provider: 'cartesia',
        voiceId: voice_id,
      };
      
      if (voice_speed !== undefined && voice_speed !== null) {
        const cartesiaSpeed = mapSpeedToCartesia(voice_speed);
        updatePayload.voice.experimentalControls = {
          speed: cartesiaSpeed
        };
        console.log('Setting voice speed:', voice_speed, '-> Cartesia:', cartesiaSpeed);
      }
      
      console.log('Setting voice to Cartesia voiceId:', voice_id);
    }

    // Update greeting if provided (include AI name in greeting)
    if (greeting_text || ai_name) {
      let effectiveAiName = ai_name;
      if (!effectiveAiName) {
        const { data: voiceSettings } = await supabase
          .from('voice_settings')
          .select('ai_name')
          .eq('customer_id', customer_id)
          .maybeSingle();
        effectiveAiName = voiceSettings?.ai_name || 'Ashley';
      }
      
      if (greeting_text) {
        updatePayload.firstMessage = greeting_text;
      } else {
        const { data: profile } = await supabase
          .from('customer_profiles')
          .select('business_name')
          .eq('id', customer_id)
          .maybeSingle();
        const businessName = profile?.business_name || 'our business';
        updatePayload.firstMessage = `Hello, thank you for calling ${businessName}. My name is ${effectiveAiName}, how can I help you today?`;
      }
    }

    // Regenerate system prompt using vertical prompt generator with enforcement
    if (regenerate_prompt) {
      console.log('[vapi-update-assistant] Regenerating system prompt with vertical prompt generator + enforcement...');
      
      // Fetch customer settings using the shared utility
      const settings = await fetchCustomerSettings(supabase, customer_id);
      
      if (settings) {
        // Generate vertical-aware phone prompt
        let systemPrompt = generatePromptFromSettings(settings, 'phone');
        
        // Build action policy and add enforcement section
        const verticalId = resolveVerticalId(settings.businessType);
        const actionPolicy = buildActionPolicy(verticalId, 'phone', {
          appointmentBooking: settings.appointmentsEnabled ? 'ON' : 'OFF',
          leadCapture: settings.leadCaptureEnabled ? 'ON' : 'OFF',
          afterHoursHandling: settings.afterHoursBehavior === 'voicemail' ? 'OFF' : 'ON',
          emergencyEscalation: settings.afterHoursBehavior === 'voicemail' ? 'OFF' : 'ON',
          transferToHuman: settings.transferNumber ? 'ON' : 'OFF',
        });
        
        // Log config resolution for debugging (critical for toggle verification)
        logConfigResolution('vapi-update-assistant', settings, actionPolicy);
        
        const enforcementSection = generateEnforcementPromptSection(actionPolicy);
        systemPrompt = `${systemPrompt}\n\n${enforcementSection}`;
        
        updatePayload.model = {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt }
          ],
        };
        
        console.log(`[vapi-update-assistant] Phone prompt generated (config version: ${computeConfigVersion(settings)}, enforcement: ${actionPolicy.requiresComplianceGuardrails ? 'compliance' : 'standard'})`);
      } else {
        console.log('[vapi-update-assistant] Could not fetch customer settings, skipping prompt regeneration');
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No updates to apply' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Updating Vapi assistant:', phoneRecord.vapi_assistant_id);

    // PATCH the Vapi assistant
    const updateResponse = await fetch(`https://api.vapi.ai/assistant/${phoneRecord.vapi_assistant_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${activeVapiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Failed to update Vapi assistant:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update voice assistant' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully updated Vapi assistant');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in vapi-update-assistant:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});