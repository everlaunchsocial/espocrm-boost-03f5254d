import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lovable AI Gateway (Gemini 2.5 Flash) pricing
const COST_PER_MILLION_INPUT_TOKENS = 0.075;  // $0.075 per million input tokens
const COST_PER_MILLION_OUTPUT_TOKENS = 0.30;  // $0.30 per million output tokens

interface WebChatUsageRequest {
  customer_id?: string;
  affiliate_id?: string;
  demo_id?: string;
  usage_type: 'web_chat' | 'preview_chat';
  call_type: 'customer' | 'demo' | 'preview';
  messages_sent: number;
  tokens_input: number;
  tokens_output: number;
  session_id?: string;
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: WebChatUsageRequest = await req.json();
    console.log('Logging web chat usage:', body);

    const {
      customer_id,
      affiliate_id,
      demo_id,
      usage_type,
      call_type,
      messages_sent,
      tokens_input,
      tokens_output,
      session_id,
      metadata = {}
    } = body;

    // Calculate cost based on token usage
    const costInput = (tokens_input / 1_000_000) * COST_PER_MILLION_INPUT_TOKENS;
    const costOutput = (tokens_output / 1_000_000) * COST_PER_MILLION_OUTPUT_TOKENS;
    const totalCost = costInput + costOutput;

    console.log(`Cost calculation: input=${costInput.toFixed(6)}, output=${costOutput.toFixed(6)}, total=${totalCost.toFixed(6)}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert into service_usage
    const { data, error } = await supabase
      .from('service_usage')
      .insert({
        provider: 'lovable_ai',
        model: 'gemini-2.5-flash',
        usage_type,
        call_type,
        customer_id: customer_id || null,
        affiliate_id: affiliate_id || null,
        demo_id: demo_id || null,
        duration_seconds: 0, // Not applicable for chat
        tokens_in: tokens_input,
        tokens_out: tokens_output,
        message_count: messages_sent,
        cost_usd: totalCost,
        cost_breakdown: {
          input_tokens: tokens_input,
          output_tokens: tokens_output,
          input_cost: costInput,
          output_cost: costOutput
        },
        session_id: session_id || null,
        reference_id: null,
        metadata
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

    console.log('Web chat usage logged successfully:', data?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        usage_id: data?.id,
        cost_usd: totalCost 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in log-web-chat-usage:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
