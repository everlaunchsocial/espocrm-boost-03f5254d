import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId } = await req.json();
    
    if (!leadId) {
      return new Response(JSON.stringify({ error: "leadId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch lead data
    const { data: lead } = await supabase
      .from("leads")
      .select("first_name, last_name, company, industry, title")
      .eq("id", leadId)
      .single();

    // Fetch recent notes
    const { data: notes } = await supabase
      .from("notes")
      .select("content, created_at")
      .eq("related_to_type", "lead")
      .eq("related_to_id", leadId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch call logs with summaries
    const { data: calls } = await supabase
      .from("call_logs")
      .select("summary, transcript, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(3);

    // Fetch demo interactions
    const { data: demos } = await supabase
      .from("demos")
      .select("business_name, chat_interaction_count, voice_interaction_count, view_count")
      .eq("lead_id", leadId)
      .limit(3);

    // Fetch lead summary if exists
    const { data: summary } = await supabase
      .from("lead_summaries")
      .select("summary_text")
      .eq("lead_id", leadId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Build context for AI
    const notesContext = notes?.map(n => n.content).join("\n") || "";
    const callsContext = calls?.map(c => c.summary || c.transcript?.slice(0, 200)).join("\n") || "";
    const demoContext = demos?.map(d => 
      `Demo for ${d.business_name}: ${d.view_count} views, ${d.chat_interaction_count} chats, ${d.voice_interaction_count} voice`
    ).join("\n") || "";

    const prompt = `Analyze this lead and provide sales insights:

Lead: ${lead?.first_name} ${lead?.last_name}${lead?.company ? ` at ${lead.company}` : ""}${lead?.industry ? ` (${lead.industry})` : ""}

Recent Notes:
${notesContext || "No notes"}

Call Summaries:
${callsContext || "No calls"}

Demo Activity:
${demoContext || "No demos"}

AI Summary:
${summary?.summary_text || "None"}

Respond with JSON only:
{
  "interests": ["interest1", "interest2", "interest3"],
  "talkingPoints": [
    {"point": "talking point text", "reason": "why this matters"}
  ]
}

Interests: Extract 2-4 topics the lead seems interested in based on their interactions.
Talking Points: Generate 2-3 personalized conversation starters or tips for the sales rep.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ 
        interests: [],
        talkingPoints: [],
        error: "AI not configured" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a sales insights AI. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ interests: [], talkingPoints: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    
    // Parse JSON from response
    let parsed = { interests: [], talkingPoints: [] };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-lead-insights:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
