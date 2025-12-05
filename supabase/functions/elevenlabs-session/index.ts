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

IMPORTANT - You have tools available to help callers:
- When someone asks for information to be sent via email, use the send_email tool. Ask for their email address first.
- When someone wants a callback, use the schedule_callback tool. Get their phone number and preferred time.
- For accurate business info like hours or address, use get_business_info tool.

If you don't know specific details, politely say you'd be happy to have someone call them back with that information.
`;

    const firstMessage = businessInfo?.businessName 
      ? `Hello! Thanks for calling ${businessInfo.businessName}. How can I help you today?`
      : "Hello! How can I help you today?";

    console.log('Creating ElevenLabs agent dynamically...');
    console.log('Business name:', businessInfo?.businessName);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const toolHandlerUrl = `${SUPABASE_URL}/functions/v1/voice-tool-handler`;

    // Step 1: Create agent via API with tools
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
            tools: [
              {
                type: "webhook",
                name: "send_email",
                description: "Send an email to the caller with requested information like business hours, services, pricing, or any other details they asked for. Always ask for the caller's email address before using this tool.",
                webhook: {
                  url: toolHandlerUrl,
                  request_headers: {
                    "Content-Type": "application/json"
                  },
                  request_body: {
                    tool_name: "send_email",
                    businessInfo: businessInfo || {}
                  }
                },
                parameters: {
                  type: "object",
                  properties: {
                    recipient_email: {
                      type: "string",
                      description: "The email address to send to. Must ask the caller for their email."
                    },
                    subject: {
                      type: "string",
                      description: "The email subject line"
                    },
                    content: {
                      type: "string",
                      description: "The email body content with the information the caller requested"
                    },
                    caller_name: {
                      type: "string",
                      description: "The caller's name if provided"
                    }
                  },
                  required: ["recipient_email", "content"]
                }
              },
              {
                type: "webhook",
                name: "schedule_callback",
                description: "Schedule a callback request when someone wants the business to call them back. Get their phone number and optionally their preferred time and reason for the call.",
                webhook: {
                  url: toolHandlerUrl,
                  request_headers: {
                    "Content-Type": "application/json"
                  },
                  request_body: {
                    tool_name: "schedule_callback",
                    businessInfo: businessInfo || {}
                  }
                },
                parameters: {
                  type: "object",
                  properties: {
                    caller_name: {
                      type: "string",
                      description: "The caller's name"
                    },
                    phone_number: {
                      type: "string",
                      description: "The phone number to call back"
                    },
                    preferred_time: {
                      type: "string",
                      description: "When they'd like to be called back"
                    },
                    reason: {
                      type: "string",
                      description: "What they want to discuss"
                    }
                  },
                  required: ["phone_number"]
                }
              },
              {
                type: "webhook",
                name: "get_business_info",
                description: "Get accurate business information like hours, address, services, or contact details.",
                webhook: {
                  url: toolHandlerUrl,
                  request_headers: {
                    "Content-Type": "application/json"
                  },
                  request_body: {
                    tool_name: "get_business_info",
                    businessInfo: businessInfo || {}
                  }
                },
                parameters: {
                  type: "object",
                  properties: {
                    info_type: {
                      type: "string",
                      description: "What type of information to retrieve: hours, address, services, contact, or all",
                      enum: ["hours", "address", "services", "contact", "all"]
                    }
                  },
                  required: ["info_type"]
                }
              }
            ]
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
