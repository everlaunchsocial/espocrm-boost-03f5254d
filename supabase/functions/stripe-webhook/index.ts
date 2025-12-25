import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
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

        const customerId = session.metadata?.customer_id; // This is auth.users.id
        const planId = session.metadata?.plan_id;
        const affiliateId = session.metadata?.affiliate_id || null;
        const customerName = session.metadata?.customer_name;
        const businessName = session.metadata?.business_name;
        const websiteUrl = session.metadata?.website_url || null;
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;

        if (!customerId) {
          console.error("No customer_id in session metadata");
          break;
        }

        console.log("Processing customer:", customerId, "plan:", planId, "affiliate:", affiliateId);

        // Check if affiliate is a company account (direct sales)
        let isCompanyAccount = false;
        let effectiveAffiliateId = affiliateId;
        let customerSource = 'affiliate';

        if (affiliateId) {
          const { data: affiliateData } = await supabase
            .from("affiliates")
            .select("is_company_account")
            .eq("id", affiliateId)
            .single();
          
          if (affiliateData?.is_company_account) {
            isCompanyAccount = true;
            effectiveAffiliateId = null; // Company sales have null affiliate_id
            customerSource = 'direct';
            console.log("Affiliate is company account - marking as direct sale");
          }
        } else {
          customerSource = 'direct';
        }

        // Get plan details
        const { data: plan, error: planFetchError } = await supabase
          .from("customer_plans")
          .select("minutes_included, overage_rate, name")
          .eq("id", planId)
          .single();

        if (planFetchError) {
          console.error("Error fetching plan:", planFetchError);
        }

        // Calculate billing cycle (30 days)
        const cycleStart = new Date().toISOString().split('T')[0];
        const cycleEndDate = new Date();
        cycleEndDate.setDate(cycleEndDate.getDate() + 30);
        const cycleEnd = cycleEndDate.toISOString().split('T')[0];

        // Check if customer profile already exists
        const { data: existingProfile } = await supabase
          .from("customer_profiles")
          .select("id")
          .eq("user_id", customerId)
          .maybeSingle();

        const isNewCustomerProfile = !existingProfile;

        let customerProfileId: string;

        if (existingProfile) {
          // Update existing profile
          customerProfileId = existingProfile.id;
          console.log("Updating existing customer profile:", customerProfileId);
          
          const updateData: Record<string, unknown> = {
            customer_plan_id: planId,
            billing_cycle_start: cycleStart,
            billing_cycle_end: cycleEnd,
            minutes_included: plan?.minutes_included || 0,
            overage_rate: plan?.overage_rate || 0,
            plan_name: plan?.name || null,
            customer_source: customerSource,
          };
          
          // Set affiliate_id based on company account check
          updateData.affiliate_id = effectiveAffiliateId;
          
          const { error: updateError } = await supabase
            .from("customer_profiles")
            .update(updateData)
            .eq("id", customerProfileId);

          if (updateError) {
            console.error("Error updating customer profile:", updateError);
          }
        } else {
          // CREATE new customer profile
          console.log("Creating new customer profile for user:", customerId);
          
          const { data: newProfile, error: profileError } = await supabase
            .from("customer_profiles")
            .insert({
              user_id: customerId,
              business_name: businessName || null,
              contact_name: customerName || null,
              website_url: websiteUrl || null,
              customer_plan_id: planId,
              affiliate_id: effectiveAffiliateId,
              customer_source: customerSource,
              billing_cycle_start: cycleStart,
              billing_cycle_end: cycleEnd,
              minutes_included: plan?.minutes_included || 0,
              overage_rate: plan?.overage_rate || 0,
              plan_name: plan?.name || null,
              onboarding_stage: "pending_portal_entry",
              onboarding_current_step: 0,
              payment_received_at: new Date().toISOString(),
              lead_email: session.customer_email || session.customer_details?.email || null,
            })
            .select("id")
            .single();

          if (profileError) {
            console.error("Error creating customer profile:", profileError);
            break;
          }
          
          customerProfileId = newProfile.id;
          console.log("Created customer profile:", customerProfileId);
        }
        
        // Also set payment_received_at for existing profiles
        if (existingProfile) {
          await supabase
            .from("customer_profiles")
            .update({ 
              payment_received_at: new Date().toISOString(),
              lead_email: session.customer_email || session.customer_details?.email || null,
            })
            .eq("id", customerProfileId)
            .is("payment_received_at", null);
        }

        // Check if billing subscription exists
        const { data: existingSub } = await supabase
          .from("billing_subscriptions")
          .select("id")
          .eq("customer_id", customerProfileId)
          .eq("subscription_type", "customer")
          .maybeSingle();

        if (existingSub) {
          // Update existing subscription
          const { error: subUpdateError } = await supabase
            .from("billing_subscriptions")
            .update({
              status: "active",
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: stripeSubscriptionId,
              plan_id: planId,
            })
            .eq("id", existingSub.id);

          if (subUpdateError) {
            console.error("Error updating billing subscription:", subUpdateError);
          }
        } else {
          // CREATE new billing subscription
          const { error: subError } = await supabase
            .from("billing_subscriptions")
            .insert({
              customer_id: customerProfileId,
              affiliate_id: affiliateId || null,
              subscription_type: "customer",
              status: "active",
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: stripeSubscriptionId,
              plan_id: planId,
            });

          if (subError) {
            console.error("Error creating billing subscription:", subError);
          } else {
            console.log("Created billing subscription for customer:", customerProfileId);
          }
        }

        // Distribute commissions if affiliate attached (not company account)
        if (effectiveAffiliateId) {
          // Get plan setup fee for commission calculation
          const { data: planData } = await supabase
            .from("customer_plans")
            .select("setup_fee")
            .eq("id", planId)
            .single();

          if (planData?.setup_fee) {
            const { error: commError } = await supabase.rpc("distribute_commissions", {
              p_customer_id: customerProfileId,
              p_gross_amount: Number(planData.setup_fee),
              p_event_type: "customer_signup",
            });

            if (commError) {
              console.error("Error distributing commissions:", commError);
            } else {
              console.log("Commissions distributed for customer:", customerProfileId);
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

        console.log("Customer activation complete for:", customerProfileId);

        // Send welcome email (only on first successful activation)
        try {
          const resendApiKey = Deno.env.get("RESEND_API_KEY");
          const customerEmail = session.customer_email || session.customer_details?.email;

          if (isNewCustomerProfile && resendApiKey && customerEmail) {
            const resend = new Resend(resendApiKey);
            const loginUrl = "https://tryeverlaunch.com/auth";
            const onboardingUrl = "https://tryeverlaunch.com/customer/onboarding/wizard/1";
            
            // Get affiliate username if available
            let affiliateUsername = "";
            if (effectiveAffiliateId) {
              const { data: affData } = await supabase
                .from("affiliates")
                .select("username")
                .eq("id", effectiveAffiliateId)
                .single();
              affiliateUsername = affData?.username || "";
            }

            const subject = "Welcome to EverLaunch! Your Account is Ready";
            const html = `
              <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; max-width: 600px; margin: 0 auto; color: #1f2937;">
                <h1 style="margin: 0 0 16px; font-size: 24px; color: #111827;">Welcome to EverLaunch!</h1>
                <p style="margin: 0 0 20px; font-size: 16px;">Your payment has been processed and your account is ready.</p>
                
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
                  <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase;">YOUR ACCOUNT DETAILS</h3>
                  ${businessName ? `<p style="margin: 0 0 8px;"><strong>Business:</strong> ${businessName}</p>` : ""}
                  <p style="margin: 0 0 8px;"><strong>Email:</strong> ${customerEmail}</p>
                  <p style="margin: 0;"><strong>Login:</strong> <a href="${loginUrl}" style="color: #2563eb;">${loginUrl}</a></p>
                </div>
                
                <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
                  <p style="margin: 0; font-size: 15px; color: #92400e;">
                    <strong>⚠️ IMPORTANT - Complete Your Setup:</strong><br>
                    You need to finish setting up your account to activate your AI receptionist. This takes about 5 minutes.
                  </p>
                </div>
                
                <p style="text-align: center; margin: 0 0 24px;">
                  <a href="${onboardingUrl}" style="display: inline-block; background: #111827; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Complete Setup Now</a>
                </p>
                
                <div style="margin: 0 0 24px;">
                  <p style="margin: 0 0 8px; font-weight: 600;">What happens during setup:</p>
                  <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
                    <li>Connect your business phone number</li>
                    <li>Set your business hours and services</li>
                    <li>Customize your AI's responses</li>
                    <li>Test your AI receptionist</li>
                  </ul>
                </div>
                
                <p style="margin: 0 0 24px; color: #dc2626; font-weight: 500;">Until setup is complete, your AI cannot answer calls.</p>
                
                ${affiliateUsername ? `<p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">Questions? Your affiliate partner <strong>@${affiliateUsername}</strong> can help, or email us at <a href="mailto:support@everlaunch.ai" style="color: #2563eb;">support@everlaunch.ai</a></p>` : `<p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">Questions? Email us at <a href="mailto:support@everlaunch.ai" style="color: #2563eb;">support@everlaunch.ai</a></p>`}
                
                <p style="margin: 0; color: #374151;">Welcome aboard!<br><strong>- The EverLaunch Team</strong></p>
              </div>
            `;

            const sendResult = await resend.emails.send({
              from: "EverLaunch <info@send.everlaunch.ai>",
              to: [customerEmail],
              subject,
              html,
            });

            if ((sendResult as any)?.error) {
              console.error("Welcome email send error:", (sendResult as any).error);
            } else {
              console.log("Welcome email sent to:", customerEmail);
              // Mark welcome email as sent
              await supabase
                .from("customer_profiles")
                .update({ welcome_email_sent_at: new Date().toISOString() })
                .eq("id", customerProfileId);
            }
          } else if (isNewCustomerProfile && !resendApiKey) {
            console.log("RESEND_API_KEY not set; skipping welcome email");
          }
        } catch (emailErr) {
          console.error("Failed to send welcome email:", emailErr);
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const previousAttributes = (event.data as any).previous_attributes;
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

        // Check if this is a plan change (price changed)
        if (previousAttributes?.items) {
          const newPriceId = subscription.items.data[0]?.price?.id;
          console.log("Price changed to:", newPriceId);

          if (newPriceId) {
            // Look up the affiliate plan by stripe_price_id
            const { data: newPlan, error: planError } = await supabase
              .from("affiliate_plans")
              .select("id, code")
              .eq("stripe_price_id", newPriceId)
              .single();

            if (planError) {
              console.log("Price not found in affiliate_plans, checking customer_plans");
            } else if (newPlan) {
              console.log("Found affiliate plan:", newPlan.code);
              
              // Get billing subscription to find affiliate
              const { data: billingData } = await supabase
                .from("billing_subscriptions")
                .select("affiliate_id")
                .eq("stripe_subscription_id", subscription.id)
                .single();

              if (billingData?.affiliate_id) {
                // Update affiliate's plan
                const { error: updateError } = await supabase
                  .from("affiliates")
                  .update({ affiliate_plan_id: newPlan.id })
                  .eq("id", billingData.affiliate_id);

                if (updateError) {
                  console.error("Error updating affiliate plan:", updateError);
                } else {
                  console.log("Updated affiliate", billingData.affiliate_id, "to plan", newPlan.code);
                }
              }
            }
          }
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