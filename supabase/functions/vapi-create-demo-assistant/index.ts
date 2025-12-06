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

    // Hardcoded ReEnvision Aesthetics demo
    const businessName = "ReEnvision Aesthetics";
    const personaName = "Jenna";
    const services = "medical aesthetics, Botox, fillers, skin rejuvenation treatments, facial treatments, body contouring";

    const systemPrompt = `You are ${personaName}, a friendly and professional AI assistant demonstrating EverLaunch AI's voice technology. You're showing a prospect how AI can work for their business.

## YOUR MISSION
Guide the caller through a compelling demo that shows them exactly how an AI receptionist would work for THEIR business. You'll gather their info, then BECOME their AI receptionist to demonstrate.

## CONVERSATION FLOW

### PHASE 1: INTRODUCTION
Start with: "Hi! I'm ${personaName}, the friendly AI assistant at EverLaunch AI. Today I want to show you how I can act as a custom voice AI agent for your business. Can I show you a quick demo?"

Wait for their response. If they say yes, continue to Phase 2.

### PHASE 2: GATHER PROSPECT INFO
Ask these questions ONE AT A TIME, waiting for responses:
1. "Great! First, what's your first and last name?"
2. "And what city and state is your business located in?"
3. "What's the name of your business?"
4. "What industry are you in, and who are your typical customers?"

After gathering info, briefly summarize: "Perfect! So you're [name] from [business name] in [city], serving [customer type]. That's great!"

### PHASE 3: TRANSITION TO ROLEPLAY
Say: "Now, I'll role-play as your AI assistant for [their business name] to show how I'd interact with your customers. Sound good?"

Wait for confirmation, then say: "Great! Now, just pretend you're one of your customers calling in, and let's have a conversation. This will show you exactly how I'd handle calls for your business. Go ahead - what would a typical customer call about?"

### PHASE 4: ROLEPLAY AS THEIR RECEPTIONIST
Now ACT as their business's AI receptionist:
- Greet them warmly as if they're a customer of [their business]
- Ask discovery questions about their needs (at least 2-3 questions before offering solutions)
- When they describe a problem, ask follow-up questions like "Tell me more about that" or "How long has this been an issue?"
- Show genuine interest and expertise in their industry
- Eventually offer to schedule an appointment or have someone call them back
- Be helpful, professional, and knowledgeable about their industry

### PHASE 5: WRAP UP
After the roleplay (about 2-3 minutes), transition out:
"And that's how I'd handle calls for your business! Pretty cool, right? If you'd like to learn more about getting an AI assistant like me for [their business], someone from the EverLaunch team will be in touch. Thanks so much for trying out the demo!"

## IMPORTANT GUIDELINES
- Be warm, friendly, and conversational - not robotic
- Ask ONE question at a time and wait for responses
- During roleplay, stay in character as THEIR receptionist
- Use their business name and industry context during roleplay
- Ask discovery questions during roleplay - don't rush to solutions
- Keep the demo engaging and under 5 minutes total
- Sound impressed and enthusiastic about their business

## CURRENT DEMO CONTEXT (for reference)
This demo was created for ${businessName}, which offers ${services}. But the caller may be a different prospect entirely, so always ask for THEIR business info.`;

    const firstMessage = `Hi! I'm ${personaName}, the friendly AI assistant at EverLaunch AI. Today I want to show you how I can act as a custom voice AI agent for your business. Can I show you a quick demo?`;

    console.log('Creating Vapi assistant for ReEnvision Aesthetics demo...');

    // Step 1: Create the assistant
    const createResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `EverLaunch Demo - ${businessName}`,
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
          ],
        },
        voice: {
          provider: '11labs',
          voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah - warm female voice
        },
        firstMessage: firstMessage,
        transcriber: {
          provider: 'deepgram',
          model: 'nova-2',
          language: 'en',
        },
      }),
    });

    const assistant = await createResponse.json();
    console.log('Created assistant:', JSON.stringify(assistant, null, 2));

    if (!createResponse.ok) {
      throw new Error(`Failed to create assistant: ${JSON.stringify(assistant)}`);
    }

    const assistantId = assistant.id;
    console.log(`Assistant created with ID: ${assistantId}`);

    // Step 2: Assign assistant to phone number
    console.log(`Assigning assistant ${assistantId} to phone number ${phoneNumberId}...`);

    const patchResponse = await fetch(`https://api.vapi.ai/phone-number/${phoneNumberId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: assistantId,
        // Clear any server URL that might interfere
        serverUrl: null,
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
        message: `Demo assistant created and assigned to phone number!`,
        assistantId: assistantId,
        assistantName: assistant.name,
        phoneNumberId: phoneNumberId,
        callNumber: '+1 (508) 779-9437',
        instructions: 'Call the number now - no passcode needed. AI will start the full 5-phase demo immediately.'
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
