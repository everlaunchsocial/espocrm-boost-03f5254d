import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Build industry-aware system prompt from vertical template
function buildSystemPrompt(
  businessName: string,
  websiteUrl: string | null,
  verticalTemplate: any | null,
  voiceInstructions: string | null
): string {
  let prompt = '';
  
  if (verticalTemplate) {
    prompt = verticalTemplate.prompt_template.replace('{business_name}', businessName);
    
    const vocab = verticalTemplate.vocabulary_preferences || {};
    if (vocab.use?.length) {
      prompt += `\n\nPreferred terminology: ${vocab.use.join(', ')}.`;
    }
    if (vocab.avoid?.length) {
      prompt += ` Avoid using: ${vocab.avoid.join(', ')}.`;
    }
    
    const doList = verticalTemplate.do_list || [];
    if (doList.length) {
      prompt += '\n\nGuidelines - Always do:\n' + doList.map((item: string) => `• ${item}`).join('\n');
    }
    
    const dontList = verticalTemplate.dont_list || [];
    if (dontList.length) {
      prompt += '\n\nGuidelines - Never do:\n' + dontList.map((item: string) => `• ${item}`).join('\n');
    }
    
    const goals = verticalTemplate.typical_goals || [];
    if (goals.length) {
      prompt += `\n\nYour primary goals are to: ${goals.join(', ')}.`;
    }
  } else {
    prompt = `You are a friendly and professional AI phone assistant for ${businessName}. 
Your job is to answer calls, help customers with their questions, and provide excellent service.
Always be helpful, courteous, and concise. If you don't know something, offer to take a message or transfer to a human.`;
  }
  
  if (websiteUrl) {
    prompt += `\n\nThe business website is ${websiteUrl}.`;
  }
  
  if (voiceInstructions) {
    prompt += `\n\nAdditional instructions: ${voiceInstructions}`;
  }
  
  return prompt;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customer_id, voice_id, voice_speed, greeting_text, regenerate_prompt } = await req.json();

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

    // Update greeting if provided
    if (greeting_text) {
      updatePayload.firstMessage = greeting_text;
    }

    // Regenerate system prompt with vertical template if requested
    if (regenerate_prompt) {
      console.log('Regenerating system prompt with vertical template...');
      
      // Fetch customer profile
      const { data: customerProfile } = await supabase
        .from('customer_profiles')
        .select('business_name, website_url, business_type')
        .eq('id', customer_id)
        .single();
      
      if (customerProfile) {
        // Fetch vertical template
        let verticalTemplate = null;
        if (customerProfile.business_type) {
          const { data: template } = await supabase
            .from('vertical_templates')
            .select('*')
            .eq('vertical_key', customerProfile.business_type)
            .eq('is_active', true)
            .maybeSingle();
          verticalTemplate = template;
        }
        
        // Fetch voice instructions
        const { data: voiceSettings } = await supabase
          .from('voice_settings')
          .select('instructions')
          .eq('customer_id', customer_id)
          .maybeSingle();
        
        const systemPrompt = buildSystemPrompt(
          customerProfile.business_name || 'the business',
          customerProfile.website_url,
          verticalTemplate,
          voiceSettings?.instructions || null
        );
        
        updatePayload.model = {
          provider: 'deep-seek',
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt }
          ],
        };
        
        console.log('Regenerated system prompt with vertical:', customerProfile.business_type || 'none');
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
