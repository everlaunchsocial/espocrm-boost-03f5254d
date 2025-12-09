import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SuccessRequest {
  session_id: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Stripe not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { session_id }: SuccessRequest = await req.json();

    if (!session_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing session ID" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Verifying session:", session_id);

    // Dynamic import of Stripe
    const Stripe = (await import("https://esm.sh/stripe@14.14.0")).default;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription"],
    });

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ success: false, error: "Payment not completed" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = session.client_reference_id;
    const planCode = session.metadata?.plan_code;
    const username = session.metadata?.username;
    const affiliatePlanId = session.metadata?.affiliate_plan_id;
    const sponsorAffiliateId = session.metadata?.sponsor_affiliate_id || null;
    const customerId = session.customer as string;
    const subscriptionId = (session.subscription as any)?.id || session.subscription;

    console.log("Session verified:", { userId, planCode, username, affiliatePlanId, sponsorAffiliateId });

    if (!userId || !planCode || !affiliatePlanId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required metadata" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from("affiliate_plans")
      .select("*")
      .eq("id", affiliatePlanId)
      .single();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid plan" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Calculate credits - null for unlimited (-1 or null)
    const creditsBalance = plan.demo_credits_per_month === null || plan.demo_credits_per_month === -1
      ? null
      : plan.demo_credits_per_month;
    const resetAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Check if affiliate already exists
    const { data: existingAffiliate } = await supabase
      .from("affiliates")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    let affiliateId: string;

    if (existingAffiliate) {
      // Update existing affiliate
      const { error: updateError } = await supabase
        .from("affiliates")
        .update({
          affiliate_plan_id: affiliatePlanId,
          demo_credits_balance: creditsBalance,
          demo_credits_reset_at: resetAt,
          parent_affiliate_id: sponsorAffiliateId || null,
        })
        .eq("id", existingAffiliate.id);

      if (updateError) throw updateError;
      affiliateId = existingAffiliate.id;
      console.log("Updated existing affiliate:", affiliateId);
    } else {
      // Create new affiliate
      const { data: newAffiliate, error: insertError } = await supabase
        .from("affiliates")
        .insert({
          user_id: userId,
          username: username || `user_${userId.substring(0, 8)}`,
          affiliate_plan_id: affiliatePlanId,
          demo_credits_balance: creditsBalance,
          demo_credits_reset_at: resetAt,
          parent_affiliate_id: sponsorAffiliateId || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      affiliateId = newAffiliate.id;
      console.log("Created new affiliate:", affiliateId);
    }

    // Ensure profile exists with affiliate role
    await supabase
      .from("profiles")
      .upsert({
        user_id: userId,
        global_role: "affiliate",
      }, { onConflict: "user_id" });

    // Populate genealogy
    const { error: genealogyError } = await supabase.rpc('populate_genealogy_for_affiliate', {
      p_affiliate_id: affiliateId,
    });

    if (genealogyError) {
      console.error("Error populating genealogy:", genealogyError);
      // Don't fail the whole request for this
    } else {
      console.log("Genealogy populated for affiliate:", affiliateId);
    }

    // Create billing subscription record
    const { error: subError } = await supabase
      .from("billing_subscriptions")
      .insert({
        affiliate_id: affiliateId,
        subscription_type: "affiliate",
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan_id: planCode,
        status: "active",
      });

    if (subError) {
      console.error("Error creating subscription record:", subError);
      // Don't fail the whole request for this
    }

    // Log payment completed event for analytics
    const email = session.customer_details?.email || session.metadata?.email || null;
    await supabase.from("signup_events").insert({
      email: email,
      username: username,
      plan: planCode,
      referrer: sponsorAffiliateId ? "has_sponsor" : null,
      event_name: "payment_completed",
      step: "payment",
    });

    // Log account created event
    await supabase.from("signup_events").insert({
      email: email,
      username: username,
      plan: planCode,
      referrer: sponsorAffiliateId ? "has_sponsor" : null,
      event_name: "account_created",
      step: "complete",
    });

    console.log("Affiliate setup complete:", affiliateId);

    return new Response(
      JSON.stringify({ success: true, affiliateId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Success handler error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
