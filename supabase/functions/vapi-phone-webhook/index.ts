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
    const body = await req.json();
    console.log('Vapi webhook received:', JSON.stringify(body, null, 2));

    // Vapi sends tool calls in this format
    const toolCall = body.message?.toolCalls?.[0] || body.toolCall;
    const toolName = toolCall?.function?.name || toolCall?.name;
    const toolArgs = toolCall?.function?.arguments || toolCall?.arguments;

    // Parse arguments if string
    const args = typeof toolArgs === 'string' ? JSON.parse(toolArgs) : toolArgs;
    const businessName = args?.business_name || args?.businessName || '';

    console.log('Looking up demo for business:', businessName);

    if (!businessName) {
      return new Response(
        JSON.stringify({
          results: [{
            toolCallId: toolCall?.id,
            result: JSON.stringify({
              found: false,
              message: "I didn't catch your business name. Could you please say it again?",
              systemPrompt: null
            })
          }]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Search for demo by business name (case-insensitive partial match)
    const { data: demos, error } = await supabase
      .from('demos')
      .select('*')
      .ilike('business_name', `%${businessName}%`)
      .limit(1);

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    if (!demos || demos.length === 0) {
      console.log('No demo found for:', businessName);
      return new Response(
        JSON.stringify({
          results: [{
            toolCallId: toolCall?.id,
            result: JSON.stringify({
              found: false,
              message: `I couldn't find a demo for ${businessName}. Let me show you a general EverLaunch AI demo instead.`,
              systemPrompt: getGenericDemoPrompt()
            })
          }]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const demo = demos[0];
    console.log('Found demo:', demo.id, demo.business_name);

    // Build the personalized system prompt
    const systemPrompt = demo.ai_prompt || buildDemoPrompt(demo);

    return new Response(
      JSON.stringify({
        results: [{
          toolCallId: toolCall?.id,
          result: JSON.stringify({
            found: true,
            businessName: demo.business_name,
            personaName: demo.ai_persona_name || 'Jenna',
            message: `Great! I found your demo for ${demo.business_name}. Let me connect you now.`,
            systemPrompt: systemPrompt
          })
        }]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        results: [{
          result: JSON.stringify({
            found: false,
            message: "I'm having trouble looking that up. Let me show you a general demo.",
            systemPrompt: getGenericDemoPrompt()
          })
        }]
      }),
      { 
        status: 200, // Return 200 to Vapi even on errors so it can continue
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function buildDemoPrompt(demo: any): string {
  const personaName = demo.ai_persona_name || 'Jenna';
  const businessName = demo.business_name;
  
  return `You are ${personaName}, a friendly AI assistant demonstrating EverLaunch AI's voice technology for ${businessName}.

MISSION: Show the caller how you would act as ${businessName}'s AI receptionist, handling customer calls professionally.

CONVERSATION FLOW:
1. INTRODUCTION: "Hi! I'm ${personaName}, the friendly AI assistant at EverLaunch AI. I'm here to show you how I can work as a custom voice AI agent for ${businessName}. Ready for a quick demo?"

2. GATHER INFO: Ask for their first and last name, and the city and state where their business is located. Then ask about their business and typical customers.

3. ROLEPLAY: "Now I'll role-play as your AI assistant for ${businessName} to show how I interact with your customers. Sound good?"
   - After they agree: "Great! Just pretend you're one of your customers calling in. Let's have a conversation."
   - Act as ${businessName}'s receptionist - answer questions, ask discovery questions, demonstrate helpfulness

4. WRAP UP: After the roleplay, ask "What did you think? Would you like to learn more about getting EverLaunch AI for your business?"

STYLE: Warm, professional, conversational. Ask discovery questions during roleplay to demonstrate conversational ability.`;
}

function getGenericDemoPrompt(): string {
  return `You are Jenna, a friendly AI assistant demonstrating EverLaunch AI's voice technology.

MISSION: Show the caller how EverLaunch AI can work for their business.

CONVERSATION FLOW:
1. INTRODUCTION: "Hi! I'm Jenna from EverLaunch AI. I'd love to show you how our voice AI can help your business. What's your name and what kind of business do you have?"

2. GATHER INFO: Learn about their business, services, and typical customers.

3. ROLEPLAY: "Now I'll role-play as your AI assistant to show how I'd interact with your customers. Just pretend you're one of your customers calling in!"

4. WRAP UP: "What did you think? Would you like to learn more about getting EverLaunch AI for your business?"

STYLE: Warm, professional, conversational.`;
}
