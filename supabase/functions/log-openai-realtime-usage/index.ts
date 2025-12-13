import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OpenAI Realtime API pricing (per minute)
const COST_PER_MINUTE_INPUT = 0.06;   // $0.06/min for audio input
const COST_PER_MINUTE_OUTPUT = 0.24;  // $0.24/min for audio output

interface OpenAIRealtimeUsageRequest {
  affiliate_id?: string;
  demo_id?: string;
  audio_input_seconds: number;
  audio_output_seconds: number;
  session_id?: string;
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: OpenAIRealtimeUsageRequest = await req.json();
    console.log('Logging OpenAI Realtime usage:', body);

    const {
      affiliate_id,
      demo_id,
      audio_input_seconds,
      audio_output_seconds,
      session_id,
      metadata = {}
    } = body;

    // Calculate cost based on audio duration
    const costInput = (audio_input_seconds / 60) * COST_PER_MINUTE_INPUT;
    const costOutput = (audio_output_seconds / 60) * COST_PER_MINUTE_OUTPUT;
    const totalCost = costInput + costOutput;
    const totalSeconds = audio_input_seconds + audio_output_seconds;

    console.log(`Cost calculation: input=${costInput.toFixed(4)}, output=${costOutput.toFixed(4)}, total=${totalCost.toFixed(4)}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert into service_usage
    const { data, error } = await supabase
      .from('service_usage')
      .insert({
        provider: 'openai',
        model: 'gpt-4o-realtime',
        usage_type: 'web_voice',
        call_type: 'demo', // OpenAI Realtime is only used for demos
        customer_id: null,
        affiliate_id: affiliate_id || null,
        demo_id: demo_id || null,
        duration_seconds: Math.round(totalSeconds / 2), // Average of input/output
        tokens_in: 0, // Not applicable for voice
        tokens_out: 0,
        message_count: 0,
        cost_usd: totalCost,
        cost_breakdown: {
          audio_input_seconds,
          audio_output_seconds,
          input_cost: costInput,
          output_cost: costOutput
        },
        session_id: session_id || null,
        reference_id: null,
        metadata: {
          ...metadata,
          provider_type: 'openai_realtime'
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error inserting service_usage:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to log usage', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('OpenAI Realtime usage logged successfully:', data?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        usage_id: data?.id,
        cost_usd: totalCost,
        duration_seconds: totalSeconds
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in log-openai-realtime-usage:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
