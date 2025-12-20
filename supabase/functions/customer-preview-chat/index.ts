import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  fetchCustomerSettings, 
  generatePromptFromSettings,
  generateCompletePrompt,
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt, businessName, customerId } = await req.json();

    console.log('Customer preview chat request:', { businessName, customerId, messageCount: messages?.length });

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build system prompt using vertical prompt generator
    let finalSystemPrompt = systemPrompt;
    let actionPolicy = null;
    
    if (!finalSystemPrompt && customerId) {
      // Fetch customer settings and generate vertical-aware prompt
      const settings = await fetchCustomerSettings(supabase, customerId);
      
      if (settings) {
        finalSystemPrompt = generatePromptFromSettings(settings, 'web_chat');
        
        // Build action policy for enforcement
        const verticalId = resolveVerticalId(settings.businessType);
        actionPolicy = buildActionPolicy(verticalId, 'web_chat', {
          appointmentBooking: settings.appointmentsEnabled ? 'ON' : 'OFF',
          leadCapture: settings.leadCaptureEnabled ? 'ON' : 'OFF',
          afterHoursHandling: settings.afterHoursBehavior === 'voicemail' ? 'OFF' : 'ON',
          emergencyEscalation: settings.afterHoursBehavior === 'voicemail' ? 'OFF' : 'ON',
          transferToHuman: settings.transferNumber ? 'ON' : 'OFF',
        });
        
        // Log config resolution for debugging (critical for toggle verification)
        logConfigResolution('customer-preview-chat', settings, actionPolicy);
        
        // Append enforcement section to prompt
        const enforcementSection = generateEnforcementPromptSection(actionPolicy);
        finalSystemPrompt = `${finalSystemPrompt}\n\n${enforcementSection}`;
        
        console.log(`[customer-preview-chat] Prompt generated successfully (config version: ${computeConfigVersion(settings)})`);
      }
    }
    
    // Fallback if still no prompt
    if (!finalSystemPrompt) {
      // Use generic prompt with vertical awareness if we have business name
      const verticalId = resolveVerticalId(null);
      actionPolicy = buildActionPolicy(verticalId, 'web_chat');
      
      finalSystemPrompt = generateCompletePrompt({
        channel: 'web_chat',
        businessName: businessName || 'a business',
        verticalId,
        aiName: 'Ashley',
      });
      
      // Append enforcement for generic fallback
      const enforcementSection = generateEnforcementPromptSection(actionPolicy);
      finalSystemPrompt = `${finalSystemPrompt}\n\n${enforcementSection}`;
      
      console.log('Using fallback generic prompt with enforcement');
    }

    // Prepare messages for the API
    const apiMessages = [
      { role: 'system', content: finalSystemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    console.log('Calling Lovable AI Gateway...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: apiMessages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to get AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    console.log('AI response received successfully');

    // Log usage to service_usage table if customerId is provided (fire and forget)
    if (customerId) {
      const inputTokens = data.usage?.prompt_tokens || 0;
      const outputTokens = data.usage?.completion_tokens || 0;
      
      // Estimate cost: Gemini Flash is ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens
      const estimatedCost = (inputTokens * 0.000000075) + (outputTokens * 0.0000003);

      supabase.from('service_usage').insert({
        customer_id: customerId,
        usage_type: 'customer_chat',
        call_type: 'preview',
        provider: 'lovable_ai',
        model: 'google/gemini-2.5-flash',
        tokens_in: inputTokens,
        tokens_out: outputTokens,
        message_count: 1,
        cost_usd: estimatedCost,
        metadata: {
          business_name: businessName,
          message_count: messages.length,
          is_preview: true,
          used_vertical_prompt: true
        }
      }).then(({ error }) => {
        if (error) {
          console.error('Error logging customer preview chat usage:', error);
        } else {
          console.log('Customer preview chat usage logged successfully');
        }
      });
    }

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Customer preview chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});