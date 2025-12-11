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
    const { customer_phone_id, vapi_phone_id } = await req.json();
    
    if (!vapi_phone_id) {
      throw new Error('vapi_phone_id is required');
    }

    console.log('Syncing phone number for vapi_phone_id:', vapi_phone_id);

    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY not configured');
    }

    // Fetch phone number details from Vapi
    const vapiResponse = await fetch(`https://api.vapi.ai/phone-number/${vapi_phone_id}`, {
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
      },
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      console.error('Vapi API error:', errorText);
      throw new Error(`Vapi API error: ${vapiResponse.status}`);
    }

    const phoneData = await vapiResponse.json();
    console.log('Vapi phone data:', JSON.stringify(phoneData, null, 2));

    // Extract the real phone number
    const realPhoneNumber = phoneData.number || phoneData.phoneNumber || phoneData.twilioPhoneNumber;
    
    if (!realPhoneNumber || !realPhoneNumber.match(/^\+?\d{10,15}$/)) {
      console.error('No valid phone number found in Vapi response:', phoneData);
      throw new Error('Could not extract valid phone number from Vapi');
    }

    console.log('Found real phone number:', realPhoneNumber);

    // Update the database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('customer_phone_numbers')
      .update({ 
        phone_number: realPhoneNumber,
        updated_at: new Date().toISOString()
      })
      .eq('vapi_phone_id', vapi_phone_id)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      throw new Error(`Database update failed: ${error.message}`);
    }

    console.log('Database updated successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        phone_number: realPhoneNumber,
        updated_record: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
