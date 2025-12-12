import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
const DEEPSEEK_INPUT_COST = 0.00014; // $0.14 per 1M tokens
const DEEPSEEK_OUTPUT_COST = 0.00028; // $0.28 per 1M tokens

const ANALYSIS_PROMPT = `You are an AI call quality analyst for a voice AI receptionist platform. Your job is to analyze call transcripts and provide detailed scoring.

Call Context:
- Duration: {duration} seconds
- Customer Business Type: {business_type}

SCORING RUBRIC (rate each 1-10):

1. SPEED (1=too slow, 5=perfect, 10=too fast)
   - Evaluate pacing and response time
   - Consider if customer seemed rushed or bored

2. CLARITY (1=confusing, 10=crystal clear)
   - Did AI understand questions correctly?
   - Were responses easy to understand?

3. ACCURACY (1=wrong info, 10=perfectly accurate)
   - Did AI provide correct information?
   - Any factual errors or made-up details?

4. TONE (1=inappropriate, 10=perfect for context)
   - Professional yet friendly?
   - Appropriate for industry?

5. COMPLETENESS (1=missing info, 10=captured everything)
   - Did AI ask all necessary qualifying questions?
   - Any missed opportunities to gather details?

6. LEAD QUALITY (1=no value, 10=hot qualified lead)
   - How valuable is this lead to the customer?
   - Did AI determine urgency and budget?

7. BOOKING SUCCESS (1=failed, 10=booked)
   - If call involved scheduling, was it successful?
   - N/A if not applicable - give neutral 5

8. OBJECTION HANDLING (1=failed, 10=perfect)
   - If customer raised concerns, how well handled?
   - N/A if no objections - give neutral 5

9. CALL DURATION (1=too short/long, 10=optimal)
   - Appropriate length for call type?
   - Emergency should be quick, sales longer

10. OUTCOME QUALITY (1=poor, 10=excellent)
    - Overall: Did this call benefit the business?
    - Would customer be happy with this interaction?

Transcript:
{transcript}

RESPONSE FORMAT (JSON only, no markdown):
{
  "scores": {
    "speed": 7,
    "clarity": 9,
    "accuracy": 8,
    "tone": 9,
    "completeness": 6,
    "lead_quality": 7,
    "booking_success": 5,
    "objection_handling": 5,
    "call_duration": 7,
    "outcome_quality": 8
  },
  "overall_score": 7.1,
  "insights": {
    "strengths": ["Clear communication", "Professional tone"],
    "weaknesses": ["Missed asking about budget"],
    "notable_moments": ["Customer praised quick response"]
  },
  "suggestions": [
    {
      "category": "completeness",
      "issue": "Didn't ask about timeline",
      "fix": "Add 'When do you need this done?' to questions",
      "priority": "medium"
    }
  ],
  "summary": "Brief 1-2 sentence summary of the call",
  "category": "new_lead",
  "sentiment": "positive"
}

Valid categories: new_lead, appointment, question, complaint, follow_up, emergency, other
Valid sentiments: positive, neutral, negative`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { call_id } = await req.json();

    if (!call_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'call_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch call data
    const { data: callData, error: fetchError } = await supabase
      .from('vapi_calls')
      .select('*, customer_profiles(business_type)')
      .eq('id', call_id)
      .single();

    if (fetchError || !callData) {
      console.error('Error fetching call:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Call not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!callData.transcript || callData.transcript.length < 20) {
      return new Response(
        JSON.stringify({ success: false, error: 'Transcript too short to analyze' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already analyzed
    const { data: existingAnalysis } = await supabase
      .from('call_analysis')
      .select('id')
      .eq('call_id', call_id)
      .single();

    if (existingAnalysis) {
      return new Response(
        JSON.stringify({ success: false, error: 'Call already analyzed', analysis_id: existingAnalysis.id }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build prompt
    const businessType = callData.customer_profiles?.business_type || 'general';
    const prompt = ANALYSIS_PROMPT
      .replace('{duration}', String(callData.duration_seconds || 0))
      .replace('{business_type}', businessType)
      .replace('{transcript}', callData.transcript);

    // Estimate input tokens (rough: 4 chars per token)
    const inputTokens = Math.ceil(prompt.length / 4);

    // Call DeepSeek API
    console.log('Calling DeepSeek API for analysis...');
    const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a call quality analyst. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error('DeepSeek API error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deepseekResult = await deepseekResponse.json();
    const outputTokens = deepseekResult.usage?.completion_tokens || 800;
    const totalInputTokens = deepseekResult.usage?.prompt_tokens || inputTokens;

    // Calculate cost
    const analysisCost = (totalInputTokens * DEEPSEEK_INPUT_COST / 1000) + (outputTokens * DEEPSEEK_OUTPUT_COST / 1000);

    // Parse response
    let analysis;
    try {
      const content = deepseekResult.choices?.[0]?.message?.content || '{}';
      analysis = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scores = analysis.scores || {} as Record<string, number>;
    const scoreValues = Object.values(scores) as number[];
    const overallScore = analysis.overall_score || 
      (scoreValues.length > 0 ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length : 5);

    // Save to database
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('call_analysis')
      .insert({
        call_id: call_id,
        customer_id: callData.customer_id,
        analyzer_model: 'deepseek-chat',
        analysis_cost: analysisCost,
        overall_score: overallScore,
        score_speed: scores.speed || 5,
        score_clarity: scores.clarity || 5,
        score_accuracy: scores.accuracy || 5,
        score_tone: scores.tone || 5,
        score_completeness: scores.completeness || 5,
        score_lead_quality: scores.lead_quality || 5,
        score_booking_success: scores.booking_success || 5,
        score_objection_handling: scores.objection_handling || 5,
        score_call_duration: scores.call_duration || 5,
        score_outcome_quality: scores.outcome_quality || 5,
        insights: analysis.insights || {},
        suggestions: analysis.suggestions || [],
        transcript_summary: analysis.summary || '',
        call_category: analysis.category || 'other',
        sentiment: analysis.sentiment || 'neutral',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving analysis:', saveError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save analysis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analysis saved successfully:', savedAnalysis.id);

    return new Response(
      JSON.stringify({
        success: true,
        analysis_id: savedAnalysis.id,
        overall_score: overallScore,
        cost: analysisCost,
        category: analysis.category,
        sentiment: analysis.sentiment,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in analyze-call-quality:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
