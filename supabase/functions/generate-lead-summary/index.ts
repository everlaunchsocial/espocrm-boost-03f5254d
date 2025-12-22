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
    const { leadName, notes, activities, teamNotes } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from all available data
    const contextParts: string[] = [];

    if (notes && notes.length > 0) {
      contextParts.push(`Notes: ${notes.map((n: any) => n.content).join('; ')}`);
    }

    if (teamNotes && teamNotes.length > 0) {
      contextParts.push(`Team Notes: ${teamNotes.map((n: any) => n.note_text).join('; ')}`);
    }

    if (activities && activities.length > 0) {
      const activitySummary = activities
        .slice(0, 15) // Limit to recent activities
        .map((a: any) => `${a.type}: ${a.subject}${a.description ? ` - ${a.description}` : ''}`)
        .join('; ');
      contextParts.push(`Activities: ${activitySummary}`);
    }

    if (contextParts.length === 0) {
      return new Response(
        JSON.stringify({ summary: "No activity data available yet for this lead. Start by adding notes or logging activities." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `You are a CRM assistant. Based on the following lead data for "${leadName}", write a concise 3-5 sentence summary that helps a sales rep quickly understand:
1. The lead's engagement level and interest
2. Key interactions or events
3. Any concerns or objections noted
4. Suggested next steps or urgency

Lead Data:
${contextParts.join('\n')}

Write the summary in third person, professional tone. Be specific but concise.`;

    console.log("Generating lead summary for:", leadName);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "Unable to generate summary.";

    console.log("Summary generated successfully");

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in generate-lead-summary:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
