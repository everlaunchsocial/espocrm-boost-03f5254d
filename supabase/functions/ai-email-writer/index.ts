import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AIEmailRequest {
  promptType: "introduction" | "follow-up" | "appointment" | "thank-you" | "custom";
  customPrompt?: string;
  contactName: string;
  contactCompany?: string;
  contactTitle?: string;
  senderName: string;
  additionalContext?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      promptType, 
      customPrompt, 
      contactName, 
      contactCompany, 
      contactTitle,
      senderName,
      additionalContext 
    }: AIEmailRequest = await req.json();

    console.log("AI email request:", { promptType, contactName, contactCompany });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context string
    let context = `Contact: ${contactName}`;
    if (contactTitle) context += `, ${contactTitle}`;
    if (contactCompany) context += ` at ${contactCompany}`;
    if (additionalContext) context += `\n\nAdditional context: ${additionalContext}`;

    // Build prompt based on type
    let userPrompt = "";
    switch (promptType) {
      case "introduction":
        userPrompt = `Write a professional introduction email to ${contactName}${contactCompany ? ` from ${contactCompany}` : ""}. The email should introduce myself (${senderName}) and our services, and express interest in connecting.`;
        break;
      case "follow-up":
        userPrompt = `Write a follow-up email to ${contactName}${contactCompany ? ` from ${contactCompany}` : ""}. Reference a previous conversation or meeting, check in on their needs, and offer to help.`;
        break;
      case "appointment":
        userPrompt = `Write an email to ${contactName}${contactCompany ? ` from ${contactCompany}` : ""} requesting to schedule a meeting or call. Suggest a few time options and express enthusiasm for connecting.`;
        break;
      case "thank-you":
        userPrompt = `Write a thank you email to ${contactName}${contactCompany ? ` from ${contactCompany}` : ""}. Thank them for their time, summarize key points discussed, and outline next steps.`;
        break;
      case "custom":
        userPrompt = customPrompt || `Write a professional email to ${contactName}.`;
        break;
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
            content: `You are a professional email writer for a CRM system. Write concise, professional, and personalized emails. 
            
Rules:
- Keep emails brief (3-5 short paragraphs max)
- Use a professional but warm tone
- Include a clear call to action
- Do NOT include subject line suggestions - just the email body
- Start with an appropriate greeting using the contact's name
- End with a professional sign-off using the sender's name: ${senderName}
- Do not use placeholder text like [Your Name] - use the actual sender name provided
- Format the email as clean HTML with <p> tags for paragraphs`
          },
          {
            role: "user",
            content: `${userPrompt}\n\nContext:\n${context}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedEmail = data.choices?.[0]?.message?.content || "";

    console.log("Generated email successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        email: generatedEmail,
        promptType 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in ai-email-writer:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
