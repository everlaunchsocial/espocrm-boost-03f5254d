import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClassifyRequest {
  callLogId: string;
  transcript?: string;
  durationSeconds?: number;
  forceRefresh?: boolean;
}

interface CallOutcome {
  outcome: 'connected' | 'no_answer' | 'voicemail_left' | 'callback_requested' | 'answering_machine' | 'inconclusive';
  confidence: number;
  reason: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { callLogId, transcript, durationSeconds, forceRefresh } = await req.json() as ClassifyRequest;

    if (!callLogId) {
      return new Response(JSON.stringify({ error: 'callLogId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get existing call log
    const { data: callLog, error: fetchError } = await supabase
      .from('call_logs')
      .select('*')
      .eq('id', callLogId)
      .single();

    if (fetchError || !callLog) {
      return new Response(JSON.stringify({ error: 'Call log not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already classified and not forcing refresh
    if (callLog.ai_outcome && !forceRefresh) {
      return new Response(JSON.stringify({
        outcome: callLog.ai_outcome,
        confidence: callLog.ai_outcome_confidence,
        reason: callLog.ai_outcome_reason,
        cached: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const transcriptText = transcript || callLog.transcript;
    const duration = durationSeconds ?? callLog.duration_seconds;

    // If no transcript, use duration-based heuristics
    if (!transcriptText || transcriptText.trim().length < 10) {
      let outcome: CallOutcome;
      
      if (!duration || duration < 5) {
        outcome = {
          outcome: 'no_answer',
          confidence: 0.7,
          reason: 'Very short or no call duration detected',
        };
      } else if (duration < 15) {
        outcome = {
          outcome: 'inconclusive',
          confidence: 0.5,
          reason: 'Brief call with no transcript available',
        };
      } else {
        outcome = {
          outcome: 'connected',
          confidence: 0.6,
          reason: 'Call duration suggests connection, but no transcript to verify',
        };
      }

      // Save to database
      await supabase
        .from('call_logs')
        .update({
          ai_outcome: outcome.outcome,
          ai_outcome_confidence: outcome.confidence,
          ai_outcome_reason: outcome.reason,
        })
        .eq('id', callLogId);

      return new Response(JSON.stringify(outcome), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to classify the call
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are a call outcome classifier. Analyze the call transcript and classify the outcome.

POSSIBLE OUTCOMES:
- connected: Agent successfully spoke with the lead/contact
- no_answer: Call was not answered, no voicemail left
- voicemail_left: Agent left a voicemail message
- callback_requested: Lead asked to be called back at another time
- answering_machine: Detected automated system, IVR, or auto-attendant
- inconclusive: Call dropped, unclear audio, or cannot determine outcome

RESPONSE FORMAT (JSON only):
{
  "outcome": "one of the outcomes above",
  "confidence": 0.0 to 1.0,
  "reason": "Brief explanation of why this outcome was chosen"
}

Consider:
- Call duration: ${duration ? `${duration} seconds` : 'unknown'}
- Voicemail indicators: "leave a message", "beep", "voicemail"
- Callback phrases: "call back", "try later", "busy right now"
- IVR indicators: "press 1", "menu options", "automated"
- Conversation flow: two-way dialogue suggests connected call`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Classify this call transcript:\n\n${transcriptText.substring(0, 3000)}` }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      return new Response(JSON.stringify({ error: 'AI classification failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse AI response
    let outcome: CallOutcome;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        outcome = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch {
      outcome = {
        outcome: 'inconclusive',
        confidence: 0.3,
        reason: 'Could not parse AI response',
      };
    }

    // Validate outcome
    const validOutcomes = ['connected', 'no_answer', 'voicemail_left', 'callback_requested', 'answering_machine', 'inconclusive'];
    if (!validOutcomes.includes(outcome.outcome)) {
      outcome.outcome = 'inconclusive';
    }

    // Save to database
    await supabase
      .from('call_logs')
      .update({
        ai_outcome: outcome.outcome,
        ai_outcome_confidence: outcome.confidence,
        ai_outcome_reason: outcome.reason,
      })
      .eq('id', callLogId);

    console.log(`Classified call ${callLogId} as ${outcome.outcome} with ${outcome.confidence} confidence`);

    return new Response(JSON.stringify(outcome), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error classifying call outcome:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
