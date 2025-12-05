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
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    const { businessInfo, agentId } = await req.json();

    // If user provides their own agent ID, get signed URL for that agent
    if (agentId) {
      console.log('Getting signed URL for agent:', agentId);
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
        {
          method: "GET",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', response.status, errorText);
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Got signed URL for existing agent");

      return new Response(JSON.stringify({ signed_url: data.signed_url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build dynamic prompt based on business info
    let systemPrompt = "You are a friendly, professional AI receptionist. ";
    
    if (businessInfo?.businessName) {
      systemPrompt += `You work for ${businessInfo.businessName}. `;
    }

    if (businessInfo?.services && businessInfo.services.length > 0) {
      systemPrompt += `The business specializes in ${businessInfo.services.join(', ')}. `;
    }

    if (businessInfo?.description) {
      systemPrompt += `About the business: ${businessInfo.description.substring(0, 200)}. `;
    }

    systemPrompt += `
Your job is to:
- Greet callers warmly and professionally
- Answer questions about the business and services
- Help schedule appointments or take messages
- Provide basic information like hours and location when asked
- Be helpful, friendly, and conversational
- Keep responses concise and natural for voice conversation

If you don't know specific details, politely say you'd be happy to have someone call them back with that information.
`;

    console.log('Creating ElevenLabs conversation with dynamic agent...');

    // Create a conversation with overrides (no pre-created agent needed)
    // Using the Conversational AI endpoint with custom settings
    const response = await fetch(
      "https://api.elevenlabs.io/v1/convai/conversation",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_config: {
            agent: {
              prompt: {
                prompt: systemPrompt,
              },
              first_message: businessInfo?.businessName 
                ? `Hello! Thanks for calling ${businessInfo.businessName}. How can I help you today?`
                : "Hello! How can I help you today?",
              language: "en",
            },
            tts: {
              voice_id: "EXAVITQu4vr4xnSDxMaL", // Sarah - professional female voice
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      
      // Fallback: If conversation endpoint fails, return error with instructions
      // User may need to create an agent in ElevenLabs dashboard
      throw new Error(`ElevenLabs API error: ${response.status}. You may need to create an agent in the ElevenLabs dashboard and provide the agent ID.`);
    }

    const data = await response.json();
    console.log("ElevenLabs conversation created:", data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error creating ElevenLabs session:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
