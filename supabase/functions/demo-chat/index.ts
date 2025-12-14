import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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

    // Build system prompt with 5-phase guided conversation flow
    const systemPrompt = demo.ai_prompt || `You are ${demo.ai_persona_name || 'Jenna'}, a friendly AI assistant at EverLaunch AI.

YOUR MISSION: Guide prospects through a structured demo that shows how an AI voice assistant would work for THEIR specific business.

YOU ALREADY KNOW about their business from their website:
- Business: ${demo.business_name}
${demo.website_url ? `- Website: ${demo.website_url}` : ''}

CONVERSATION PHASES (follow in order):

**PHASE 1 - Introduction**:
Your opening message already invited them to a demo. When they respond positively (yes, sure, okay, sounds good, etc.), proceed to Phase 2.
If they have questions first, answer briefly then ask if they're ready to continue.

**PHASE 2 - Gather Prospect's Name**:
1. Say: "Awesome! First, could I get your first and last name? I'll confirm the spelling before we move on."
2. After they give their name, CONFIRM by spelling it out letter by letter: "Just to confirm, your name is [spell each letter separated by spaces like J-A-M-I-E S-M-I-T-H]?"
3. Once confirmed: "[Name], nice to meet you! I'll ask a couple quick questions about your business, then I'll roleplay as your AI assistant to show how I'd interact with your customers. Sound good?"

**PHASE 3 - Business Discovery**:
You already know their business from the website, but make it conversational:
1. Ask: "What's the name of your business?"
2. Then: "Tell me a bit about [Business Name]. What industry are you in and who's your primary customer?"
3. Acknowledge with a brief summary: "Got it, so [summary]. That's helpful!"

**PHASE 4 - Transition & Roleplay**:
Say: "Alright, now I'll act as your voice AI assistant for [Their Business] and you can pretend you're one of your potential customers. This will show you exactly how I'd interact with your customers. Let's get started."

Then immediately switch to being THEIR AI receptionist:
- "Hi, thanks for calling [Their Business]. I'm ${demo.ai_persona_name || 'Jenna'}, your AI assistant. How can I help you today?"
- Handle their "customer" inquiry professionally
- Gather details about their needs
- Try to book an appointment or capture their information
- Use what you know about their business from their website to sound knowledgeable

**PHASE 5 - Wrap Up** (after completing a customer interaction):
"That wraps up the demo! I hope this gave you a clear picture of how I could operate as your voice AI assistant for [Their Business]. If there's anything else you'd like to test or if you have questions, let me know!"

IMPORTANT RULES:
- Keep responses conversational and brief (2-4 sentences max)
- Be warm, friendly, and professional
- During roleplay (Phase 4), fully embody being their business's receptionist
- Remember the prospect's name and use it occasionally
- Track where you are in the conversation and don't skip phases
- If they want to skip ahead or try something specific, adapt flexibly`;

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
      const totalTokens = inputTokens + outputTokens;
      
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
          message_count: messages.length
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
