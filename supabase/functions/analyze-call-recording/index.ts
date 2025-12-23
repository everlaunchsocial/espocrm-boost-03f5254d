import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CallAnalysisRequest {
  recordingId: string;
  transcriptText: string;
  durationSeconds: number;
  leadName?: string;
  leadCompany?: string;
}

interface CallMoment {
  moment_type: string;
  timestamp_seconds: number;
  transcript_excerpt: string;
  ai_commentary: string;
  importance_level: string;
}

interface CoachingInsight {
  insight_category: string;
  strength_or_weakness: string;
  insight_text: string;
  specific_example?: string;
  recommendation?: string;
}

interface AIAnalysis {
  summary: string;
  key_topics: string[];
  objections_raised: Array<{
    objection: string;
    timestamp: number;
    how_handled: string;
    recommended_response: string;
  }>;
  buying_signals: Array<{
    signal: string;
    timestamp: number;
    strength: string;
  }>;
  competitor_mentions: string[];
  next_steps_discussed: string[];
  call_outcome: string;
  talk_ratio: {
    rep: number;
    prospect: number;
    ideal: string;
  };
  questions_asked: {
    rep: number;
    prospect: number;
    quality_score: number;
  };
  sentiment_progression: Array<{
    time: number;
    sentiment: number;
  }>;
  strengths: string[];
  weaknesses: string[];
  overall_quality_score: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { recordingId, transcriptText, durationSeconds, leadName, leadCompany }: CallAnalysisRequest = await req.json();

    if (!recordingId || !transcriptText) {
      return new Response(
        JSON.stringify({ error: 'recordingId and transcriptText are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing call recording ${recordingId}`);

    // Use Lovable AI API for analysis
    const systemPrompt = `You are an expert sales call analyst. Analyze the following sales call transcript and provide detailed insights.

Return your analysis as JSON with this exact structure:
{
  "summary": "Brief 2-3 sentence summary of the call",
  "key_topics": ["topic1", "topic2"],
  "objections_raised": [
    {
      "objection": "The objection text",
      "timestamp": 0,
      "how_handled": "well/poorly/neutral",
      "recommended_response": "Suggestion for better handling"
    }
  ],
  "buying_signals": [
    {
      "signal": "The buying signal",
      "timestamp": 0,
      "strength": "weak/moderate/strong"
    }
  ],
  "competitor_mentions": ["competitor names mentioned"],
  "next_steps_discussed": ["action items discussed"],
  "call_outcome": "positive/negative/neutral/follow_up_scheduled/closed_won/closed_lost",
  "talk_ratio": {
    "rep": 50,
    "prospect": 50,
    "ideal": "40/60"
  },
  "questions_asked": {
    "rep": 0,
    "prospect": 0,
    "quality_score": 0
  },
  "sentiment_progression": [
    {"time": 0, "sentiment": 0.5}
  ],
  "strengths": ["What the rep did well"],
  "weaknesses": ["Areas for improvement"],
  "overall_quality_score": 75
}

Timestamps should be estimated based on the transcript position (assume even distribution across the call duration of ${durationSeconds} seconds).
Quality score should be 0-100 based on: rapport building, discovery questions, objection handling, closing attempts, and listening skills.`;

    const userPrompt = `Analyze this sales call transcript:

${leadName ? `Lead: ${leadName}` : ''}
${leadCompany ? `Company: ${leadCompany}` : ''}
Duration: ${Math.round(durationSeconds / 60)} minutes

TRANSCRIPT:
${transcriptText}

Provide your analysis as JSON.`;

    let analysis: AIAnalysis;

    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 4000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', errorText);
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      let content = data.choices[0]?.message?.content || '';
      
      // Clean markdown if present
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(content);
    } catch (aiError) {
      console.error('AI analysis failed, using fallback:', aiError);
      // Fallback analysis
      analysis = generateFallbackAnalysis(transcriptText, durationSeconds);
    }

    // Update call_recordings with analysis
    const { error: updateError } = await supabase
      .from('call_recordings')
      .update({
        ai_analysis: analysis,
        call_quality_score: analysis.overall_quality_score,
      })
      .eq('id', recordingId);

    if (updateError) {
      console.error('Error updating recording:', updateError);
    }

    // Create call_moments from analysis
    const moments: CallMoment[] = [];

    // Add objections as moments
    for (const obj of analysis.objections_raised || []) {
      moments.push({
        moment_type: 'objection',
        timestamp_seconds: obj.timestamp || 0,
        transcript_excerpt: obj.objection,
        ai_commentary: `Handled ${obj.how_handled}. ${obj.recommended_response}`,
        importance_level: obj.how_handled === 'poorly' ? 'high' : 'medium',
      });
    }

    // Add buying signals as moments
    for (const signal of analysis.buying_signals || []) {
      moments.push({
        moment_type: 'buying_signal',
        timestamp_seconds: signal.timestamp || 0,
        transcript_excerpt: signal.signal,
        ai_commentary: `${signal.strength} buying signal detected`,
        importance_level: signal.strength === 'strong' ? 'critical' : signal.strength === 'moderate' ? 'high' : 'medium',
      });
    }

    // Add competitor mentions as moments
    for (const competitor of analysis.competitor_mentions || []) {
      moments.push({
        moment_type: 'competitor_mention',
        timestamp_seconds: Math.floor(durationSeconds / 2), // Estimate middle of call
        transcript_excerpt: `Mentioned competitor: ${competitor}`,
        ai_commentary: 'Consider using battle card for competitive response',
        importance_level: 'medium',
      });
    }

    // Insert moments
    if (moments.length > 0) {
      const momentsWithRecording = moments.map(m => ({ ...m, recording_id: recordingId }));
      const { error: momentsError } = await supabase
        .from('call_moments')
        .insert(momentsWithRecording);

      if (momentsError) {
        console.error('Error inserting moments:', momentsError);
      }
    }

    // Create coaching insights
    const insights: CoachingInsight[] = [];

    // Talk ratio insight
    const talkRatio = analysis.talk_ratio || { rep: 50, prospect: 50 };
    if (talkRatio.rep > 60) {
      insights.push({
        insight_category: 'talk_ratio',
        strength_or_weakness: 'weakness',
        insight_text: `Talk ratio was ${talkRatio.rep}/${talkRatio.prospect} - rep talked too much`,
        recommendation: 'Ask more open-ended questions and practice active listening',
      });
    } else if (talkRatio.rep < 45) {
      insights.push({
        insight_category: 'talk_ratio',
        strength_or_weakness: 'strength',
        insight_text: `Excellent talk ratio of ${talkRatio.rep}/${talkRatio.prospect} - good listening`,
      });
    }

    // Question quality insight
    const questions = analysis.questions_asked || { rep: 0, quality_score: 0 };
    if (questions.quality_score >= 80) {
      insights.push({
        insight_category: 'question_quality',
        strength_or_weakness: 'strength',
        insight_text: 'Asked high-quality discovery questions',
        specific_example: `Asked ${questions.rep} strategic questions`,
      });
    } else if (questions.quality_score < 60) {
      insights.push({
        insight_category: 'question_quality',
        strength_or_weakness: 'opportunity',
        insight_text: 'Question quality could be improved',
        recommendation: 'Focus on open-ended questions that uncover pain points',
      });
    }

    // Add strengths
    for (const strength of analysis.strengths || []) {
      insights.push({
        insight_category: 'discovery',
        strength_or_weakness: 'strength',
        insight_text: strength,
      });
    }

    // Add weaknesses
    for (const weakness of analysis.weaknesses || []) {
      insights.push({
        insight_category: 'objection_handling',
        strength_or_weakness: 'weakness',
        insight_text: weakness,
      });
    }

    // Fetch caller's affiliate_id for coaching insights
    const { data: recording } = await supabase
      .from('call_recordings')
      .select('caller_id')
      .eq('id', recordingId)
      .single();

    // Insert coaching insights
    if (insights.length > 0 && recording?.caller_id) {
      const insightsWithIds = insights.map(i => ({
        ...i,
        recording_id: recordingId,
        affiliate_id: recording.caller_id,
      }));

      const { error: insightsError } = await supabase
        .from('coaching_insights')
        .insert(insightsWithIds);

      if (insightsError) {
        console.error('Error inserting insights:', insightsError);
      }
    }

    console.log(`Analysis complete for recording ${recordingId}. Quality score: ${analysis.overall_quality_score}`);

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        momentsCreated: moments.length,
        insightsCreated: insights.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in analyze-call-recording:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateFallbackAnalysis(transcript: string, duration: number): AIAnalysis {
  const words = transcript.split(/\s+/).length;
  const sentences = transcript.split(/[.!?]+/).length;
  const questions = (transcript.match(/\?/g) || []).length;
  
  // Simple keyword detection
  const hasObjection = /expensive|cost|price|too much|budget/i.test(transcript);
  const hasBuyingSignal = /when can|how soon|start|sign|contract|deal/i.test(transcript);
  const hasCompetitor = /competitor|other option|alternative|callrail|dialpad/i.test(transcript);
  
  return {
    summary: `Call lasted ${Math.round(duration / 60)} minutes with ${sentences} exchanges.`,
    key_topics: ['discovery', 'product', 'pricing'],
    objections_raised: hasObjection ? [{
      objection: 'Price or budget concern detected',
      timestamp: Math.floor(duration * 0.3),
      how_handled: 'neutral',
      recommended_response: 'Use ROI calculator to demonstrate value',
    }] : [],
    buying_signals: hasBuyingSignal ? [{
      signal: 'Interest in timeline or next steps',
      timestamp: Math.floor(duration * 0.7),
      strength: 'moderate',
    }] : [],
    competitor_mentions: hasCompetitor ? ['Unknown competitor'] : [],
    next_steps_discussed: ['Follow up required'],
    call_outcome: 'follow_up_scheduled',
    talk_ratio: { rep: 50, prospect: 50, ideal: '40/60' },
    questions_asked: { rep: Math.floor(questions / 2), prospect: Math.floor(questions / 2), quality_score: 70 },
    sentiment_progression: [
      { time: 0, sentiment: 0.5 },
      { time: Math.floor(duration / 2), sentiment: 0.6 },
      { time: duration, sentiment: 0.7 },
    ],
    strengths: ['Completed the call successfully'],
    weaknesses: ['Consider asking more discovery questions'],
    overall_quality_score: 70,
  };
}
