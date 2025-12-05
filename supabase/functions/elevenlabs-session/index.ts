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
      console.log('Getting signed URL for existing agent:', agentId);
      
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
      systemPrompt += `About the business: ${businessInfo.description.substring(0, 500)}. `;
    }

    if (businessInfo?.phone) {
      systemPrompt += `The business phone number is ${businessInfo.phone}. `;
    }

    if (businessInfo?.address) {
      systemPrompt += `The business is located at ${businessInfo.address}. `;
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

    const firstMessage = businessInfo?.businessName 
      ? `Hello! Thanks for calling ${businessInfo.businessName}. How can I help you today?`
      : "Hello! How can I help you today?";

    console.log('Creating ElevenLabs agent dynamically...');
    console.log('Business name:', businessInfo?.businessName);

    // Step 1: Create agent via API
    const createAgentResponse = await fetch(
      "https://api.elevenlabs.io/v1/convai/agents/create",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `Demo - ${businessInfo?.businessName || 'Generic'} - ${Date.now()}`,
          conversation_config: {
            tts: {
              voice_id: "EXAVITQu4vr4xnSDxMaL", // Sarah - professional female voice
            },
            agent: {
              prompt: {
                prompt: systemPrompt,
              },
              first_message: firstMessage,
              language: "en",
            },
          },
        }),
      }
    );

    if (!createAgentResponse.ok) {
      const errorText = await createAgentResponse.text();
      console.error('Failed to create agent:', createAgentResponse.status, errorText);
      throw new Error(`Failed to create ElevenLabs agent: ${createAgentResponse.status} - ${errorText}`);
    }

    const agentData = await createAgentResponse.json();
    console.log('Agent created successfully:', agentData.agent_id);

    // Step 2: Get signed URL for the newly created agent
    const signedUrlResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentData.agent_id}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!signedUrlResponse.ok) {
      const errorText = await signedUrlResponse.text();
      console.error('Failed to get signed URL:', signedUrlResponse.status, errorText);
      throw new Error(`Failed to get signed URL: ${signedUrlResponse.status}`);
    }

    const signedUrlData = await signedUrlResponse.json();
    console.log('Got signed URL for new agent');

    return new Response(JSON.stringify({ 
      signed_url: signedUrlData.signed_url,
      agent_id: agentData.agent_id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in elevenlabs-session:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
