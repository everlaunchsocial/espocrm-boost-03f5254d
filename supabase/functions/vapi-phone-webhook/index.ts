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

    // Extract call ID for metadata injection
    const callId = body.message?.call?.id || body.call?.id;
    console.log('Call ID:', callId);

    // Extract caller ID from Vapi payload
    const callerPhone = body.message?.call?.customer?.number || 
                        body.call?.customer?.number || 
                        body.customer?.number ||
                        'unknown';
    console.log('Caller phone (caller ID):', callerPhone);

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

    // Lookup demo by passcode and join with lead and affiliate to get prospect's first name and affiliate username
    const { data: demos, error } = await supabase
      .from('demos')
      .select('*, leads(first_name, email), affiliates:affiliate_id(username)')
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
    // Get prospect's first name and email from the joined lead record
    const prospectName = demo.leads?.first_name || 'there';
    const prospectEmail = demo.leads?.email || null;
    // Get affiliate username from the joined affiliate record
    const affiliateName = demo.affiliates?.username || 'your rep';
    console.log('Found demo:', demo.id, demo.business_name, 'Prospect:', prospectName, 'Affiliate:', affiliateName);

    // CRITICAL: Inject demo_id into VAPI call metadata so vapi-call-ended can send transcript emails
    if (callId) {
      const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
      if (VAPI_API_KEY) {
        try {
          console.log('Injecting demo_id into call metadata for call:', callId);
          const patchResponse = await fetch(`https://api.vapi.ai/call/${callId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${VAPI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              metadata: {
                demo_id: demo.id,
                affiliate_id: demo.affiliate_id,
                call_type: 'demo',
                prospect_email: prospectEmail,
                prospect_name: prospectName,
              }
            }),
          });
          const patchResult = await patchResponse.json();
          console.log('Call metadata update result:', JSON.stringify(patchResult, null, 2));
          if (!patchResponse.ok) {
            console.error('Failed to update call metadata:', patchResult);
          } else {
            console.log('Successfully injected demo_id into call metadata');
          }
        } catch (patchError) {
          console.error('Error patching call metadata:', patchError);
          // Don't fail the whole request, just log the error
        }
      } else {
        console.warn('VAPI_API_KEY not available for metadata injection');
      }
    } else {
      console.warn('No call ID available for metadata injection');
    }

    // Store affiliate name and prospect email in the response for the system prompt to reference
    // Demo script: Address prospect by name, explain it's a demo, ask if they want to hear it
    const speakableResult = `Hi, you must be ${prospectName}! I'm ${personaName}. Welcome to your personalized EverLaunch demo! I'm going to show you exactly what your AI receptionist would sound like when customers call ${demo.business_name}. Ready to hear how I'd handle a customer call? [CONTEXT: affiliate_name=${affiliateName}, prospect_email=${prospectEmail || 'not provided'}]`;

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