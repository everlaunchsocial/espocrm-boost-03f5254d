import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  planCode: string;
  userId: string;
  email: string;
  username: string;
  sponsorId?: string | null;
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
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if Stripe is configured
    if (!stripeSecretKey) {
      console.log("Stripe not configured - returning friendly error");
      return new Response(
        JSON.stringify({ 
          error: "Stripe checkout is not configured yet. Please choose the free plan or contact support.",
          stripe_not_configured: true
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { planCode, userId, email, username, sponsorId }: CheckoutRequest = await req.json();

    console.log("Checkout request:", { planCode, userId, email, username, sponsorId });

    // Validate plan exists and is paid
    const { data: plan, error: planError } = await supabase
      .from("affiliate_plans")
      .select("*")
      .eq("code", planCode)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: "Invalid plan selected" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (plan.monthly_price <= 0) {
      return new Response(
        JSON.stringify({ error: "This plan does not require payment" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check for Stripe price ID
    const stripePriceId = plan.stripe_price_id;
    if (!stripePriceId) {
      console.log(`No Stripe price ID configured for plan: ${planCode}`);
      return new Response(
        JSON.stringify({ 
          error: "This plan is not available for purchase yet. Please contact support.",
          price_not_configured: true
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get base URL for redirects
    // Use the request origin, or fallback to the referer header's origin, or the staging domain
    const referer = req.headers.get("referer");
    const refererOrigin = referer ? new URL(referer).origin : null;
    const origin = req.headers.get("origin") || refererOrigin || "https://espocrm-boost.lovable.app";

    // Dynamic import of Stripe
    const Stripe = (await import("https://esm.sh/stripe@14.14.0")).default;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/affiliate-signup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/affiliate-signup`,
      client_reference_id: userId,
      customer_email: email,
      metadata: {
        user_id: userId,
        plan_code: planCode,
        username,
        affiliate_plan_id: plan.id,
        sponsor_affiliate_id: sponsorId || "",
      },
    });

    console.log("Checkout session created:", session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
