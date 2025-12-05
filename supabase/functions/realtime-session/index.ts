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

    // Build dynamic system prompt based on business info
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

    console.log('Creating realtime session with prompt:', systemPrompt.substring(0, 200) + '...');

    // Request an ephemeral token from OpenAI
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
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Realtime session created successfully");

    return new Response(JSON.stringify(data), {
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
