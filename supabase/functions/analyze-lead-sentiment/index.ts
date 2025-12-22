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
    const { leadName, notes, activities, teamNotes, demoViews } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build context from lead data
    const contextParts: string[] = [];
    
    if (notes && notes.length > 0) {
      contextParts.push(`Notes:\n${notes.map((n: any) => `- ${n.content}`).join('\n')}`);
    }
    
    if (activities && activities.length > 0) {
      contextParts.push(`Activities:\n${activities.map((a: any) => `- ${a.type}: ${a.subject}${a.description ? ` - ${a.description}` : ''}`).join('\n')}`);
    }
    
    if (teamNotes && teamNotes.length > 0) {
      contextParts.push(`Team Notes:\n${teamNotes.map((n: any) => `- ${n.note_text}`).join('\n')}`);
    }

    if (demoViews && demoViews.length > 0) {
      contextParts.push(`Demo Views:\n${demoViews.map((d: any) => `- Watched ${d.progress_percent || 0}% on ${d.created_at}`).join('\n')}`);
    }

    if (contextParts.length === 0) {
      return new Response(JSON.stringify({ 
        sentiment: 'neutral',
        sentimentReason: 'No interaction data available yet',
        urgency: 'low',
        urgencyReason: 'No activity to assess urgency'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const context = contextParts.join('\n\n');

    const prompt = `Analyze the following lead interaction data for "${leadName}" and determine sentiment and urgency.

${context}

Respond with a JSON object containing exactly these fields:
- sentiment: "positive", "neutral", or "negative" (based on tone of interactions, engagement level, expressed interest)
- sentimentReason: A brief 5-10 word reason for the sentiment
- urgency: "high", "medium", or "low" (based on recency of activity, response gaps, engagement timing)
- urgencyReason: A brief 5-10 word reason for the urgency level

Consider:
- Positive sentiment: expressions of interest, excitement, engagement
- Negative sentiment: complaints, frustration, objections, disengagement
- High urgency: recent demo views without follow-up, active engagement needing response
- Low urgency: cold leads, completed deals, or very recent contact

Return ONLY valid JSON, no markdown or extra text.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert CRM analyst. Analyze lead data and return structured sentiment/urgency assessments. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'API credits exhausted.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON from response (handle potential markdown wrapping)
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse sentiment analysis');
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-lead-sentiment:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to analyze sentiment' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
