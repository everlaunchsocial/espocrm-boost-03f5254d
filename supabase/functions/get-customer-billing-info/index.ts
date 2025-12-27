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

    console.log("Fetching customer billing info for user:", user.id);

    // Get customer profile
    const { data: customer, error: custError } = await supabase
      .from("customer_profiles")
      .select("id, customer_plan_id, billing_cycle_start, billing_cycle_end, payment_received_at")
      .eq("user_id", user.id)
      .single();

    if (custError || !customer) {
      console.error("Customer not found:", custError);
      return new Response(
        JSON.stringify({ error: "Customer not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get plan details
    let planDetails = null;
    if (customer.customer_plan_id) {
      const { data: plan } = await supabase
        .from("customer_plans")
        .select("id, code, name, monthly_price, minutes_included, overage_rate")
        .eq("id", customer.customer_plan_id)
        .single();
      planDetails = plan;
    }

    // Get subscription from billing_subscriptions
    const { data: subscription } = await supabase
      .from("billing_subscriptions")
      .select("id, stripe_subscription_id, stripe_customer_id, status")
      .eq("customer_id", customer.id)
      .eq("subscription_type", "customer")
      .eq("status", "active")
      .maybeSingle();

    let stripeInfo = {
      paymentMethodLast4: null as string | null,
      paymentMethodBrand: null as string | null,
      paymentMethodExpMonth: null as number | null,
      paymentMethodExpYear: null as number | null,
      nextBillingDate: null as string | null,
      nextBillingAmount: null as number | null,
      currentPeriodStart: null as string | null,
      currentPeriodEnd: null as string | null,
      subscriptionStatus: null as string | null,
      customerId: subscription?.stripe_customer_id || null,
    };

    let invoices: Array<{
      id: string;
      date: string;
      description: string;
      amount: number;
      status: string;
      pdfUrl: string | null;
    }> = [];

    // Fetch details from Stripe if subscription exists
    if (subscription?.stripe_subscription_id) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
        stripeInfo.subscriptionStatus = stripeSub.status;
        stripeInfo.currentPeriodStart = new Date(stripeSub.current_period_start * 1000).toISOString();
        stripeInfo.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();
        stripeInfo.nextBillingDate = new Date(stripeSub.current_period_end * 1000).toISOString();

        // Get upcoming invoice for next billing amount
        try {
          const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
            customer: subscription.stripe_customer_id!,
          });
          stripeInfo.nextBillingAmount = upcomingInvoice.amount_due / 100;
        } catch (upcomingError) {
          console.log("No upcoming invoice found");
        }

        // Get payment method
        if (stripeSub.default_payment_method) {
          const paymentMethod = await stripe.paymentMethods.retrieve(
            stripeSub.default_payment_method as string
          );
          if (paymentMethod.card) {
            stripeInfo.paymentMethodLast4 = paymentMethod.card.last4;
            stripeInfo.paymentMethodBrand = paymentMethod.card.brand;
            stripeInfo.paymentMethodExpMonth = paymentMethod.card.exp_month;
            stripeInfo.paymentMethodExpYear = paymentMethod.card.exp_year;
          }
        } else if (subscription.stripe_customer_id) {
          // Try to get default payment method from customer
          const stripeCustomer = await stripe.customers.retrieve(subscription.stripe_customer_id);
          if (stripeCustomer && !stripeCustomer.deleted && stripeCustomer.invoice_settings?.default_payment_method) {
            const paymentMethod = await stripe.paymentMethods.retrieve(
              stripeCustomer.invoice_settings.default_payment_method as string
            );
            if (paymentMethod.card) {
              stripeInfo.paymentMethodLast4 = paymentMethod.card.last4;
              stripeInfo.paymentMethodBrand = paymentMethod.card.brand;
              stripeInfo.paymentMethodExpMonth = paymentMethod.card.exp_month;
              stripeInfo.paymentMethodExpYear = paymentMethod.card.exp_year;
            }
          }
        }
      } catch (stripeError) {
        console.error("Error fetching Stripe subscription:", stripeError);
      }
    }

    // Fetch invoices from Stripe
    if (subscription?.stripe_customer_id) {
      try {
        const stripeInvoices = await stripe.invoices.list({
          customer: subscription.stripe_customer_id,
          limit: 12,
        });

        invoices = stripeInvoices.data.map((inv: any) => {
          let description = "Monthly Subscription";
          if (inv.lines.data.length > 0) {
            const firstLine = inv.lines.data[0];
            if (firstLine.description) {
              description = firstLine.description;
            } else if (firstLine.price?.nickname) {
              description = firstLine.price.nickname;
            }
          }
          // Check for setup fee
          const hasSetupFee = inv.lines.data.some(
            (line: any) => line.description?.toLowerCase().includes("setup")
          );
          if (hasSetupFee) {
            description = "Setup Fee + Monthly Subscription";
          }

          return {
            id: inv.id,
            date: new Date(inv.created * 1000).toISOString(),
            description,
            amount: inv.amount_paid / 100,
            status: inv.status || "unknown",
            pdfUrl: inv.invoice_pdf,
          };
        });
      } catch (invoiceError) {
        console.error("Error fetching invoices:", invoiceError);
      }
    }

    console.log("Customer billing info retrieved successfully");

    return new Response(
      JSON.stringify({
        success: true,
        customer: {
          id: customer.id,
          paymentReceivedAt: customer.payment_received_at,
        },
        plan: planDetails,
        subscription: {
          ...stripeInfo,
          hasActiveSubscription: !!subscription?.stripe_subscription_id,
        },
        invoices,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error fetching customer billing info:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch billing info";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
