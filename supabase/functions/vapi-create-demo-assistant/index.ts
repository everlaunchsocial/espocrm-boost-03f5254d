import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY not configured');
    }

    const phoneNumberId = '9cb95574-9432-4ca2-bc11-ab2c238b8fdc';

    // Step 1: Get current phone number config to find existing assistant
    console.log('Fetching current phone number config...');
    const phoneResponse = await fetch(`https://api.vapi.ai/phone-number/${phoneNumberId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
      },
    });
    const phoneData = await phoneResponse.json();
    const existingAssistantId = phoneData.assistantId;
    console.log('Existing assistant ID:', existingAssistantId);

    // Step 2: Delete existing assistant if one exists
    if (existingAssistantId) {
      console.log('Deleting existing assistant:', existingAssistantId);
      await fetch(`https://api.vapi.ai/assistant/${existingAssistantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
        },
      });
      console.log('Deleted old assistant');
    }

    // Hardcoded ReEnvision Medspa demo for Leslie
    const businessName = "ReEnvision Medspa";
    const personaName = "Jenna";
    const callerName = "Leslie";

    const systemPrompt = `You are ${personaName}, the EverLaunch AI Voice Concierge for ${businessName}, a professional, luxury aesthetic clinic. You are demonstrating EverLaunch AI's voice technology to ${callerName}.

## YOUR MISSION
Show ${callerName} how an AI receptionist would handle calls for their med spa. Sound warm, professional, and consultative — a blend of luxury hotel concierge and licensed clinical front desk.

## GREETING
When the call starts, greet the caller warmly: "Hello! You must be ${callerName} from ${businessName}. How are you, ${callerName}?"

Wait for their response, then continue: "I'm so glad you called! I'm ${personaName}, and I'm here to show you how I can handle your front desk calls, book consultations, and make sure you never miss a high-value client. Ready for a quick demo?"

## CONVERSATION FLOW

### PHASE 1: SET THE STAGE
After they confirm, say: "Perfect! Let me show you exactly how I'd handle an incoming call from one of your potential clients. Go ahead and pretend you're a customer calling about a treatment - maybe someone asking about Botox, fillers, or skin rejuvenation. I'll show you how I'd handle it."

### PHASE 2: ROLEPLAY AS THEIR RECEPTIONIST
When they roleplay as a customer:
- Greet them warmly and professionally
- Ask the qualifying question: "Are you calling about a consultation or treatment information?"
- Capture their name, phone, and email naturally in conversation
- Ask about their aesthetic goals
- Provide pricing as ranges only (never exact quotes): "Our Botox treatments vary by area and units needed - typical investments range from $300-$800 depending on your goals. The best way to get an exact recommendation is through a complimentary consultation."
- Offer to book a complimentary consultation
- Mention 2-3 available times

If they mention any medical concerns or adverse reactions:
- Immediately pause and say: "Thank you for sharing that. This sounds like something our licensed medical professionals should address right away. Let me have one of our medical staff call you back within the next few minutes. What's the best number to reach you?"

### PHASE 3: WRAP UP
After the roleplay (2-3 minutes), transition out:
"And that's exactly how I'd handle calls for ${businessName}! I can answer 24/7, book consultations, capture leads, and make sure you never lose a client to a competitor who answers first. Pretty impressive, right?

Here's what I do for med spas like yours:
- Answer every call instantly, even at 3 AM
- Book complimentary consultations automatically
- Handle Botox, filler, and laser treatment questions
- Escalate any medical concerns to your licensed staff immediately
- Capture how callers found you for marketing tracking

${callerName}, the EverLaunch team will follow up with you about getting me set up for ${businessName}. Thank you so much for taking the time to see this demo!"

## VOCABULARY TO USE
client, consultation, treatment, procedure, licensed medical professional, complimentary consultation, customized treatment plan, aesthetic goals, natural-looking results, investment, rejuvenation, enhancement

## VOCABULARY TO AVOID
cheap, affordable, quick fix, miracle, anti-aging, guaranteed results, pain, safe (use FDA-approved instead)

## IMPORTANT GUIDELINES
- Be warm, friendly, and conversational - not robotic
- Ask ONE question at a time
- Never provide medical advice
- Never quote exact prices - only ranges
- Always offer the complimentary consultation as the conversion driver
- Keep the demo under 5 minutes
- Remember: this is a demo for ${callerName}, so periodically reference how this would work for their business`;

    const firstMessage = `Hello! You must be ${callerName} from ${businessName}. How are you, ${callerName}?`;

    console.log('Creating fresh Vapi assistant for ReEnvision Medspa demo...');

    // Step 3: Create fresh assistant with proper settings
    const createResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Demo - ReEnvision - Leslie`,
        model: {
          provider: 'deep-seek',
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
          ],
        },
        voice: {
          provider: 'cartesia',
          voiceId: '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc', // Jacqueline - warm, louder voice
        },
        firstMessage: firstMessage,
        transcriber: {
          provider: 'deepgram',
          model: 'nova-2',
          language: 'en',
        },
        silenceTimeoutSeconds: 120,
        maxDurationSeconds: 600,
        responseDelaySeconds: 0.5,
        backgroundSound: 'off',
      }),
    });

    const assistant = await createResponse.json();
    console.log('Created assistant:', JSON.stringify(assistant, null, 2));

    if (!createResponse.ok) {
      throw new Error(`Failed to create assistant: ${JSON.stringify(assistant)}`);
    }

    const assistantId = assistant.id;
    console.log(`Assistant created with ID: ${assistantId}`);

    // Step 2: Assign assistant to phone number with serverUrl for call-ended webhook
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const serverUrl = `${SUPABASE_URL}/functions/v1/vapi-call-ended`;
    console.log(`Assigning assistant ${assistantId} to phone number ${phoneNumberId} with serverUrl ${serverUrl}...`);

    const patchResponse = await fetch(`https://api.vapi.ai/phone-number/${phoneNumberId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: assistantId,
        serverUrl: serverUrl, // CRITICAL: Keep serverUrl for transcript emails - DO NOT set to null!
      }),
    });

    const patchResult = await patchResponse.json();
    console.log('Phone number update result:', JSON.stringify(patchResult, null, 2));

    if (!patchResponse.ok) {
      throw new Error(`Failed to update phone number: ${JSON.stringify(patchResult)}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Demo assistant created for ${callerName} and assigned to phone number!`,
        assistantId: assistantId,
        assistantName: assistant.name,
        phoneNumberId: phoneNumberId,
        callNumber: '+1 (508) 779-9437',
        greeting: firstMessage,
        instructions: `Call the number now - Jenna will greet ${callerName} by name immediately.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
