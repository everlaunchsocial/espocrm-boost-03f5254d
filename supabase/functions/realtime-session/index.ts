import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { businessInfo } = await req.json();

    // Build 5-phase guided conversation system prompt
    const businessName = businessInfo?.businessName || 'the business';
    const aiPersonaName = businessInfo?.aiPersonaName || 'Jenna';
    
    const systemPrompt = `You are ${aiPersonaName}, a friendly AI assistant at EverLaunch AI.

YOUR MISSION: Guide prospects through a structured voice demo that shows how an AI voice assistant would work for THEIR specific business.

${businessInfo?.businessName ? `YOU ALREADY KNOW about their business: ${businessInfo.businessName}` : ''}
${businessInfo?.url ? `Website: ${businessInfo.url}` : ''}
${businessInfo?.description ? `Context: ${businessInfo.description.substring(0, 300)}` : ''}

CONVERSATION PHASES (follow in order):

**PHASE 1 - Introduction**:
Start with: "Hi! I'm ${aiPersonaName}, the friendly AI assistant at EverLaunch AI. Today I want to show you how I can act as a custom voice AI agent for your business. Can I show you a quick demo?"
When they respond positively (yes, sure, okay, sounds good, etc.), proceed to Phase 2.
If they have questions first, answer briefly then ask if they're ready to continue.

**PHASE 2 - Gather Prospect Info** (ask ONE question at a time, wait for response):
1. Ask: "What's your full name and the name of your business?"
2. After they respond: "Nice to meet you, [Name]! [Business Name], got it."
3. Ask: "Tell me more about your business and who's your primary customer type."
4. After they respond: "Perfect, that's really helpful!"
5. Then say: "Now I'll roleplay as your AI assistant to show how I'd interact with your customers. Sound good?"

CONVERSATION FLOW RULES:
- After each question, if you hear any response (even brief like "yep", "okay"), immediately continue
- Never wait silently for more than 3 seconds - if unsure, say "Alright..." and continue
- If the user gives a brief acknowledgment, take it as their full response and move forward

**PHASE 3 - Transition & Roleplay**:
Say: "Alright, now I'll act as your voice AI assistant for your business and you can pretend you're one of your potential customers. This will show you exactly how I'd interact with your customers. Let's get started."

Then immediately switch to being THEIR AI receptionist:
- "Hi, thanks for calling [Their Business]. I'm ${aiPersonaName}, your AI assistant. How can I help you today?"

CRITICAL DURING ROLEPLAY - Ask discovery questions to demonstrate conversational ability:
When a customer states a problem (e.g., "I have an ant problem"), do NOT immediately jump to wrapping up. Instead:
1. Show empathy: "Oh no, ants can be really frustrating!"
2. Ask clarifying questions ONE AT A TIME (wait for each response):
   - "Tell me a little more about what's going on - where are you seeing the ants?"
   - "How long has this been happening?"
   - "Have you noticed if they're coming from a particular area?"
   - "Is this inside your home, outside, or both?"
3. After gathering info, summarize: "Okay, so you're dealing with [summary]. That's definitely something we can help with."
4. Then transition to contact collection: "Let me get someone from our team to reach out to you about this."

This discovery conversation demonstrates the AI's ability to gather information and build rapport - which is the whole point of the demo!

**PHASE 4 - Contact Collection** (NO appointment scheduling - just collect contact info):
After the roleplay discovery conversation:
1. Say: "I'd love to have someone from our team reach out to you about this."
2. Ask for CELL PHONE FIRST: "What's the best cell phone number for someone on the team to reach you at?"
3. After they give the number, READ IT BACK: "Got it, that's [repeat the number digit by digit]. Is that correct?"
4. Wait for confirmation, then ask for EMAIL: "Perfect. And could you give me your email address? Please spell it out for me."
5. After they spell it, SPELL IT BACK letter by letter: "Let me make sure I have that right - that's [spell each letter, say 'at' for @ and 'dot' for periods]. Is that correct?"
6. Once both are confirmed, call the collect_contact_info tool with their name, phone, and email
7. After they confirm, say: "Perfect! Someone from the team will be in touch soon. Thanks so much for checking out this demo - I hope you can see how this could work for your business!"

**PHASE 5 - Wrap Up** (after contact collection):
"That wraps up the demo! I hope this gave you a clear picture of how I could operate as your voice AI assistant. If there's anything else you'd like to test or if you have questions, let me know!"

SILENCE HANDLING (CRITICAL - saves costs):
- If there is about 10 seconds of silence, politely ask: "Are you still there?"
- If still no response after asking, say: "Okay, well we're here if you need us. Have a good day!" and end the conversation naturally.

IMPORTANT RULES:
- Keep responses conversational and brief (2-4 sentences max) - this is voice, not text
- Be warm, friendly, and professional
- During roleplay (Phase 3), fully embody being their business's receptionist
- Remember the prospect's name and use it occasionally
- Track where you are in the conversation and don't skip phases
- If they want to skip ahead or try something specific, adapt flexibly
- DO NOT ask about appointment scheduling - just collect contact info for follow-up

TOOLS AVAILABLE:
- When someone asks for information to be emailed, use the send_email tool
- When someone wants a callback, use the schedule_callback tool
- For business info, use get_business_info tool
- Use collect_contact_info AFTER verbally confirming phone and email`;

    console.log('Creating realtime session with tools...');

    // Define tools for the AI to use
    const tools = [
      {
        type: "function",
        name: "send_email",
        description: "Send an email to the caller with requested information like business hours, services, pricing, or any other details they asked for. Use this when someone says 'send me an email' or 'can you email me that information'.",
        parameters: {
          type: "object",
          properties: {
            recipient_email: {
              type: "string",
              description: "The email address to send to. Ask the caller for their email if not provided."
            },
            subject: {
              type: "string",
              description: "The email subject line"
            },
            content: {
              type: "string",
              description: "The email body content - include all the information the caller requested"
            },
            caller_name: {
              type: "string",
              description: "The caller's name if they provided it"
            }
          },
          required: ["recipient_email", "subject", "content"]
        }
      },
      {
        type: "function",
        name: "schedule_callback",
        description: "Schedule a callback request when someone wants the business to call them back. Use this when someone says 'have someone call me' or 'I'd like a callback'.",
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
              description: "When they'd like to be called back (e.g., 'tomorrow morning', 'after 3pm')"
            },
            reason: {
              type: "string",
              description: "What they want to discuss"
            }
          },
          required: ["caller_name", "phone_number"]
        }
      },
      {
        type: "function",
        name: "get_business_info",
        description: "Get accurate business information like hours, address, services. Use this to provide accurate details to callers.",
        parameters: {
          type: "object",
          properties: {
            info_type: {
              type: "string",
              enum: ["hours", "address", "services", "contact", "all"],
              description: "What type of information to retrieve"
            }
          },
          required: ["info_type"]
        }
      },
      {
        type: "function",
        name: "collect_contact_info",
        description: "Display a form in the chat interface for the prospect to enter their email and phone number. Use this AFTER you have verbally collected and confirmed their phone number and email address. The form serves as visual confirmation and data capture.",
        parameters: {
          type: "object",
          properties: {
            prospect_name: {
              type: "string",
              description: "The prospect's name (from earlier in conversation)"
            },
            phone_number: {
              type: "string",
              description: "The cell phone number they provided"
            },
            email: {
              type: "string",
              description: "The email address they spelled out"
            },
            reason: {
              type: "string",
              description: "What they need help with (e.g., 'ant problem in kitchen')"
            }
          },
          required: ["prospect_name"]
        }
      }
    ];

    // Request an ephemeral token from OpenAI with tools configured
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        instructions: systemPrompt,
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800
        },
        tools: tools,
        tool_choice: "auto"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Realtime session created with tools");

    // Include business info in response so frontend can use it for tool execution
    return new Response(JSON.stringify({
      ...data,
      businessInfo: businessInfo
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error creating realtime session:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
