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
  successUrl: string;
  cancelUrl: string;
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
    const { planId, customerId, affiliateId, customerEmail, customerName, businessName, websiteUrl, successUrl, cancelUrl } = body;

    console.log("Creating checkout session for customer:", customerId, "plan:", planId, "affiliate:", affiliateId || "none");

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

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Add setup fee if present
    if (plan.stripe_setup_price_id && plan.setup_fee > 0) {
      lineItems.push({
        price: plan.stripe_setup_price_id,
        quantity: 1,
      });
    }

    // Add monthly subscription
    lineItems.push({
      price: plan.stripe_price_id,
      quantity: 1,
    });

    // Calculate next billing date (30 days from now)
    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 30);
    const formattedDate = nextBillingDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });

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
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        description: `Setup fee + first month. Your next payment of $${plan.monthly_price}/mo will be charged on ${formattedDate}.`,
        metadata: {
          customer_id: customerId,
          plan_id: planId,
          affiliate_id: affiliateId || "",
        },
      },
      custom_text: {
        submit: {
          message: `Includes one-time setup fee ($${plan.setup_fee}) + first month ($${plan.monthly_price}). Next billing: ${formattedDate}.`,
        },
      },
    });

    console.log("Checkout session created:", session.id);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
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