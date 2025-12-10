import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching billing info for user:", user.id);

    // Get affiliate and subscription
    const { data: affiliate, error: affError } = await supabase
      .from("affiliates")
      .select("id, affiliate_plan_id, demo_credits_remaining, demo_credits_used_this_month, billing_cycle_start")
      .eq("user_id", user.id)
      .single();

    if (affError || !affiliate) {
      console.error("Affiliate not found:", affError);
      return new Response(
        JSON.stringify({ error: "Affiliate not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current plan details
    let planDetails = null;
    if (affiliate.affiliate_plan_id) {
      const { data: plan } = await supabase
        .from("affiliate_plans")
        .select("id, code, name, monthly_price, demo_credits_per_month")
        .eq("id", affiliate.affiliate_plan_id)
        .single();
      planDetails = plan;
    }

    // Get subscription from billing_subscriptions
    const { data: subscription } = await supabase
      .from("billing_subscriptions")
      .select("id, stripe_subscription_id, stripe_customer_id, status")
      .eq("affiliate_id", affiliate.id)
      .eq("subscription_type", "affiliate")
      .eq("status", "active")
      .maybeSingle();

    let stripeInfo = {
      paymentMethodLast4: null as string | null,
      paymentMethodBrand: null as string | null,
      nextBillingDate: null as string | null,
      subscriptionStatus: null as string | null,
      customerId: subscription?.stripe_customer_id || null,
    };

    // Fetch details from Stripe if subscription exists
    if (subscription?.stripe_subscription_id) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
        stripeInfo.subscriptionStatus = stripeSub.status;
        stripeInfo.nextBillingDate = new Date(stripeSub.current_period_end * 1000).toISOString();

        // Get payment method
        if (stripeSub.default_payment_method) {
          const paymentMethod = await stripe.paymentMethods.retrieve(
            stripeSub.default_payment_method as string
          );
          if (paymentMethod.card) {
            stripeInfo.paymentMethodLast4 = paymentMethod.card.last4;
            stripeInfo.paymentMethodBrand = paymentMethod.card.brand;
          }
        } else if (subscription.stripe_customer_id) {
          // Try to get default payment method from customer
          const customer = await stripe.customers.retrieve(subscription.stripe_customer_id);
          if (customer && !customer.deleted && customer.invoice_settings?.default_payment_method) {
            const paymentMethod = await stripe.paymentMethods.retrieve(
              customer.invoice_settings.default_payment_method as string
            );
            if (paymentMethod.card) {
              stripeInfo.paymentMethodLast4 = paymentMethod.card.last4;
              stripeInfo.paymentMethodBrand = paymentMethod.card.brand;
            }
          }
        }
      } catch (stripeError) {
        console.error("Error fetching Stripe subscription:", stripeError);
      }
    }

    // Get billing history
    const { data: billingHistory } = await supabase
      .from("affiliate_billing_history")
      .select("*")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false })
      .limit(20);

    console.log("Billing info retrieved successfully");

    return new Response(
      JSON.stringify({
        success: true,
        affiliate: {
          id: affiliate.id,
          demoCreditsRemaining: affiliate.demo_credits_remaining,
          demoCreditsUsedThisMonth: affiliate.demo_credits_used_this_month,
          billingCycleStart: affiliate.billing_cycle_start,
        },
        plan: planDetails,
        subscription: {
          ...stripeInfo,
          hasActiveSubscription: !!subscription?.stripe_subscription_id,
        },
        billingHistory: billingHistory || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error fetching billing info:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch billing info";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
