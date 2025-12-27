import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  planId: string;
  customerId: string;
  affiliateId?: string;
  customerEmail: string;
  customerName: string;
  businessName?: string;
  websiteUrl?: string;
  phone?: string;
  successUrl: string;
  cancelUrl: string;
}

interface BillingConfiguration {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
  setup_fee: number;
  charge_first_month: boolean;
  billing_delay_days: number;
  description: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeSecretKey) {
    console.error("Missing STRIPE_SECRET_KEY");
    return new Response(JSON.stringify({ error: "Stripe not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase configuration");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body: CheckoutRequest = await req.json();
    const { planId, customerId, affiliateId, customerEmail, customerName, businessName, websiteUrl, phone, successUrl, cancelUrl } = body;

    console.log("Creating checkout session for customer:", customerId, "plan:", planId, "affiliate:", affiliateId || "none");

    // Fetch active billing configuration
    const { data: billingConfig, error: configError } = await supabase
      .from("billing_configurations")
      .select("*")
      .eq("is_active", true)
      .single();

    if (configError || !billingConfig) {
      console.error("Billing configuration not found:", configError);
      return new Response(JSON.stringify({ error: "Billing configuration not found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = billingConfig as BillingConfiguration;
    console.log("Using billing configuration:", config.name, "- delay days:", config.billing_delay_days, "charge first month:", config.charge_first_month);

    // Fetch plan details including Stripe price IDs
    const { data: plan, error: planError } = await supabase
      .from("customer_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      console.error("Plan not found:", planError);
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!plan.stripe_price_id) {
      console.error("Plan missing Stripe price ID:", plan.code);
      return new Response(JSON.stringify({ error: "Plan not configured for payment" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build line items based on billing configuration
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Always add setup fee from billing configuration
    if (plan.stripe_setup_price_id && config.setup_fee > 0) {
      lineItems.push({
        price: plan.stripe_setup_price_id,
        quantity: 1,
      });
    }

    // Add monthly subscription only if charge_first_month is true
    if (config.charge_first_month) {
      lineItems.push({
        price: plan.stripe_price_id,
        quantity: 1,
      });
    }

    // Calculate next billing date based on configuration
    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + config.billing_delay_days);
    const formattedDate = nextBillingDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });

    // Build subscription data with trial period if applicable
    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: {
        customer_id: customerId,
        plan_id: planId,
        affiliate_id: affiliateId || "",
        billing_config_name: config.name,
      },
    };

    // If not charging first month, add trial period
    if (!config.charge_first_month && config.billing_delay_days > 0) {
      subscriptionData.trial_period_days = config.billing_delay_days;
      subscriptionData.description = `${config.display_name}: Setup fee paid. Your subscription of $${plan.monthly_price}/mo begins on ${formattedDate}.`;
    } else if (config.charge_first_month) {
      subscriptionData.description = `Setup fee + first month. Your next payment of $${plan.monthly_price}/mo will be charged on ${formattedDate}.`;
    } else {
      subscriptionData.description = `Setup fee paid. Monthly billing begins on ${formattedDate}.`;
    }

    // Build custom text message
    let submitMessage = "";
    if (config.charge_first_month) {
      submitMessage = `Includes one-time setup fee ($${config.setup_fee}) + first month ($${plan.monthly_price}). Next billing: ${formattedDate}.`;
    } else {
      submitMessage = `Setup fee: $${config.setup_fee}. ${config.description.split('.')[0]}. Next billing: ${formattedDate}.`;
    }

    // For subscription mode, we need at least the recurring price
    // If not charging first month, still add the subscription but with trial
    if (!config.charge_first_month) {
      lineItems.push({
        price: plan.stripe_price_id,
        quantity: 1,
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: customerEmail,
      line_items: lineItems,
      metadata: {
        customer_id: customerId,
        plan_id: planId,
        affiliate_id: affiliateId || "",
        customer_name: customerName,
        business_name: businessName || "",
        website_url: websiteUrl || "",
        phone: phone || "",
        billing_config_name: config.name,
        billing_delay_days: String(config.billing_delay_days),
        charge_first_month: String(config.charge_first_month),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: subscriptionData,
      custom_text: {
        submit: {
          message: submitMessage,
        },
      },
    });

    console.log("Checkout session created:", session.id, "with billing config:", config.name);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
        billingConfig: {
          name: config.name,
          displayName: config.display_name,
          setupFee: config.setup_fee,
          chargeFirstMonth: config.charge_first_month,
          billingDelayDays: config.billing_delay_days,
          description: config.description,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Checkout session creation failed:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to create checkout session",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
