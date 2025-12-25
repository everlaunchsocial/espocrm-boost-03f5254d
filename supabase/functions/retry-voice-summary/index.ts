import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { delivery_id } = await req.json();

    if (!delivery_id) {
      return new Response(
        JSON.stringify({ error: 'delivery_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Retrying delivery: ${delivery_id}`);

    // Get the original delivery record
    const { data: originalDelivery, error: fetchError } = await supabase
      .from('summary_deliveries')
      .select('*')
      .eq('id', delivery_id)
      .single();

    if (fetchError || !originalDelivery) {
      console.error('Failed to fetch delivery:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Delivery not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      originalDelivery.user_id
    );

    if (userError || !userData?.user?.email) {
      console.error('Failed to get user email:', userError);
      return new Response(
        JSON.stringify({ error: 'User email not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userEmail = userData.user.email;
    const summaryContent = originalDelivery.summary_content;

    // Attempt to resend email
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'EverLaunch <notifications@send.everlaunch.ai>',
        to: [userEmail],
        subject: 'Your Daily Voice Summary (Retry)',
        html: summaryContent || '<p>Your daily summary is ready.</p>',
      }),
    });

    const newStatus = emailResponse.ok ? 'success' : 'failed';
    const errorMessage = emailResponse.ok ? null : await emailResponse.text();

    console.log(`Retry result: ${newStatus}`, errorMessage);

    // Insert new delivery record for the retry
    const { data: newDelivery, error: insertError } = await supabase
      .from('summary_deliveries')
      .insert({
        user_id: originalDelivery.user_id,
        delivered_at: new Date().toISOString(),
        delivery_method: originalDelivery.delivery_method,
        summary_type: originalDelivery.summary_type,
        status: newStatus,
        error_message: errorMessage,
        summary_content: summaryContent,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to log retry:', insertError);
    }

    return new Response(
      JSON.stringify({ 
        success: newStatus === 'success',
        message: newStatus === 'success' ? 'Summary resent successfully' : 'Retry failed',
        delivery: newDelivery,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in retry-voice-summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
