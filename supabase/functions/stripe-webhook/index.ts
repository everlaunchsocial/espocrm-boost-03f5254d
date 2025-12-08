import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeSecretKey || !webhookSecret) {
    console.error("Missing Stripe configuration");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
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
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout session completed:", session.id);

        const customerId = session.metadata?.customer_id;
        const planId = session.metadata?.plan_id;
        const affiliateId = session.metadata?.affiliate_id;
        const customerName = session.metadata?.customer_name;
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;

        if (!customerId) {
          console.error("No customer_id in session metadata");
          break;
        }

        // Update customer profile with Stripe info
        const { error: profileError } = await supabase
          .from("customer_profiles")
          .update({
            customer_plan_id: planId,
          })
          .eq("id", customerId);

        if (profileError) {
          console.error("Error updating customer profile:", profileError);
        }

        // Update billing subscription
        const { error: subError } = await supabase
          .from("billing_subscriptions")
          .update({
            status: "active",
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
          })
          .eq("customer_id", customerId)
          .eq("subscription_type", "customer");

        if (subError) {
          console.error("Error updating billing subscription:", subError);
        }

        // Distribute commissions if affiliate attached
        if (affiliateId) {
          // Get plan setup fee for commission calculation
          const { data: planData } = await supabase
            .from("customer_plans")
            .select("setup_fee")
            .eq("id", planId)
            .single();

          if (planData?.setup_fee) {
            const { error: commError } = await supabase.rpc("distribute_commissions", {
              p_customer_id: customerId,
              p_gross_amount: Number(planData.setup_fee),
              p_event_type: "customer_signup",
            });

            if (commError) {
              console.error("Error distributing commissions:", commError);
            } else {
              console.log("Commissions distributed for customer:", customerId);
            }
          }
        }

        // Find or create a lead for this purchase, then set pipeline_status = 'customer_won'
        const customerEmail = session.customer_email || session.customer_details?.email;
        if (customerEmail) {
          try {
            // First, try to find an existing lead by email (and optionally affiliate)
            let leadQuery = supabase
              .from("leads")
              .select("id, pipeline_status")
              .ilike("email", customerEmail)
              .order("created_at", { ascending: false })
              .limit(1);

            // If we have an affiliate, prefer leads for that affiliate
            if (affiliateId) {
              const { data: affiliateLead } = await supabase
                .from("leads")
                .select("id, pipeline_status")
                .eq("affiliate_id", affiliateId)
                .ilike("email", customerEmail)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

              if (affiliateLead) {
                // Found a lead for this affiliate + email
                if (affiliateLead.pipeline_status !== 'lost_closed') {
                  await supabase
                    .from("leads")
                    .update({ pipeline_status: 'customer_won' })
                    .eq("id", affiliateLead.id);
                  console.log("Updated existing affiliate lead to customer_won:", affiliateLead.id);
                }
              } else {
                // No lead found for this affiliate, check for any lead with this email
                const { data: anyLead } = await leadQuery.single();

                if (anyLead && anyLead.pipeline_status !== 'lost_closed') {
                  await supabase
                    .from("leads")
                    .update({ pipeline_status: 'customer_won' })
                    .eq("id", anyLead.id);
                  console.log("Updated existing lead to customer_won:", anyLead.id);
                } else if (!anyLead) {
                  // No lead exists at all - create one
                  const nameParts = (customerName || "").split(" ");
                  const firstName = nameParts[0] || "Customer";
                  const lastName = nameParts.slice(1).join(" ") || "";

                  const { data: newLead, error: createError } = await supabase
                    .from("leads")
                    .insert({
                      first_name: firstName,
                      last_name: lastName,
                      email: customerEmail,
                      source: "checkout",
                      affiliate_id: affiliateId || null,
                      pipeline_status: "customer_won",
                    })
                    .select("id")
                    .single();

                  if (createError) {
                    console.error("Error creating lead for checkout:", createError);
                  } else {
                    console.log("Created new lead from checkout with customer_won status:", newLead?.id);
                  }
                }
              }
            } else {
              // No affiliate - check for any lead with this email
              const { data: anyLead } = await leadQuery.single();

              if (anyLead && anyLead.pipeline_status !== 'lost_closed') {
                await supabase
                  .from("leads")
                  .update({ pipeline_status: 'customer_won' })
                  .eq("id", anyLead.id);
                console.log("Updated existing lead to customer_won:", anyLead.id);
              } else if (!anyLead) {
                // No lead exists - create one (corporate sale with no affiliate)
                const nameParts = (customerName || "").split(" ");
                const firstName = nameParts[0] || "Customer";
                const lastName = nameParts.slice(1).join(" ") || "";

                const { data: newLead, error: createError } = await supabase
                  .from("leads")
                  .insert({
                    first_name: firstName,
                    last_name: lastName,
                    email: customerEmail,
                    source: "checkout",
                    pipeline_status: "customer_won",
                  })
                  .select("id")
                  .single();

                if (createError) {
                  console.error("Error creating lead for checkout:", createError);
                } else {
                  console.log("Created new lead from corporate checkout with customer_won status:", newLead?.id);
                }
              }
            }
          } catch (leadError) {
            // Log but don't break the main flow
            console.error("Error handling lead for checkout:", leadError);
          }
        }

        console.log("Customer activation complete for:", customerId);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Subscription updated:", subscription.id);

        // Update subscription status
        const status = subscription.status === "active" ? "active" : subscription.status;
        
        const { error } = await supabase
          .from("billing_subscriptions")
          .update({ status })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("Error updating subscription status:", error);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Subscription cancelled:", subscription.id);

        const { error } = await supabase
          .from("billing_subscriptions")
          .update({ status: "cancelled" })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("Error updating cancelled subscription:", error);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Invoice payment succeeded:", invoice.id);

        // For recurring payments, could trigger monthly commissions here
        // Currently just logging - implement recurring commission logic if needed
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Invoice payment failed:", invoice.id);

        // Could update subscription status or notify customer
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
