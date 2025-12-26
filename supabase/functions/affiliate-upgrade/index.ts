import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
    console.error("Missing required environment variables");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing upgrade for user:", user.id);

    // Get request body
    const { newPlanCode } = await req.json();
    
    if (!newPlanCode || !["basic", "pro", "agency"].includes(newPlanCode)) {
      return new Response(
        JSON.stringify({ error: "Invalid plan code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get affiliate
    const { data: affiliate, error: affError } = await supabase
      .from("affiliates")
      .select("id, affiliate_plan_id, username")
      .eq("user_id", user.id)
      .single();

    if (affError || !affiliate) {
      console.error("Error fetching affiliate:", affError);
      return new Response(
        JSON.stringify({ error: "Affiliate not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current plan details
    const { data: currentPlan, error: currentPlanError } = await supabase
      .from("affiliate_plans")
      .select("id, code, name, monthly_price")
      .eq("id", affiliate.affiliate_plan_id)
      .single();

    if (currentPlanError || !currentPlan) {
      console.error("Error fetching current plan:", currentPlanError);
      return new Response(
        JSON.stringify({ error: "Current plan not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("Current plan:", currentPlan.code);

    // Get target plan
    const { data: newPlan, error: planError } = await supabase
      .from("affiliate_plans")
      .select("id, code, name, monthly_price, stripe_price_id")
      .eq("code", newPlanCode)
      .single();

    if (planError || !newPlan) {
      console.error("Error fetching new plan:", planError);
      return new Response(
        JSON.stringify({ error: "Plan not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newPlan.stripe_price_id) {
      return new Response(
        JSON.stringify({ error: "New plan is not available for subscription" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate upgrade (not downgrade or same)
    const planHierarchy: Record<string, number> = { free: 0, basic: 1, pro: 2, agency: 3 };
    const currentLevel = planHierarchy[currentPlan.code] ?? 0;
    const newLevel = planHierarchy[newPlanCode] ?? 0;

    if (newLevel <= currentLevel) {
      return new Response(
        JSON.stringify({ error: "Cannot downgrade. Contact support for downgrades." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get subscription from billing_subscriptions
    const { data: subscription, error: subError } = await supabase
      .from("billing_subscriptions")
      .select("id, stripe_subscription_id, stripe_customer_id")
      .eq("affiliate_id", affiliate.id)
      .eq("subscription_type", "affiliate")
      .eq("status", "active")
      .single();

    // If no active subscription exists, create a new checkout session
    if (subError || !subscription?.stripe_subscription_id) {
      console.log("No active subscription found - creating new checkout session");
      
      // Determine site URL for redirects - use production URL
      const siteUrl = Deno.env.get("SITE_URL") || "https://tryeverlaunch.com";
      
      // Create Stripe checkout session for the new plan
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: newPlan.stripe_price_id, quantity: 1 }],
        success_url: `${siteUrl}/affiliate/settings?upgrade=success&plan=${newPlanCode}`,
        cancel_url: `${siteUrl}/affiliate/settings?upgrade=cancelled`,
        customer_email: user.email || undefined,
        metadata: {
          user_id: user.id,
          affiliate_id: affiliate.id,
          plan_code: newPlanCode,
          is_upgrade: "true",
          previous_plan: currentPlan.code,
        },
      });

      console.log("Created checkout session:", session.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          requiresCheckout: true,
          checkoutUrl: session.url,
          message: "Redirecting to payment..."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found Stripe subscription:", subscription.stripe_subscription_id);

    // Get the Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    
    if (!stripeSubscription || stripeSubscription.status !== "active") {
      // If subscription exists but is not active, create new checkout
      console.log("Subscription is not active - creating new checkout session");
      
      const siteUrl = Deno.env.get("SITE_URL") || "https://tryeverlaunch.com";
      
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: newPlan.stripe_price_id, quantity: 1 }],
        success_url: `${siteUrl}/affiliate/settings?upgrade=success&plan=${newPlanCode}`,
        cancel_url: `${siteUrl}/affiliate/settings?upgrade=cancelled`,
        customer_email: user.email || undefined,
        metadata: {
          user_id: user.id,
          affiliate_id: affiliate.id,
          plan_code: newPlanCode,
          is_upgrade: "true",
          previous_plan: currentPlan.code,
        },
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          requiresCheckout: true,
          checkoutUrl: session.url,
          message: "Redirecting to payment..."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Updating Stripe subscription to price:", newPlan.stripe_price_id);

    // Update the Stripe subscription with proration
    const updatedSubscription = await stripe.subscriptions.update(stripeSubscription.id, {
      items: [
        {
          id: stripeSubscription.items.data[0].id,
          price: newPlan.stripe_price_id,
        },
      ],
      proration_behavior: "always_invoice",
      metadata: {
        previous_plan: currentPlan.code,
        upgrade_requested_at: new Date().toISOString(),
      },
    });

    console.log("Stripe subscription updated:", updatedSubscription.id);

    // Update affiliate plan in database
    const { error: updateError } = await supabase
      .from("affiliates")
      .update({ 
        affiliate_plan_id: newPlan.id,
        demo_credits_balance: newPlan.code === "agency" ? null : (newPlan as any).demo_credits_per_month
      })
      .eq("id", affiliate.id);

    if (updateError) {
      console.error("Error updating affiliate plan:", updateError);
      // Don't fail - Stripe was already updated, webhook will sync
    }

    // Log plan history
    const { error: historyError } = await supabase
      .from("affiliate_plan_history")
      .insert({
        affiliate_id: affiliate.id,
        old_plan_id: currentPlan.id,
        new_plan_id: newPlan.id,
        old_plan_code: currentPlan.code,
        new_plan_code: newPlan.code,
        stripe_subscription_id: subscription.stripe_subscription_id,
        initiated_by: "user",
      });

    if (historyError) {
      console.error("Error logging plan history:", historyError);
      // Don't fail - this is just audit logging
    }

    console.log("Upgrade complete! From", currentPlan.code, "to", newPlan.code);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully upgraded to ${newPlan.name}`,
        previousPlan: currentPlan.code,
        newPlan: newPlan.code,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Upgrade error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to upgrade plan";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
