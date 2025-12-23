import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScriptContent {
  opening: string;
  contextReference: string;
  valueProposition: string;
  questions: string[];
  objectionResponses: Record<string, string>;
  closing: string;
  alternativeCloses: string[];
  keyPoints: string[];
}

const INDUSTRY_QUESTIONS: Record<string, string[]> = {
  restaurant: [
    "How many calls do you miss during dinner rush?",
    "What's your current system for handling reservations?",
    "How do you handle takeout orders during busy periods?"
  ],
  hvac: [
    "How many trucks do you have in the field?",
    "What happens when calls come in while your techs are on jobs?",
    "How do you handle emergency calls after hours?"
  ],
  legal: [
    "How many potential cases slip through due to missed calls?",
    "What's your current intake process for new clients?",
    "How do you handle after-hours legal emergencies?"
  ],
  medical: [
    "How do patients typically reach you for appointments?",
    "What happens when patients call during lunch or after hours?",
    "How do you handle urgent care inquiries?"
  ],
  realestate: [
    "How many leads do you get from online inquiries?",
    "What happens when a buyer calls about a listing after hours?",
    "How quickly can you respond to new property inquiries?"
  ],
  default: [
    "What's your biggest challenge with incoming calls?",
    "How are you currently handling customer inquiries?",
    "What happens to calls that come in after hours?"
  ]
};

const OBJECTION_LIBRARY: Record<string, string> = {
  too_expensive: "I completely understand budget is important. Let me share this - our clients typically see ROI within the first month because they're capturing calls they were missing. One restaurant owner told me he booked $3,000 in catering orders in the first week alone. Would it help if I showed you our payment options?",
  need_to_think: "That makes total sense - this is an important decision. What specific aspects would you like to think through? I'd love to address any concerns right now while I have you.",
  not_interested: "I appreciate your honesty. Before I let you go, can I ask what you're currently using to handle calls? Sometimes businesses don't realize how much they're missing until they see the data.",
  have_solution: "That's great that you have something in place. What I hear from businesses who switch to us is that our AI handles conversations more naturally. Would you be open to a side-by-side comparison?",
  send_info: "Absolutely, I can send information. But I've found that a quick 10-minute demo shows you so much more than any brochure. How about we schedule that, and I'll send the info as well? What does your calendar look like this week?",
  bad_timing: "I totally get it - timing is everything. When would be a better time to revisit this? I'd hate for you to miss out on the new customer calls you could be capturing."
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { leadId, scriptType = 'follow_up' } = await req.json();

    if (!leadId) {
      return new Response(JSON.stringify({ error: "leadId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch lead data
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      console.error("Lead fetch error:", leadError);
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch recent activities
    const { data: activities = [] } = await supabase
      .from("activities")
      .select("*")
      .eq("related_to_id", leadId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch recent notes
    const { data: notes = [] } = await supabase
      .from("notes")
      .select("*")
      .eq("related_to_id", leadId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch demo data
    const { data: demos = [] } = await supabase
      .from("demos")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1);

    // Fetch email opens
    const { data: emailEvents = [] } = await supabase
      .from("email_events")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Build context
    const demo = (demos || [])[0];
    const hasViewedDemo = demo?.view_count > 0;
    const demoViewCount = demo?.view_count || 0;
    const lastViewedAt = demo?.last_viewed_at;
    const emailOpens = (emailEvents || []).filter(e => e.event_type === 'open').length;
    const industry = lead.category?.toLowerCase() || lead.industry?.toLowerCase() || 'default';
    
    const contextData = {
      leadName: `${lead.first_name} ${lead.last_name}`,
      company: lead.company || 'your business',
      industry,
      hasViewedDemo,
      demoViewCount,
      lastViewedAt,
      emailOpens,
      pipelineStatus: lead.pipeline_status,
      daysSinceCreated: Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      recentActivities: (activities || []).slice(0, 3).map((a: any) => ({ type: a.type, subject: a.subject })),
      recentNotes: (notes || []).slice(0, 2).map((n: any) => n.content?.substring(0, 100)),
      website: lead.website,
      rating: lead.google_rating,
      reviewCount: lead.google_review_count,
    };

    // Get industry-specific questions
    const industryQuestions = INDUSTRY_QUESTIONS[industry] || INDUSTRY_QUESTIONS.default;

    // Generate script using AI if available
    let scriptContent: ScriptContent;

    if (lovableApiKey) {
      const prompt = buildAIPrompt(contextData, scriptType, industryQuestions);
      
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an expert sales script writer for a phone AI solution company called EverLaunch. 
Create personalized, natural-sounding call scripts that feel conversational, not robotic.
Focus on value and building rapport. Always respond with valid JSON matching the specified structure.`
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        
        try {
          // Extract JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            scriptContent = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("No JSON found in response");
          }
        } catch (parseError) {
          console.error("Failed to parse AI response, using fallback:", parseError);
          scriptContent = generateFallbackScript(contextData, scriptType, industryQuestions);
        }
      } else {
        console.error("AI request failed:", await aiResponse.text());
        scriptContent = generateFallbackScript(contextData, scriptType, industryQuestions);
      }
    } else {
      scriptContent = generateFallbackScript(contextData, scriptType, industryQuestions);
    }

    // Store the generated script
    const { data: script, error: insertError } = await supabase
      .from("call_scripts")
      .insert({
        lead_id: leadId,
        script_type: scriptType,
        script_content: scriptContent,
        context_used: contextData,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save script" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ script }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error generating call script:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildAIPrompt(context: any, scriptType: string, industryQuestions: string[]): string {
  return `Generate a ${scriptType} call script for a sales call. Return ONLY valid JSON with this exact structure:

{
  "opening": "greeting line",
  "contextReference": "personalized reference to their situation",
  "valueProposition": "tailored value pitch",
  "questions": ["discovery question 1", "discovery question 2", "discovery question 3"],
  "objectionResponses": {
    "too_expensive": "response",
    "need_to_think": "response",
    "not_interested": "response"
  },
  "closing": "closing line with call to action",
  "alternativeCloses": ["alternative 1", "alternative 2"],
  "keyPoints": ["key point 1", "key point 2", "key point 3"]
}

Context:
- Lead name: ${context.leadName}
- Company: ${context.company}
- Industry: ${context.industry}
- Has viewed demo: ${context.hasViewedDemo ? `Yes, ${context.demoViewCount} times` : 'No'}
- Last demo view: ${context.lastViewedAt || 'N/A'}
- Email opens: ${context.emailOpens}
- Pipeline status: ${context.pipelineStatus}
- Days since first contact: ${context.daysSinceCreated}
- Website: ${context.website || 'N/A'}
- Google rating: ${context.rating || 'N/A'} (${context.reviewCount || 0} reviews)

Script type: ${scriptType}
Industry-specific questions to consider: ${industryQuestions.join(', ')}

Make the script feel natural and conversational. Reference specific context like demo views or their industry.`;
}

function generateFallbackScript(context: any, scriptType: string, industryQuestions: string[]): ScriptContent {
  const firstName = context.leadName.split(' ')[0];
  
  let opening = '';
  let contextReference = '';
  
  switch (scriptType) {
    case 'cold_call':
      opening = `Hi ${firstName}, this is your name from EverLaunch. I help ${context.industry} businesses like ${context.company} never miss a customer call. Do you have a quick minute?`;
      contextReference = `I noticed ${context.company} has a great reputation in the area.`;
      break;
    case 'follow_up':
      if (context.hasViewedDemo) {
        opening = `Hi ${firstName}, this is your name from EverLaunch. You watched our demo ${context.demoViewCount > 1 ? `${context.demoViewCount} times` : 'recently'} - do you have 3 minutes to chat?`;
        contextReference = `I saw you've been checking out how our AI can help ${context.company}. Any questions about what you saw?`;
      } else {
        opening = `Hi ${firstName}, this is your name from EverLaunch following up on our conversation. Is now still a good time?`;
        contextReference = `I wanted to circle back about how we can help ${context.company} capture more calls.`;
      }
      break;
    case 'demo_booking':
      opening = `Hi ${firstName}, this is your name from EverLaunch. I have some time this week for a quick demo - would 15 minutes work for you?`;
      contextReference = `Based on what I know about ${context.industry} businesses, I think you'll be impressed with how we handle your specific challenges.`;
      break;
    case 'closing':
      opening = `Hi ${firstName}, this is your name from EverLaunch. I'm following up on our demo - are you ready to get started?`;
      contextReference = `After seeing how we can help ${context.company}, I wanted to check if you had any final questions.`;
      break;
    default:
      opening = `Hi ${firstName}, this is your name from EverLaunch. How are you today?`;
      contextReference = `I'm calling about how we can help ${context.company} with customer calls.`;
  }

  const keyPoints = [
    `Viewed demo ${context.demoViewCount} times`,
    `Industry: ${context.industry}`,
    context.rating ? `Google rating: ${context.rating} stars` : 'New business'
  ].filter(Boolean);

  return {
    opening,
    contextReference,
    valueProposition: `Our AI answers 100% of your calls 24/7, even during your busiest hours. For ${context.industry} businesses like yours, this means never missing a potential customer again.`,
    questions: industryQuestions,
    objectionResponses: OBJECTION_LIBRARY,
    closing: `Would Thursday at 2pm work for a quick 15-minute demo to show you exactly how it works for ${context.industry} businesses?`,
    alternativeCloses: [
      "If Thursday doesn't work, what day this week is better for you?",
      "Would you prefer a morning or afternoon call?",
      "I could also send you a personalized video demo - would that be helpful?"
    ],
    keyPoints
  };
}
