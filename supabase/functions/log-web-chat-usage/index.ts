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
  // Original chat fields
  customer_id?: string;
  affiliate_id?: string;
  demo_id?: string;
  usage_type?: 'web_chat' | 'preview_chat' | 'customer_voice_preview';
  call_type?: 'customer' | 'demo' | 'preview';
  messages_sent?: number;
  tokens_input?: number;
  tokens_output?: number;
  session_id?: string;
  metadata?: Record<string, unknown>;
  
  // Direct voice/cost fields (alternative format)
  customerId?: string;
  usageType?: string;
  callType?: string;
  durationSeconds?: number;
  costUsd?: number;
  provider?: string;
  model?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: WebChatUsageRequest = await req.json();
    console.log('Logging usage:', body);

    // Support both payload formats (snake_case and camelCase)
    const customerId = body.customer_id || body.customerId || null;
    const affiliateId = body.affiliate_id || null;
    const demoId = body.demo_id || null;
    const usageType = body.usage_type || body.usageType || 'web_chat';
    const callType = body.call_type || body.callType || 'preview';
    const messagesSent = body.messages_sent || 0;
    const tokensInput = body.tokens_input || 0;
    const tokensOutput = body.tokens_output || 0;
    const durationSeconds = body.durationSeconds || 0;
    const sessionId = body.session_id || null;
    const metadata = body.metadata || {};
    const directCost = body.costUsd;
    const directProvider = body.provider || 'lovable_ai';
    const directModel = body.model || 'gemini-2.5-flash';

    // Calculate cost - use direct cost if provided, otherwise calculate from tokens
    let totalCost: number;
    let costBreakdown: Record<string, number>;

    if (directCost !== undefined && directCost > 0) {
      // Direct cost provided (e.g., voice preview)
      totalCost = directCost;
      costBreakdown = { direct_cost: directCost };
    } else {
      // Calculate from tokens
      const costInput = (tokensInput / 1_000_000) * COST_PER_MILLION_INPUT_TOKENS;
      const costOutput = (tokensOutput / 1_000_000) * COST_PER_MILLION_OUTPUT_TOKENS;
      totalCost = costInput + costOutput;
      costBreakdown = {
        input_tokens: tokensInput,
        output_tokens: tokensOutput,
        input_cost: costInput,
        output_cost: costOutput
      };
    }

    console.log(`Cost: $${totalCost.toFixed(6)}, Type: ${usageType}, CallType: ${callType}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert into service_usage
    const { data, error } = await supabase
      .from('service_usage')
      .insert({
        provider: directProvider,
        model: directModel,
        usage_type: usageType,
        call_type: callType,
        customer_id: customerId,
        affiliate_id: affiliateId,
        demo_id: demoId,
        duration_seconds: durationSeconds,
        tokens_in: tokensInput,
        tokens_out: tokensOutput,
        message_count: messagesSent,
        cost_usd: totalCost,
        cost_breakdown: costBreakdown,
        session_id: sessionId,
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
