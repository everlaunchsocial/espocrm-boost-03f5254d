import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FirstMessageRequest {
  leadName: string;
  leadCompany?: string;
  leadTitle?: string;
  leadIndustry?: string;
  demoViews?: number;
  recentNotes?: string[];
  recentActivities?: string[];
  hasDemoEngagement?: boolean;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      leadName, 
      leadCompany, 
      leadTitle,
      leadIndustry,
      demoViews,
      recentNotes,
      recentActivities,
      hasDemoEngagement
    }: FirstMessageRequest = await req.json();

    console.log("Generate first message request:", { leadName, leadCompany, demoViews });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context based on available data
    let context = `Lead: ${leadName}`;
    if (leadTitle) context += `, ${leadTitle}`;
    if (leadCompany) context += ` at ${leadCompany}`;
    if (leadIndustry) context += ` (Industry: ${leadIndustry})`;
    
    if (demoViews && demoViews > 0) {
      context += `\n\nDemo engagement: Viewed demo ${demoViews} time(s)`;
      if (hasDemoEngagement) {
        context += " and interacted with it";
      }
    }

    if (recentNotes && recentNotes.length > 0) {
      context += `\n\nRecent notes:\n${recentNotes.slice(0, 3).map(n => `- ${n}`).join("\n")}`;
    }

    if (recentActivities && recentActivities.length > 0) {
      context += `\n\nRecent activities:\n${recentActivities.slice(0, 3).map(a => `- ${a}`).join("\n")}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an AI sales assistant helping craft personalized outreach messages. Generate a short, warm, and professional first message to send to a potential lead.

Rules:
- Keep it brief (2-3 sentences max)
- Be personalized based on the context provided
- Reference any demo engagement if applicable
- Have a clear but soft call to action (e.g., "Would you be open to a quick chat?")
- Sound human and conversational, not salesy or robotic
- Do NOT include subject lines or greetings - just the message body
- Do NOT include signature - we'll add that separately
- Return ONLY the message text, no formatting or labels`
          },
          {
            role: "user",
            content: `Generate a first outreach message for this lead:\n\n${context}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedMessage = data.choices?.[0]?.message?.content?.trim() || "";

    console.log("Generated first message successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: generatedMessage
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in generate-first-message:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
