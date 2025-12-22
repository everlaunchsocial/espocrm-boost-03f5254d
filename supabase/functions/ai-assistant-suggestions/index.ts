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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { recentContext, pageContext, timeContext, userRole } = await req.json();

    console.log('Generating suggestions:', { recentContext: recentContext?.slice(0, 100), pageContext, timeContext, userRole });

    const systemPrompt = `You are a suggestion generator for an AI productivity assistant. Based on the conversation context and user situation, generate 3-4 relevant follow-up questions the user might want to ask.

Rules:
- Questions should be natural and conversational
- Each question should be actionable
- Consider the time of day: ${timeContext}
- Consider the user's role: ${userRole}
${pageContext ? `- The user is viewing: ${pageContext}` : ''}

Categories to use:
- calendar: scheduling, appointments, meetings
- email: sending messages, follow-ups, outreach  
- stats: analytics, performance, metrics
- leads: contacts, prospects, follow-ups
- general: help, how-to, other

Return a JSON array with objects containing: text (the question), icon (emoji), category (one of above)`;

    const userPrompt = recentContext 
      ? `Recent conversation:\n${recentContext}\n\nGenerate 3-4 contextual follow-up questions.`
      : `Generate 3-4 helpful starting questions for a ${userRole} in the ${timeContext}.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_suggestions",
              description: "Return the suggested follow-up questions",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string", description: "The question text" },
                        icon: { type: "string", description: "Emoji icon" },
                        category: { 
                          type: "string", 
                          enum: ["calendar", "email", "stats", "leads", "general"]
                        }
                      },
                      required: ["text", "icon", "category"]
                    }
                  }
                },
                required: ["suggestions"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_suggestions" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data));

    // Extract suggestions from tool call
    let suggestions: any[] = [];
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        suggestions = args.suggestions || [];
      } catch (e) {
        console.error('Error parsing tool arguments:', e);
      }
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating suggestions:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
