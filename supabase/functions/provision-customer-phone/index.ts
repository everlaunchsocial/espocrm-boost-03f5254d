import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customer_id, area_code } = await req.json();

    if (!customer_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'customer_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Provisioning phone for customer ${customer_id}, area_code: ${area_code || 'any'}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapiApiKey = Deno.env.get('VAPI_API_KEY');

    if (!vapiApiKey) {
      console.error('VAPI_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Phone provisioning not configured. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Find available Vapi account
    const { data: vapiAccount, error: vapiAccountError } = await supabase
      .from('vapi_accounts')
      .select('*')
      .eq('is_active', true)
      .order('numbers_provisioned', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (vapiAccountError) {
      console.error('Error finding Vapi account:', vapiAccountError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to find available phone capacity' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the account's API key if found and valid, otherwise use the default VAPI_API_KEY
    // Skip placeholder keys or keys that don't look like valid Vapi keys
    const dbApiKey = vapiAccount?.api_key;
    const isValidDbKey = dbApiKey && dbApiKey.length > 20 && !dbApiKey.includes('STORED') && !dbApiKey.includes('PLACEHOLDER');
    const activeVapiKey = isValidDbKey ? dbApiKey : vapiApiKey;
    const vapiAccountId = isValidDbKey ? vapiAccount?.id : null;
    
    console.log(`Using ${isValidDbKey ? 'database' : 'environment'} API key for Vapi`);

    // 2. Fetch customer profile for business info
    const { data: customerProfile, error: profileError } = await supabase
      .from('customer_profiles')
      .select('id, business_name, website_url, contact_name')
      .eq('id', customer_id)
      .single();

    if (profileError || !customerProfile) {
      console.error('Customer profile not found:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Customer profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Fetch voice settings for personalization
    const { data: voiceSettings } = await supabase
      .from('voice_settings')
      .select('greeting_text, voice_gender, voice_style')
      .eq('customer_id', customer_id)
      .maybeSingle();

    const businessName = customerProfile.business_name || 'the business';
    const greeting = voiceSettings?.greeting_text || `Thank you for calling ${businessName}. How can I help you today?`;

    // 4. Create Vapi assistant
    const systemPrompt = `You are a friendly and professional AI phone assistant for ${businessName}. 
Your job is to answer calls, help customers with their questions, and provide excellent service.
${customerProfile.website_url ? `The business website is ${customerProfile.website_url}.` : ''}
Always be helpful, courteous, and concise. If you don't know something, offer to take a message or transfer to a human.`;

    console.log('Creating Vapi assistant...');
    const assistantResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${activeVapiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `${businessName} AI Assistant`,
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt }
          ],
        },
        voice: {
          provider: 'openai',
          voiceId: voiceSettings?.voice_gender === 'female' ? 'nova' : 'echo',
        },
        firstMessage: greeting,
      }),
    });

    if (!assistantResponse.ok) {
      const errorText = await assistantResponse.text();
      console.error('Failed to create Vapi assistant:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create AI assistant' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const assistant = await assistantResponse.json();
    console.log('Created assistant:', assistant.id);

    // 5. Purchase phone number via Vapi
    console.log('Purchasing phone number...');
    const phonePayload: any = {
      provider: 'vapi',
      assistantId: assistant.id,
    };

    // Add area code if provided
    if (area_code && /^\d{3}$/.test(area_code)) {
      phonePayload.numberDesiredAreaCode = area_code;
    }

    const phoneResponse = await fetch('https://api.vapi.ai/phone-number', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${activeVapiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(phonePayload),
    });

    if (!phoneResponse.ok) {
      const errorText = await phoneResponse.text();
      console.error('Failed to purchase phone number:', errorText);
      // Clean up the assistant we created
      await fetch(`https://api.vapi.ai/assistant/${assistant.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeVapiKey}` },
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to provision phone number. The requested area code may not be available.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const phoneData = await phoneResponse.json();
    const phoneNumber = phoneData.number;
    console.log('Purchased phone number:', phoneNumber);

    // 6. Save to customer_phone_numbers table
    const { error: insertError } = await supabase
      .from('customer_phone_numbers')
      .insert({
        customer_id,
        phone_number: phoneNumber,
        vapi_account_id: vapiAccountId || '00000000-0000-0000-0000-000000000000', // Fallback UUID
        vapi_assistant_id: assistant.id,
        vapi_phone_id: phoneData.id,
        area_code: area_code || null,
        status: 'active',
      });

    if (insertError) {
      console.error('Failed to save phone number record:', insertError);
      // Number was purchased but we couldn't save it - still return success
      // but log for manual cleanup
    }

    // 7. Increment numbers_provisioned on the Vapi account
    if (vapiAccountId) {
      await supabase
        .from('vapi_accounts')
        .update({ numbers_provisioned: (vapiAccount?.numbers_provisioned || 0) + 1 })
        .eq('id', vapiAccountId);
    }

    console.log('Phone provisioning complete:', phoneNumber);

    return new Response(
      JSON.stringify({ success: true, phoneNumber }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in provision-customer-phone:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
