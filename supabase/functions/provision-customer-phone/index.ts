import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== provision-customer-phone function called ===');
  console.log('Request method:', req.method);

  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const vapiApiKeyFromEnv = Deno.env.get('VAPI_API_KEY');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasVapiKey: !!vapiApiKeyFromEnv,
    });

    if (!supabaseUrl) {
      console.error('SUPABASE_URL is not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error: SUPABASE_URL missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body:', JSON.stringify(requestBody));
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { customerId, areaCode } = requestBody;

    if (!customerId) {
      console.error('customerId is missing from request');
      return new Response(
        JSON.stringify({ success: false, error: 'customerId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Provisioning phone for customer: ${customerId}, area code: ${areaCode || 'any'}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingPhone } = await supabase
      .from('customer_phone_numbers')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (existingPhone) {
      console.log('Customer already has phone number:', existingPhone.phone_number);
      return new Response(
        JSON.stringify({ 
          success: true, 
          phoneNumber: existingPhone.phone_number,
          message: 'Phone number already provisioned'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: customerProfile, error: profileError } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('id', customerId)
      .single();

    if (profileError || !customerProfile) {
      throw new Error(`Customer not found: ${profileError?.message || 'No profile'}`);
    }

    const { data: voiceSettings } = await supabase
      .from('voice_settings')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    const { data: chatSettings } = await supabase
      .from('chat_settings')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    let vapiApiKey = vapiApiKeyFromEnv;
    let vapiAccount: { id: string; name: string; numbers_provisioned: number; max_numbers: number } | null = null;

    if (vapiApiKey) {
      const { data: primaryAccount } = await supabase
        .from('vapi_accounts')
        .select('*')
        .eq('name', 'Primary Vapi Account')
        .maybeSingle();

      if (primaryAccount) {
        vapiAccount = primaryAccount;
        console.log(`Using Primary Vapi Account from secrets (${primaryAccount.numbers_provisioned}/${primaryAccount.max_numbers})`);
      } else {
        const { data: newAccount, error: createError } = await supabase
          .from('vapi_accounts')
          .insert({
            name: 'Primary Vapi Account',
            api_key: 'STORED_IN_SECRETS',
            max_numbers: 10,
            is_active: true,
          })
          .select()
          .single();

        if (createError) {
          console.error('Failed to create tracking account:', createError);
          throw new Error('Failed to initialize phone provisioning system');
        }
        vapiAccount = newAccount;
        console.log('Created Primary Vapi Account tracking record');
      }
    } else {
      const { data: account, error: accountError } = await supabase
        .from('vapi_accounts')
        .select('*')
        .eq('is_active', true)
        .neq('api_key', 'STORED_IN_SECRETS')
        .lt('numbers_provisioned', 10)
        .order('numbers_provisioned', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (accountError || !account) {
        console.error('No available Vapi account:', accountError);
        throw new Error('No available phone number capacity. Please contact support.');
      }

      vapiAccount = account;
      vapiApiKey = account.api_key;
      console.log(`Using Vapi account: ${account.name} (${account.numbers_provisioned}/${account.max_numbers})`);
    }

    if (!vapiApiKey || !vapiAccount) {
      throw new Error('Vapi API key not configured. Please contact support.');
    }

    const businessName = customerProfile.business_name || 'our company';
    const greeting = voiceSettings?.greeting_text || chatSettings?.greeting_text || 
      `Hello! Thank you for calling ${businessName}. How can I help you today?`;
    
    const tone = chatSettings?.tone || 'professional';
    const voiceGender = voiceSettings?.voice_gender || 'female';
    const voiceStyle = voiceSettings?.voice_style || 'friendly';

    const systemPrompt = `You are ${businessName}'s AI phone assistant. Your tone is ${tone} and ${voiceStyle}.

Your greeting: "${greeting}"

Guidelines:
- Be helpful, concise, and professional
- If asked about services, describe what ${businessName} offers based on available information
- For appointments or urgent matters, offer to collect contact information
- If you don't know something, say you'll have a team member follow up

Business: ${businessName}
${customerProfile.website_url ? `Website: ${customerProfile.website_url}` : ''}
${customerProfile.business_type ? `Industry: ${customerProfile.business_type}` : ''}`;

    console.log('Creating Vapi assistant...');
    const assistantResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `${businessName} AI Assistant`,
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          systemPrompt: systemPrompt,
        },
        voice: {
          provider: 'openai',
          voiceId: voiceGender === 'male' ? 'alloy' : 'nova',
        },
        firstMessage: greeting,
        endCallMessage: 'Thank you for calling! Have a great day!',
        recordingEnabled: true,
        silenceTimeoutSeconds: 30,
        maxDurationSeconds: 600,
      }),
    });

    if (!assistantResponse.ok) {
      const errorText = await assistantResponse.text();
      console.error('Vapi assistant creation failed:', errorText);
      throw new Error(`Failed to create AI assistant: ${errorText}`);
    }

    const assistant = await assistantResponse.json();
    console.log('Created assistant:', assistant.id);

    console.log('Purchasing phone number...');
    const phoneBody: Record<string, unknown> = {
      provider: 'vapi',
      assistantId: assistant.id,
    };

    if (areaCode && areaCode.length === 3) {
      phoneBody.numberDesiredAreaCode = areaCode;
    }

    const phoneResponse = await fetch('https://api.vapi.ai/phone-number', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(phoneBody),
    });

    if (!phoneResponse.ok) {
      const errorText = await phoneResponse.text();
      console.error('Phone purchase failed:', errorText);
      
      await fetch(`https://api.vapi.ai/assistant/${assistant.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${vapiApiKey}` },
      });
      
      throw new Error(`Failed to purchase phone number: ${errorText}`);
    }

    const phoneData = await phoneResponse.json();
    console.log('Purchased phone number:', phoneData.number);

    const { error: insertError } = await supabase
      .from('customer_phone_numbers')
      .insert({
        customer_id: customerId,
        vapi_account_id: vapiAccount.id,
        phone_number: phoneData.number,
        vapi_phone_id: phoneData.id,
        vapi_assistant_id: assistant.id,
        area_code: areaCode || phoneData.number?.substring(2, 5) || null,
        status: 'active',
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to save phone number: ${insertError.message}`);
    }

    const { error: updateError } = await supabase
      .from('vapi_accounts')
      .update({ 
        numbers_provisioned: vapiAccount.numbers_provisioned + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', vapiAccount.id);

    if (updateError) {
      console.error('Failed to update vapi_account count:', updateError);
    }

    console.log(`Successfully provisioned ${phoneData.number} for customer ${customerId}`);

    return new Response(
      JSON.stringify({
        success: true,
        phoneNumber: phoneData.number,
        assistantId: assistant.id,
        message: 'Phone number provisioned successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Provisioning error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
