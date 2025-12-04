import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MediaItem {
  id: string;
  name: string;
  keywords: string[];
  url: string;
  type: string;
  description: string | null;
}

interface ProcessRequest {
  transcript: string;
  entityType: 'contact' | 'lead';
  entityId: string;
  entityName: string;
  company?: string;
  currentStatus: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { transcript, entityType, entityId, entityName, company, currentStatus }: ProcessRequest = await req.json();

    if (!transcript || !entityId || !entityName) {
      throw new Error("Missing required fields: transcript, entityId, entityName");
    }

    console.log(`Processing transcript for ${entityType}: ${entityName}`);

    // Fetch media library items for context
    const { data: mediaItems, error: mediaError } = await supabase
      .from("media_library")
      .select("*");

    if (mediaError) {
      console.error("Error fetching media library:", mediaError);
    }

    const mediaContext = (mediaItems || []).map((item: MediaItem) => 
      `- "${item.name}" (${item.type}): ${item.url} [Keywords: ${item.keywords?.join(', ') || 'none'}]`
    ).join('\n');

    const systemPrompt = `You are a CRM assistant that analyzes sales call transcripts. Your job is to:
1. Summarize the call in 2-3 sentences
2. Extract action items with due dates (use relative dates like "today", "tomorrow", "next week" converted to actual dates based on current date)
3. Draft a follow-up email if one was discussed
4. Suggest a status update if appropriate

When drafting emails:
- If the caller mentions sending any media (videos, documents, links), find the matching item from the AVAILABLE MEDIA list and insert the actual URL
- Use fuzzy matching - "bathroom video" should match "Bathroom Renovation Video"
- Make emails professional but personalized

Current date: ${new Date().toISOString().split('T')[0]}

AVAILABLE MEDIA ASSETS:
${mediaContext || "No media assets available"}

Respond in JSON format:
{
  "summary": "2-3 sentence summary of the call",
  "actionItems": [
    { "task": "task description", "dueDate": "YYYY-MM-DD", "priority": "low|medium|high" }
  ],
  "email": {
    "subject": "email subject",
    "body": "email body with any media URLs inserted"
  } | null,
  "suggestedStatus": "new status if appropriate" | null
}`;

    const userPrompt = `Analyze this call transcript:

${entityType.toUpperCase()} INFO:
- Name: ${entityName}
${company ? `- Company: ${company}` : ''}
- Current Status: ${currentStatus}

TRANSCRIPT:
${transcript}`;

    console.log("Calling Lovable AI...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI Response:", content);

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      parsed = {
        summary: "Call completed. Please review the transcript for details.",
        actionItems: [],
        email: null,
        suggestedStatus: null,
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in process-call-transcript:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
