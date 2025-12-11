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
        name: `${businessName.slice(0, 26)} AI Assistant`.slice(0, 40),
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt }
          ],
        },
        voice: {
          provider: 'cartesia',
          voiceId: voiceSettings?.voice_gender === 'male' ? 'd46abd1d-2d02-43e8-819f-51fb652c1c61' : '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc', // Grant (male) / Jacqueline (female)
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
      const errorData = await phoneResponse.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Failed to purchase phone number:', JSON.stringify(errorData));
      
      // Clean up the assistant we created
      await fetch(`https://api.vapi.ai/assistant/${assistant.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeVapiKey}` },
      });
      
      // Extract suggested area codes from Vapi error
      let userMessage = 'Failed to provision phone number.';
      let suggestedCodes: string[] = [];
      
      const errorMsg = errorData.message || '';
      if (errorMsg.includes('area code is currently not available') || errorMsg.includes('not available')) {
        const hintMatch = errorMsg.match(/Hint: Try one of (.+)\.?$/);
        if (hintMatch) {
          suggestedCodes = hintMatch[1].split(',').map((c: string) => c.trim());
          userMessage = `Area code ${area_code || 'requested'} is not available.`;
        } else {
          userMessage = 'That area code is not available. Please try a different one.';
        }
      }
      
      return new Response(
        JSON.stringify({ success: false, error: userMessage, suggestedCodes }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const phoneData = await phoneResponse.json();
    console.log('Phone response data:', JSON.stringify(phoneData));
    const phoneNumberId = phoneData.id;
    
    // Fetch phone number details to get the actual number
    let phoneNumber = phoneData.number || phoneData.phoneNumber;
    if (!phoneNumber && phoneNumberId) {
      console.log('Fetching phone number details...');
      const detailsResponse = await fetch(`https://api.vapi.ai/phone-number/${phoneNumberId}`, {
        headers: { 'Authorization': `Bearer ${activeVapiKey}` },
      });
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        console.log('Phone details:', JSON.stringify(detailsData));
        phoneNumber = detailsData.number || detailsData.phoneNumber;
      }
    }
    
    console.log('Purchased phone number:', phoneNumber, 'ID:', phoneNumberId);

    // 5b. Clear any inherited server URL from account defaults
    console.log('Clearing server URL for phone number...');
    const clearUrlResponse = await fetch(`https://api.vapi.ai/phone-number/${phoneNumberId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${activeVapiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serverUrl: null,
        serverUrlSecret: null,
      }),
    });

    if (!clearUrlResponse.ok) {
      console.error('Warning: Failed to clear server URL:', await clearUrlResponse.text());
    } else {
      console.log('Cleared server URL successfully');
    }

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
