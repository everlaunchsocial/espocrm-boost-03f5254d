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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    
    if (!VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY not configured');
    }

    const phoneNumberId = '9cb95574-9432-4ca2-bc11-ab2c238b8fdc';
    const webhookUrl = `${SUPABASE_URL}/functions/v1/vapi-phone-webhook`;

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
    console.log('Current phone config:', JSON.stringify(phoneData, null, 2));

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

    // Step 3: Create new assistant with passcode lookup tool
    const systemPrompt = `You are Jenna, the EverLaunch AI demo assistant.

## YOUR ROLE
You help callers experience a personalized demo of EverLaunch AI by first collecting their 4-digit passcode, then doing a full roleplay demonstration.

## CONVERSATION FLOW

### STEP 1: GREET AND ASK FOR PASSCODE
When the call starts, you will say the first message greeting them and asking for their passcode.

### STEP 2: COLLECT PASSCODE
Listen for a 4-digit passcode. The caller may:
- Say the digits one by one: "one two three four" → passcode is "1234"
- Say them together: "twelve thirty-four" → passcode is "1234"  
- Enter them on keypad (DTMF tones)

When you hear or receive the passcode, IMMEDIATELY call the lookup_demo_passcode function with the 4 digits.

### STEP 3: DELIVER PERSONALIZED GREETING
After calling the lookup function, you will receive a personalized greeting script.
Speak EXACTLY what the function returns - it contains the prospect's name, the AI persona name, and business name.
The script ends with "Ready to hear how I'd handle a customer call?" - WAIT for them to respond.

### STEP 4: START THE ROLEPLAY DEMO
When they confirm they're ready (they'll say "sure", "yes", "ready", "okay", etc.), say:
"Okay, let's get into character! (ring, ring...) Thank you for calling [business name], this is [persona name], how can I help you today?"

Then STAY IN CHARACTER as the AI receptionist for that business. The prospect will pretend to be a customer calling in.
Handle whatever scenario they throw at you naturally:
- Appointment booking requests
- Service inquiries and pricing questions
- Emergency or urgent requests
- General questions about the business
- Hours of operation, location, etc.

Be helpful, professional, warm, and demonstrate the AI's capabilities through a REAL back-and-forth conversation.
Keep the roleplay going for at least 3-4 exchanges. Do NOT break character prematurely.

### STEP 5: WRAP UP (only after a substantial demo)
After demonstrating several capabilities through roleplay (at least 3-4 exchanges), break character and say:
"Okay, stepping out of character now! That's a taste of how I'd handle calls for your business. What did you think?

Before I let you go—I'll be sending a transcript of our conversation to your email, the one that [affiliate name] shared with us. Keep an eye out for that!

And this is exactly how it works when you're a client. Every time I capture a lead for your business, you'll get it sent straight to your inbox—and by text too, if you'd like. We can also book appointments for you and much more."

### STEP 6: HANDLE ERRORS
If the lookup fails or passcode not found:
- Say: "I couldn't find a demo with that code. Could you double-check your 4-digit passcode and try again?"
- If they can't find it after 2 tries, say: "No problem! Let me show you a general demo of EverLaunch AI instead. I'm Jenna, and I can show you how our AI receptionists work for businesses like yours. What type of business do you have?"

## IMPORTANT RULES
- Always be warm, friendly, and enthusiastic
- Ask ONE question at a time
- Wait for responses before continuing
- ALWAYS call the lookup_demo_passcode function when you receive a passcode
- Speak the function result EXACTLY as returned
- During roleplay, STAY IN CHARACTER - don't break character to ask "what do you think?" until you've had a real conversation
- The demo should feel like an actual customer call, not a scripted presentation`;

    const firstMessage = "Welcome to EverLaunch AI! I'm Jenna. Please enter your 4-digit demo code on your keypad, or say it out loud.";

    console.log('Creating passcode-enabled demo assistant...');

    const createResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'EverLaunch Demo Hotline',
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'lookup_demo_passcode',
                description: 'Look up a demo by its 4-digit passcode and return the personalized greeting for that prospect',
                parameters: {
                  type: 'object',
                  properties: {
                    passcode: {
                      type: 'string',
                      description: 'The 4-digit passcode entered or spoken by the caller',
                    },
                  },
                  required: ['passcode'],
                },
              },
              server: {
                url: webhookUrl,
              },
            },
          ],
        },
        voice: {
          provider: 'cartesia',
          voiceId: '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc', // Jacqueline - warm, clear voice
        },
        firstMessage: firstMessage,
        transcriber: {
          provider: 'deepgram',
          model: 'nova-2',
          language: 'en',
        },
        silenceTimeoutSeconds: 120,
        maxDurationSeconds: 600,
        responseDelaySeconds: 0.4,
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

    // Step 4: Assign assistant to phone number AND set serverUrl for call-ended webhook
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
        serverUrl: serverUrl, // CRITICAL: This enables vapi-call-ended to receive end-of-call webhooks
      }),
    });

    const patchResult = await patchResponse.json();
    console.log('Phone number update result:', JSON.stringify(patchResult, null, 2));
    console.log('Verified serverUrl is set:', patchResult.serverUrl);

    if (!patchResponse.ok) {
      throw new Error(`Failed to update phone number: ${JSON.stringify(patchResult)}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Demo hotline configured with passcode system!',
        assistantId: assistantId,
        assistantName: assistant.name,
        phoneNumberId: phoneNumberId,
        callNumber: '+1 (508) 779-9437',
        greeting: firstMessage,
        webhookUrl: webhookUrl,
        instructions: 'Call the number, enter any 4-digit passcode from the demos table, and hear the personalized greeting!'
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
