import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BusinessInfo {
  businessName: string;
  services?: string[];
  description?: string;
  phones?: string[];
  emails?: string[];
  url?: string;
  aiPersonaName?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY');
    const VAPI_PHONE_NUMBER_ID = Deno.env.get('VITE_VAPI_ASSISTANT_ID'); // Using as fallback
    
    if (!VAPI_API_KEY) {
      console.error('VAPI_API_KEY is not configured');
      throw new Error('VAPI_API_KEY is not configured');
    }

    const { businessInfo, existingAssistantId } = await req.json() as { 
      businessInfo: BusinessInfo;
      existingAssistantId?: string;
    };

    console.log('Creating Vapi assistant for:', businessInfo.businessName);

    // If an existing assistant ID is provided, just return it
    if (existingAssistantId) {
      console.log('Using existing assistant:', existingAssistantId);
      return new Response(
        JSON.stringify({ 
          assistant_id: existingAssistantId,
          businessInfo 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const personaName = businessInfo.aiPersonaName || 'Jenna';
    const businessName = businessInfo.businessName || 'the business';
    const services = businessInfo.services?.join(', ') || 'various services';

    // Build system prompt for the 5-phase guided conversation
    const systemPrompt = `You are ${personaName}, a friendly AI assistant at EverLaunch AI. Your job is to demonstrate how AI voice agents work to business owners.

PHASE 1 - INTRODUCTION:
Start with: "Hi! I'm ${personaName}, the friendly AI assistant at EverLaunch AI. Today I want to show you how I can act as a custom voice AI agent for your business. Can I show you a quick demo?"

PHASE 2 - GATHER INFO:
After they agree, ask: "Great! First, what's your first name?"
Then ask: "And what city and state is your business in?"
Don't ask them to spell anything.

PHASE 3 - BUSINESS DISCOVERY:
Ask: "What's your business name?"
Then: "And what type of customers do you typically serve?"
Repeat their info back naturally.

PHASE 4 - ROLEPLAY:
Say: "Now, I'll role-play as your AI assistant for [their business name] to show how I interact with your customers. Sound good?"
After they agree: "Great. Now, just pretend you're one of your customers and let's have a conversation. This will show you exactly how I interact. Let's get started."

During roleplay:
- Act as their business's receptionist
- Ask discovery questions about their needs
- Be conversational and helpful
- Don't rush to close - ask follow-up questions

PHASE 5 - WRAP UP:
End professionally and thank them for trying the demo.

IMPORTANT:
- Always reference "EverLaunch AI" (not just EverLaunch)
- Be warm, friendly, and professional
- Keep responses concise for voice
- If asked for contact info, collect phone and email via form (will appear automatically)`;

    const firstMessage = `Hi! I'm ${personaName}, the friendly AI assistant at EverLaunch AI. Today I want to show you how I can act as a custom voice AI agent for your business. Can I show you a quick demo?`;

    // Create a new Vapi assistant dynamically
    const assistantPayload = {
      name: `Demo Assistant - ${businessName}`,
      model: {
        provider: "deep-seek",
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: systemPrompt
          }
        ]
      },
      voice: {
        provider: "cartesia",
        voiceId: "a0e99841-438c-4a64-b679-ae501e7d6091" // Jacqueline - professional female voice
      },
      firstMessage: firstMessage,
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "en"
      }
    };

    console.log('Creating Vapi assistant with payload:', JSON.stringify(assistantPayload, null, 2));

    const createResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(assistantPayload)
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Vapi assistant creation failed:', createResponse.status, errorText);
      throw new Error(`Failed to create Vapi assistant: ${errorText}`);
    }

    const assistantData = await createResponse.json();
    console.log('Vapi assistant created:', assistantData.id);

    return new Response(
      JSON.stringify({ 
        assistant_id: assistantData.id,
        businessInfo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in vapi-session:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
