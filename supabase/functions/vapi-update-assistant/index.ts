import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { customer_id, voice_id, greeting_text, voice_style } = await req.json();

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

    // Get the API key to use (from vapi_accounts or fallback to env)
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

    // Build update payload
    const updatePayload: any = {};

    // Update voice if voice_id provided (use exact Cartesia voice ID)
    if (voice_id) {
      updatePayload.voice = {
        provider: 'cartesia',
        voiceId: voice_id,
      };
      console.log('Setting voice to Cartesia voiceId:', voice_id);
    }

    // Update greeting if provided
    if (greeting_text) {
      updatePayload.firstMessage = greeting_text;
    }

    if (Object.keys(updatePayload).length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No updates to apply' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Updating Vapi assistant:', phoneRecord.vapi_assistant_id, updatePayload);

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
