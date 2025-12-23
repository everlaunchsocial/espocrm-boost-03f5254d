import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeSentimentRequest {
  leadId: string;
  content: string;
  interactionType: 'email_received' | 'call_notes' | 'sms_received' | 'demo_feedback' | 'notes';
}

interface SentimentResult {
  sentiment_score: number;
  sentiment_label: string;
  emotions_detected: Record<string, number>;
  urgency_level: string;
  key_phrases: string[];
  recommended_action: string;
}

function getSentimentLabel(score: number): string {
  if (score <= -0.6) return 'very_negative';
  if (score <= -0.2) return 'negative';
  if (score <= 0.2) return 'neutral';
  if (score <= 0.6) return 'positive';
  return 'very_positive';
}

function calculateTrend(journeyData: any[]): string {
  if (journeyData.length < 2) return 'stable';
  const recent = journeyData.slice(-3);
  if (recent.length < 2) return 'stable';
  
  const avgRecent = recent.reduce((sum, d) => sum + d.score, 0) / recent.length;
  const avgOlder = journeyData.slice(-6, -3).reduce((sum, d) => sum + (d.score || 0), 0) / Math.max(journeyData.slice(-6, -3).length, 1);
  
  if (avgRecent - avgOlder > 0.15) return 'improving';
  if (avgRecent - avgOlder < -0.15) return 'declining';
  return 'stable';
}

function calculateRiskLevel(score: number, trend: string): string {
  if (score <= -0.6) return 'high';
  if (score <= -0.3 || (score <= 0 && trend === 'declining')) return 'medium';
  if (score < 0) return 'low';
  return 'none';
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, content, interactionType }: AnalyzeSentimentRequest = await req.json();

    if (!leadId || !content) {
      return new Response(
        JSON.stringify({ error: "leadId and content are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analyzing sentiment for lead:", leadId, "type:", interactionType);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call Lovable AI for sentiment analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    let sentimentResult: SentimentResult;
    
    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                content: `You are a sentiment analysis expert. Analyze customer communications and extract emotional intelligence data. Always respond with valid JSON only, no markdown.`
              },
              {
                role: "user",
                content: `Analyze the sentiment and emotional tone of this customer message:

"${content}"

Provide analysis as JSON with these exact fields:
{
  "sentiment_score": number between -1.0 (very negative) and 1.0 (very positive),
  "primary_emotion": string (one of: excitement, interest, satisfaction, trust, hope, frustration, anger, disappointment, confusion, anxiety, curiosity, consideration, indifference),
  "secondary_emotions": object with emotion names as keys and intensity 0-1 as values,
  "urgency_level": string (one of: low, medium, high, critical),
  "key_phrases": array of important phrases from the message,
  "concerns": array of detected concerns or objections,
  "interests": array of detected interests or positive signals,
  "recommended_action": string with specific follow-up recommendation
}`
              }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const responseText = aiData.choices?.[0]?.message?.content || "";
          
          // Parse AI response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            
            const emotions: Record<string, number> = {};
            emotions[parsed.primary_emotion] = 1.0;
            if (parsed.secondary_emotions) {
              Object.assign(emotions, parsed.secondary_emotions);
            }
            
            sentimentResult = {
              sentiment_score: Math.max(-1, Math.min(1, parsed.sentiment_score)),
              sentiment_label: getSentimentLabel(parsed.sentiment_score),
              emotions_detected: emotions,
              urgency_level: parsed.urgency_level || 'low',
              key_phrases: [...(parsed.key_phrases || []), ...(parsed.concerns || []), ...(parsed.interests || [])],
              recommended_action: parsed.recommended_action || "Review and respond appropriately",
            };
          } else {
            throw new Error("Could not parse AI response");
          }
        } else {
          throw new Error(`AI API error: ${aiResponse.status}`);
        }
      } catch (aiError) {
        console.error("AI analysis failed, using fallback:", aiError);
        sentimentResult = fallbackAnalysis(content);
      }
    } else {
      console.log("LOVABLE_API_KEY not configured, using fallback analysis");
      sentimentResult = fallbackAnalysis(content);
    }

    // Store sentiment analysis
    const { data: analysis, error: analysisError } = await supabase
      .from("sentiment_analysis")
      .insert({
        lead_id: leadId,
        interaction_type: interactionType,
        content_analyzed: content,
        sentiment_score: sentimentResult.sentiment_score,
        sentiment_label: sentimentResult.sentiment_label,
        emotions_detected: sentimentResult.emotions_detected,
        urgency_level: sentimentResult.urgency_level,
        key_phrases: sentimentResult.key_phrases,
        recommended_action: sentimentResult.recommended_action,
      })
      .select()
      .single();

    if (analysisError) {
      console.error("Error storing analysis:", analysisError);
      throw analysisError;
    }

    // Update emotional journey
    const { data: existingJourney } = await supabase
      .from("emotional_journey")
      .select("*")
      .eq("lead_id", leadId)
      .maybeSingle();

    const journeyPoint = {
      date: new Date().toISOString(),
      score: sentimentResult.sentiment_score,
      label: sentimentResult.sentiment_label,
      emotion: Object.keys(sentimentResult.emotions_detected)[0] || 'neutral',
      interaction_type: interactionType,
    };

    let journeyData = existingJourney?.journey_data || [];
    if (!Array.isArray(journeyData)) journeyData = [];
    journeyData.push(journeyPoint);

    // Keep last 50 data points
    if (journeyData.length > 50) {
      journeyData = journeyData.slice(-50);
    }

    const trend = calculateTrend(journeyData);
    const riskLevel = calculateRiskLevel(sentimentResult.sentiment_score, trend);
    const primaryEmotion = Object.keys(sentimentResult.emotions_detected)[0] || 'neutral';

    if (existingJourney) {
      await supabase
        .from("emotional_journey")
        .update({
          journey_data: journeyData,
          current_emotional_state: primaryEmotion,
          trend: trend,
          risk_level: riskLevel,
          last_updated: new Date().toISOString(),
        })
        .eq("id", existingJourney.id);
    } else {
      await supabase
        .from("emotional_journey")
        .insert({
          lead_id: leadId,
          journey_data: journeyData,
          current_emotional_state: primaryEmotion,
          trend: trend,
          risk_level: riskLevel,
        });
    }

    console.log("Sentiment analysis complete:", {
      score: sentimentResult.sentiment_score,
      label: sentimentResult.sentiment_label,
      riskLevel,
    });

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysis,
        sentiment: sentimentResult,
        trend,
        riskLevel,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in analyze-sentiment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Fallback keyword-based analysis
function fallbackAnalysis(content: string): SentimentResult {
  const lower = content.toLowerCase();
  
  // Keyword scoring
  const positiveWords = ['excited', 'great', 'perfect', 'love', 'amazing', 'wonderful', 'interested', 'ready', 'yes', 'start', 'asap'];
  const negativeWords = ['frustrated', 'angry', 'disappointed', 'terrible', 'never', 'waiting', 'ridiculous', 'expensive', 'slow', 'not sure', 'no'];
  const urgentWords = ['asap', 'urgent', 'immediately', 'now', 'today', 'deadline', 'hurry'];
  
  let score = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    if (lower.includes(word)) {
      score += 0.2;
      positiveCount++;
    }
  });
  
  negativeWords.forEach(word => {
    if (lower.includes(word)) {
      score -= 0.25;
      negativeCount++;
    }
  });
  
  // Clamp score
  score = Math.max(-1, Math.min(1, score));
  
  // Determine primary emotion
  let primaryEmotion = 'neutral';
  if (score > 0.5) primaryEmotion = 'excitement';
  else if (score > 0.2) primaryEmotion = 'interest';
  else if (score < -0.5) primaryEmotion = 'frustration';
  else if (score < -0.2) primaryEmotion = 'disappointment';
  else if (lower.includes('?')) primaryEmotion = 'curiosity';
  
  // Check urgency
  let urgency = 'low';
  const urgentCount = urgentWords.filter(w => lower.includes(w)).length;
  if (urgentCount >= 2 || lower.includes('!!!')) urgency = 'critical';
  else if (urgentCount === 1 || lower.includes('!')) urgency = 'high';
  else if (lower.includes('soon') || lower.includes('when')) urgency = 'medium';
  
  // Extract key phrases (simple word extraction)
  const phrases = content.split(/[.!?]/).filter(p => p.trim().length > 10).slice(0, 5);
  
  // Generate recommendation
  let recommendation = "Continue standard follow-up process";
  if (score < -0.5) recommendation = "Call immediately to address concerns and rebuild trust";
  else if (score < 0) recommendation = "Send empathetic follow-up addressing their concerns";
  else if (score > 0.5) recommendation = "Strike while hot - send closing materials or book call";
  else if (primaryEmotion === 'curiosity') recommendation = "Provide detailed information and offer to answer questions";
  
  return {
    sentiment_score: score,
    sentiment_label: getSentimentLabel(score),
    emotions_detected: { [primaryEmotion]: 1.0 },
    urgency_level: urgency,
    key_phrases: phrases.map(p => p.trim()),
    recommended_action: recommendation,
  };
}
