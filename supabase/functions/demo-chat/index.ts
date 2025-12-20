import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  generateCompletePrompt,
  resolveVerticalId,
  buildActionPolicy,
  generateEnforcementPromptSection
} from "../_shared/verticalPromptGenerator.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Helper to fetch prompt from prompt_templates
async function fetchPromptFromLibrary(supabase: any, category: string, useCase: string): Promise<string | null> {
  try {
    // First try category-specific prompt
    let { data, error } = await supabase
      .from('prompt_templates')
      .select('prompt_content')
      .eq('category', category)
      .eq('use_case', useCase)
      .eq('is_active', true)
      .in('channel', ['chat', 'universal'])
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (data?.prompt_content) {
      console.log(`Found prompt for category: ${category}, use_case: ${useCase}`);
      return data.prompt_content;
    }

    // Fallback to universal prompt
    const { data: universalData } = await supabase
      .from('prompt_templates')
      .select('prompt_content')
      .eq('category', 'universal')
      .eq('use_case', useCase)
      .eq('is_active', true)
      .in('channel', ['chat', 'universal'])
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (universalData?.prompt_content) {
      console.log(`Using universal prompt for use_case: ${useCase}`);
      return universalData.prompt_content;
    }

    return null;
  } catch (error) {
    console.error('Error fetching prompt from library:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { demoId, messages } = await req.json();

    if (!demoId) {
      return new Response(
        JSON.stringify({ error: 'demoId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the demo to get business context and affiliate_id
    const { data: demo, error: demoError } = await supabase
      .from('demos')
      .select('business_name, website_url, ai_prompt, ai_persona_name, affiliate_id')
      .eq('id', demoId)
      .single();

    if (demoError || !demo) {
      console.error('Error fetching demo:', demoError);
      return new Response(
        JSON.stringify({ error: 'Demo not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build system prompt using vertical generator with web_chat channel
    let systemPrompt = demo.ai_prompt;
    
    // For demos, use generic local business vertical (0) with neutral enforcement
    const verticalId = resolveVerticalId(null); // Returns 0 (generic)
    const actionPolicy = buildActionPolicy(verticalId, 'web_chat');
    const enforcementSection = generateEnforcementPromptSection(actionPolicy);
    
    if (!systemPrompt) {
      // Try fetching from prompt_templates first
      const libraryPrompt = await fetchPromptFromLibrary(supabase, 'universal', 'system_prompt');
      
      if (libraryPrompt) {
        // Replace variables in the prompt
        systemPrompt = libraryPrompt
          .replace(/\{\{business_name\}\}/g, demo.business_name || 'the business')
          .replace(/\{\{website_url\}\}/g, demo.website_url || '')
          .replace(/\{\{ai_persona_name\}\}/g, demo.ai_persona_name || 'Jenna');
      }
    }
    
    // Use vertical-aware prompt as fallback (for demos, use a generic local business approach)
    if (!systemPrompt) {
      // Generate a demo-specific prompt that incorporates vertical behavior
      const verticalPrompt = generateCompletePrompt({
        channel: 'web_chat',
        businessName: demo.business_name || 'the business',
        verticalId,
        aiName: demo.ai_persona_name || 'Jenna',
        websiteUrl: demo.website_url || undefined,
      });
      
      // Wrap with demo-specific instructions and enforcement
      systemPrompt = `${verticalPrompt}

${enforcementSection}

## DEMO MODE INSTRUCTIONS
You are demonstrating EverLaunch AI to a business owner. Guide them through:

1. **Introduction**: Greet them and explain you'll show how AI would work for their business
2. **Gather Info**: Ask for their name (confirm spelling) and business details
3. **Roleplay**: Act as their AI receptionist while they pretend to be a customer
4. **Wrap Up**: Thank them and explain EverLaunch benefits

Keep responses conversational and brief (2-4 sentences max). Be warm and professional.`;
    } else {
      // Append enforcement to existing prompt
      systemPrompt = `${systemPrompt}\n\n${enforcementSection}`;
    }
    
    console.log(`Demo chat using vertical ${verticalId} with enforcement applied`);

    // Get API key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare messages for API call - limit to last 10 messages to keep payload small
    const recentMessages = messages.slice(-10).map((msg: ChatMessage) => ({
      role: msg.role,
      content: msg.content
    }));

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...recentMessages
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service temporarily unavailable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to generate response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'I apologize, I was unable to generate a response.';

    console.log(`Demo chat response for ${demo.business_name}:`, reply.substring(0, 100));

    // Log usage to service_usage table (fire and forget - don't block response)
    if (demo.affiliate_id) {
      const inputTokens = data.usage?.prompt_tokens || 0;
      const outputTokens = data.usage?.completion_tokens || 0;
      
      // Estimate cost: Gemini Flash is ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens
      const estimatedCost = (inputTokens * 0.000000075) + (outputTokens * 0.0000003);

      supabase.from('service_usage').insert({
        affiliate_id: demo.affiliate_id,
        demo_id: demoId,
        usage_type: 'demo_chat',
        provider: 'lovable_ai',
        model: 'google/gemini-2.5-flash',
        tokens_in: inputTokens,
        tokens_out: outputTokens,
        cost_usd: estimatedCost,
        metadata: {
          business_name: demo.business_name,
          message_count: messages.length,
          used_vertical_prompt: true
        }
      }).then(({ error }) => {
        if (error) {
          console.error('Error logging demo chat usage:', error);
        } else {
          console.log('Demo chat usage logged for demo:', demoId);
        }
      });
    }

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in demo-chat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
