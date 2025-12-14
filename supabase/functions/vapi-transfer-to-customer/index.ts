import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('vapi-transfer-to-customer received:', JSON.stringify(body, null, 2));

    // Extract function call data from Vapi's webhook format
    const message = body.message || body;
    const functionCall = message.functionCall || message.function_call || {};
    const functionName = functionCall.name || '';
    const parameters = functionCall.parameters || {};
    const call = message.call || body.call || {};

    // Only handle route_to_customer_ai function
    if (functionName !== 'route_to_customer_ai') {
      console.log('Unknown function:', functionName);
      return new Response(
        JSON.stringify({ 
          result: { error: 'Unknown function' } 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const businessCode = parameters.business_code || parameters.businessCode || '';
    console.log('Business code received:', businessCode);

    if (!businessCode || businessCode.length !== 4) {
      console.log('Invalid business code format');
      return new Response(
        JSON.stringify({
          result: {
            message: "I'm sorry, that code doesn't appear to be valid. Please provide a 4-digit business code."
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up customer by testing_code
    const { data: customer, error: customerError } = await supabase
      .from('customer_profiles')
      .select('id, business_name')
      .eq('testing_code', businessCode)
      .maybeSingle();

    if (customerError) {
      console.error('Database error:', customerError);
      return new Response(
        JSON.stringify({
          result: {
            message: "I'm sorry, I encountered a technical issue. Please try again."
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!customer) {
      console.log('No customer found for code:', businessCode);
      return new Response(
        JSON.stringify({
          result: {
            message: "I'm sorry, I couldn't find a business with that code. Please check your 4-digit code and try again."
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get customer's Vapi assistant ID
    const { data: phoneRecord, error: phoneError } = await supabase
      .from('customer_phone_numbers')
      .select('vapi_assistant_id')
      .eq('customer_id', customer.id)
      .maybeSingle();

    if (phoneError || !phoneRecord?.vapi_assistant_id) {
      console.log('No assistant found for customer:', customer.id);
      return new Response(
        JSON.stringify({
          result: {
            message: "I'm sorry, this business hasn't set up their AI assistant yet. Please contact them directly."
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Transferring to assistant:', phoneRecord.vapi_assistant_id, 'for customer:', customer.business_name);

    // Return transfer instruction to Vapi
    // The transfer will include metadata marking this as a testing line call
    return new Response(
      JSON.stringify({
        result: {
          transfer: {
            assistantId: phoneRecord.vapi_assistant_id,
            message: `Connecting you to ${customer.business_name || 'the business'}'s AI assistant now. Please hold.`,
            metadata: {
              customer_id: customer.id,
              via_testing_line: true,
              call_type: 'preview',
              original_caller: call.customer?.number || 'unknown'
            }
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in vapi-transfer-to-customer:', error);
    return new Response(
      JSON.stringify({
        result: {
          message: "I'm sorry, something went wrong. Please try again later."
        }
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
