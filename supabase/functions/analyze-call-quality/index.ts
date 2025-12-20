import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
const DEEPSEEK_INPUT_COST = 0.00014; // $0.14 per 1M tokens
const DEEPSEEK_OUTPUT_COST = 0.00028; // $0.28 per 1M tokens

// Issue tags that map to our 3-layer architecture
const VALID_ISSUE_TAGS = [
  // Escalation/Transfer issues
  'missed_escalation',
  'unnecessary_escalation',
  'failed_transfer',
  
  // Booking issues  
  'booking_when_disabled',
  'missed_booking_opportunity',
  'booking_flow_error',
  
  // Lead capture issues
  'failed_to_capture_phone',
  'failed_to_capture_email',
  'failed_to_capture_name',
  'incomplete_lead_info',
  
  // Conversation quality issues
  'too_many_questions',
  'too_few_questions',
  'response_too_long',
  'response_too_short',
  'unclear_communication',
  
  // Compliance/Restriction issues
  'restricted_advice_risk_legal',
  'restricted_advice_risk_medical',
  'restricted_advice_risk_financial',
  'pricing_handling_weak',
  'guarantee_language_used',
  
  // Flow issues
  'after_hours_flow_missed',
  'wrong_persona_tone',
  'script_deviation',
  
  // Outcome issues
  'caller_frustration',
  'premature_hangup',
  'unresolved_inquiry',
];

// Map issue tags to architecture layers
const ISSUE_TO_LAYER_MAP: Record<string, string> = {
  // Brain rules layer
  'restricted_advice_risk_legal': 'brain_rules',
  'restricted_advice_risk_medical': 'brain_rules',
  'restricted_advice_risk_financial': 'brain_rules',
  'guarantee_language_used': 'brain_rules',
  'wrong_persona_tone': 'brain_rules',
  
  // Workflow layer
  'missed_escalation': 'workflow',
  'unnecessary_escalation': 'workflow',
  'failed_transfer': 'workflow',
  'missed_booking_opportunity': 'workflow',
  'booking_flow_error': 'workflow',
  'after_hours_flow_missed': 'workflow',
  'script_deviation': 'workflow',
  
  // Config toggle layer
  'booking_when_disabled': 'config_toggle',
  
  // Business facts layer
  'pricing_handling_weak': 'business_facts',
  'failed_to_capture_phone': 'business_facts',
  'failed_to_capture_email': 'business_facts',
  'failed_to_capture_name': 'business_facts',
  'incomplete_lead_info': 'business_facts',
};

// Low score threshold for alerts
const LOW_SCORE_THRESHOLD = 5;

const ANALYSIS_PROMPT = `You are an AI call quality analyst for a voice AI receptionist platform. Your job is to analyze call transcripts and provide detailed scoring AND actionable issue detection.

Call Context:
- Duration: {duration} seconds
- Customer Business Type: {business_type}
- Vertical: {vertical_id}
- Channel: {channel}

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

ISSUE DETECTION (CRITICAL):
Identify any of these specific issues if present (select up to 5 most important):

Escalation Issues:
- missed_escalation: Caller wanted human but AI didn't offer transfer
- unnecessary_escalation: AI transferred when it could have handled
- failed_transfer: Transfer was attempted but failed

Booking Issues:
- booking_when_disabled: AI tried to book when feature may be off
- missed_booking_opportunity: Caller wanted appointment, AI didn't offer
- booking_flow_error: Booking process had errors

Lead Capture Issues:
- failed_to_capture_phone: Caller's phone not collected
- failed_to_capture_email: Email not collected when relevant
- failed_to_capture_name: Name not properly captured
- incomplete_lead_info: Key qualifying info missing

Conversation Quality:
- too_many_questions: AI asked excessive questions, felt interrogating
- too_few_questions: AI didn't gather enough info
- response_too_long: AI responses were verbose
- response_too_short: AI responses lacked detail
- unclear_communication: Misunderstandings occurred

Compliance Risks (CRITICAL - always flag):
- restricted_advice_risk_legal: AI gave legal advice (attorneys, bail bonds)
- restricted_advice_risk_medical: AI gave medical/diagnosis advice
- restricted_advice_risk_financial: AI gave financial/investment advice
- pricing_handling_weak: Pricing was vague or incorrect
- guarantee_language_used: AI made promises/guarantees

Flow Issues:
- after_hours_flow_missed: Call was after hours but AI didn't adapt
- wrong_persona_tone: AI tone didn't match vertical/brand
- script_deviation: AI deviated from expected flow

Outcome Issues:
- caller_frustration: Caller showed frustration
- premature_hangup: Call ended abruptly
- unresolved_inquiry: Main question wasn't answered

ACTION SUMMARY:
Also track what actions the AI attempted:
- booking_attempted: Did AI try to schedule?
- transfer_attempted: Did AI try to transfer?
- lead_captured: Were lead details collected?
- callback_scheduled: Was callback offered?

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
  "issue_tags": ["failed_to_capture_phone", "too_many_questions"],
  "action_summary": {
    "booking_attempted": false,
    "transfer_attempted": false,
    "lead_captured": true,
    "callback_scheduled": false
  },
  "recommended_fix": {
    "layer": "business_facts",
    "action": "Add modifier",
    "target": "lead_capture_prompt",
    "description": "Strengthen phone capture ask"
  },
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

    // Fetch call data with customer profile and settings
    const { data: callData, error: fetchError } = await supabase
      .from('vapi_calls')
      .select(`
        *, 
        customer_profiles(
          id,
          business_type, 
          business_name,
          settings_updated_at
        )
      `)
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

    // Determine vertical and channel
    const businessType = callData.customer_profiles?.business_type || 'general';
    const verticalId = businessType; // Use business_type as vertical for now
    const channel = callData.call_type === 'demo' ? 'phone' : (callData.call_metadata?.channel || 'phone');
    const configVersion = callData.customer_profiles?.settings_updated_at 
      ? new Date(callData.customer_profiles.settings_updated_at).getTime().toString(36)
      : null;

    console.log(`[analyze-call-quality] Analyzing call ${call_id}`);
    console.log(`  - Vertical: ${verticalId}`);
    console.log(`  - Channel: ${channel}`);
    console.log(`  - Config Version: ${configVersion}`);

    // Build prompt with context
    const prompt = ANALYSIS_PROMPT
      .replace('{duration}', String(callData.duration_seconds || 0))
      .replace('{business_type}', businessType)
      .replace('{vertical_id}', verticalId)
      .replace('{channel}', channel)
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
          { role: 'system', content: 'You are a call quality analyst. Respond only with valid JSON. Be thorough in issue detection.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
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

    // Process and validate issue_tags
    const rawIssueTags = analysis.issue_tags || [];
    const issueTags = rawIssueTags
      .filter((tag: string) => VALID_ISSUE_TAGS.includes(tag))
      .slice(0, 5);

    // Determine primary mapped_layer based on most severe issue
    let mappedLayer: string | null = null;
    const layerPriority = ['brain_rules', 'workflow', 'config_toggle', 'business_facts'];
    for (const layer of layerPriority) {
      if (issueTags.some((tag: string) => ISSUE_TO_LAYER_MAP[tag] === layer)) {
        mappedLayer = layer;
        break;
      }
    }

    // Extract action summary
    const actionSummary = analysis.action_summary || {
      booking_attempted: false,
      transfer_attempted: false,
      lead_captured: false,
      callback_scheduled: false
    };

    // Extract recommended fix
    const recommendedFix = analysis.recommended_fix || null;

    console.log(`[analyze-call-quality] Issue tags detected: ${issueTags.join(', ') || 'none'}`);
    console.log(`[analyze-call-quality] Mapped layer: ${mappedLayer || 'none'}`);
    console.log(`[analyze-call-quality] Overall score: ${overallScore}`);

    // Save to database with new fields
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
        // New fields
        vertical_id: verticalId,
        channel: channel,
        config_version: configVersion,
        action_summary: actionSummary,
        issue_tags: issueTags,
        mapped_layer: mappedLayer,
        recommended_fix: recommendedFix,
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

    // Create alert if score is below threshold
    if (overallScore <= LOW_SCORE_THRESHOLD) {
      console.log(`[analyze-call-quality] Low score detected (${overallScore}), creating alert...`);
      
      const alertMessage = `Call scored ${overallScore.toFixed(1)}/10. ` +
        (issueTags.length > 0 ? `Issues: ${issueTags.join(', ')}` : 'Review recommended.');
      
      const { error: alertError } = await supabase
        .from('quality_alerts')
        .insert({
          alert_type: 'low_score',
          severity: overallScore <= 3 ? 'critical' : 'warning',
          customer_id: callData.customer_id,
          call_analysis_id: savedAnalysis.id,
          vertical_id: verticalId,
          channel: channel,
          threshold_value: LOW_SCORE_THRESHOLD,
          actual_value: overallScore,
          message: alertMessage,
          metadata: {
            issue_tags: issueTags,
            mapped_layer: mappedLayer,
            recommended_fix: recommendedFix,
            business_name: callData.customer_profiles?.business_name,
          }
        });

      if (alertError) {
        console.error('Error creating alert:', alertError);
      } else {
        console.log('Low score alert created');
      }
    }

    // Check for compliance risks and create critical alerts
    const complianceRisks = issueTags.filter((tag: string) => 
      tag.startsWith('restricted_advice_risk_') || tag === 'guarantee_language_used'
    );
    
    if (complianceRisks.length > 0) {
      console.log(`[analyze-call-quality] Compliance risk detected: ${complianceRisks.join(', ')}`);
      
      const { error: complianceAlertError } = await supabase
        .from('quality_alerts')
        .insert({
          alert_type: 'compliance_risk',
          severity: 'critical',
          customer_id: callData.customer_id,
          call_analysis_id: savedAnalysis.id,
          vertical_id: verticalId,
          channel: channel,
          message: `Compliance risk detected: ${complianceRisks.join(', ')}. Immediate review required.`,
          metadata: {
            compliance_issues: complianceRisks,
            transcript_summary: analysis.summary,
            business_name: callData.customer_profiles?.business_name,
          }
        });

      if (complianceAlertError) {
        console.error('Error creating compliance alert:', complianceAlertError);
      } else {
        console.log('Compliance risk alert created');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis_id: savedAnalysis.id,
        overall_score: overallScore,
        cost: analysisCost,
        category: analysis.category,
        sentiment: analysis.sentiment,
        issue_tags: issueTags,
        mapped_layer: mappedLayer,
        alerts_created: (overallScore <= LOW_SCORE_THRESHOLD ? 1 : 0) + (complianceRisks.length > 0 ? 1 : 0),
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