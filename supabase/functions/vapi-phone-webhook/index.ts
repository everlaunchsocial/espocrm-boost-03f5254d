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
    
    // Get passcode from the tool call (new passcode-based lookup)
    const passcode = args?.passcode || '';

    console.log('Passcode from caller:', passcode);

    if (!passcode) {
      return new Response(
        JSON.stringify({
          results: [{
            toolCallId: toolCall?.id,
            result: "No passcode was provided. Say: \"I didn't catch your passcode. Could you please say or enter your 4-digit code again?\""
          }]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Simple exact match lookup by passcode - no fuzzy matching needed!
    const { data: demos, error } = await supabase
      .from('demos')
      .select('*')
      .eq('passcode', passcode)
      .limit(1);

    console.log('Passcode lookup result:', demos?.length || 0, 'demos found');

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    if (!demos || demos.length === 0) {
      console.log('No demo found for passcode:', passcode);
      return new Response(
        JSON.stringify({
          results: [{
            toolCallId: toolCall?.id,
            result: "Demo not found. Say: \"I couldn't find a demo with that passcode. Could you double-check your 4-digit code and try again?\" If they can't find it, offer to show them a general demo of EverLaunch AI instead."
          }]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const demo = demos[0];
    const personaName = demo.ai_persona_name || 'Jenna';
    console.log('Found demo:', demo.id, demo.business_name);

    // Return a simple speakable string with instructions for the AI
    const speakableResult = `Demo found for ${demo.business_name}. Say: "Perfect! I found your demo for ${demo.business_name}. Let me show you how I would work as your AI receptionist." Then say: "Hi! Thank you for calling ${demo.business_name}. How can I help you today?" Continue the conversation as their AI receptionist named ${personaName}. Ask discovery questions about their needs. Be warm, helpful, and professional. After a few exchanges, break character and ask: "So what did you think? Would you like to learn more about getting EverLaunch AI for your business?"`;

    return new Response(
      JSON.stringify({
        results: [{
          toolCallId: toolCall?.id,
          result: speakableResult
        }]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ 
        results: [{
          result: "There was an error looking up the demo. Say: \"I'm having trouble looking that up right now. Let me show you a general demo of EverLaunch AI instead.\" Then proceed with a general demo, introducing yourself as Jenna from EverLaunch AI and asking about their business."
        }]
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});