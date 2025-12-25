import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CustomerProfile {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  lead_email: string | null;
  affiliate_id: string | null;
  payment_received_at: string;
  onboarding_stage: string | null;
}

interface AffiliateInfo {
  id: string;
  username: string;
  user_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase configuration");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const resend = resendApiKey ? new Resend(resendApiKey) : null;

  const now = Date.now();
  const results = {
    reminders24h: 0,
    reminders48h: 0,
    affiliateNotifications: 0,
    errors: [] as string[],
  };

  try {
    // ============================================
    // 24-HOUR REMINDERS
    // ============================================
    const twentyThreeHoursAgo = new Date(now - 23 * 60 * 60 * 1000).toISOString();
    const twentyFiveHoursAgo = new Date(now - 25 * 60 * 60 * 1000).toISOString();

    const { data: customers24h, error: fetch24Error } = await supabase
      .from("customer_profiles")
      .select("id, business_name, contact_name, lead_email, affiliate_id, payment_received_at, onboarding_stage")
      .not("payment_received_at", "is", null)
      .lte("payment_received_at", twentyThreeHoursAgo)
      .gte("payment_received_at", twentyFiveHoursAgo)
      .is("onboarding_reminder_24h_sent_at", null)
      .or("onboarding_stage.is.null,onboarding_stage.neq.completed,onboarding_stage.neq.done");

    if (fetch24Error) {
      console.error("Error fetching 24h customers:", fetch24Error);
      results.errors.push(`24h fetch: ${fetch24Error.message}`);
    } else if (customers24h && customers24h.length > 0) {
      console.log(`Found ${customers24h.length} customers for 24h reminder`);

      for (const customer of customers24h as CustomerProfile[]) {
        if (!customer.lead_email) continue;

        // Get affiliate username if exists
        let affiliateUsername = "";
        if (customer.affiliate_id) {
          const { data: affData } = await supabase
            .from("affiliates")
            .select("username")
            .eq("id", customer.affiliate_id)
            .single();
          affiliateUsername = affData?.username || "";
        }

        const loginUrl = "https://tryeverlaunch.com/auth";
        const subject = "⚠️ Reminder: Complete Your EverLaunch Setup";
        const html = `
          <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; max-width: 600px; margin: 0 auto; color: #1f2937;">
            <h1 style="margin: 0 0 16px; font-size: 24px; color: #111827;">Complete Your Setup</h1>
            <p style="margin: 0 0 20px; font-size: 16px;">Hi ${customer.contact_name || "there"},</p>
            <p style="margin: 0 0 20px;">You signed up for EverLaunch yesterday, but your account setup isn't complete yet.</p>
            
            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
              <p style="margin: 0; font-size: 15px; color: #92400e;">
                <strong>Without completing setup, your AI receptionist can't work!</strong>
              </p>
            </div>
            
            <p style="margin: 0 0 16px;">That means:</p>
            <ul style="margin: 0 0 24px; padding-left: 24px;">
              <li>❌ Missed calls going to voicemail</li>
              <li>❌ No appointment scheduling</li>
              <li>❌ Lost leads</li>
            </ul>
            
            <div style="margin: 0 0 24px;">
              <a href="${loginUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                Finish Setup (5 minutes) →
              </a>
            </div>
            
            <p style="margin: 0 0 8px;"><strong>Your login:</strong> <a href="${loginUrl}" style="color: #2563eb;">${loginUrl}</a></p>
            <p style="margin: 0 0 24px;"><strong>Email:</strong> ${customer.lead_email}</p>
            
            <p style="margin: 0 0 8px;">Need help? We're here:</p>
            <ul style="margin: 0 0 24px; padding-left: 24px;">
              <li>Reply to this email</li>
              <li>Call: (555) 123-4567</li>
              ${affiliateUsername ? `<li>Contact your partner @${affiliateUsername}</li>` : ""}
            </ul>
            
            <p style="margin: 0;">Let's get your AI working for you!</p>
            <p style="margin: 16px 0 0; color: #6b7280;">- EverLaunch Team</p>
          </div>
        `;

        if (resend) {
          try {
            await resend.emails.send({
              from: "EverLaunch <noreply@tryeverlaunch.com>",
              to: [customer.lead_email],
              subject,
              html,
            });

            await supabase
              .from("customer_profiles")
              .update({ onboarding_reminder_24h_sent_at: new Date().toISOString() })
              .eq("id", customer.id);

            results.reminders24h++;
            console.log(`Sent 24h reminder to ${customer.lead_email}`);
          } catch (emailError) {
            console.error(`Error sending 24h email to ${customer.lead_email}:`, emailError);
            results.errors.push(`24h email to ${customer.lead_email}: ${emailError}`);
          }
        }
      }
    }

    // ============================================
    // 48-HOUR ESCALATION
    // ============================================
    const fortySevenHoursAgo = new Date(now - 47 * 60 * 60 * 1000).toISOString();
    const fortyNineHoursAgo = new Date(now - 49 * 60 * 60 * 1000).toISOString();

    const { data: customers48h, error: fetch48Error } = await supabase
      .from("customer_profiles")
      .select("id, business_name, contact_name, lead_email, affiliate_id, payment_received_at, onboarding_stage, phone")
      .not("payment_received_at", "is", null)
      .lte("payment_received_at", fortySevenHoursAgo)
      .gte("payment_received_at", fortyNineHoursAgo)
      .is("onboarding_reminder_48h_sent_at", null)
      .or("onboarding_stage.is.null,onboarding_stage.neq.completed,onboarding_stage.neq.done");

    if (fetch48Error) {
      console.error("Error fetching 48h customers:", fetch48Error);
      results.errors.push(`48h fetch: ${fetch48Error.message}`);
    } else if (customers48h && customers48h.length > 0) {
      console.log(`Found ${customers48h.length} customers for 48h escalation`);

      for (const customer of customers48h as (CustomerProfile & { phone?: string })[]) {
        if (!customer.lead_email) continue;

        // Get affiliate info if exists
        let affiliateInfo: AffiliateInfo | null = null;
        let affiliateEmail: string | null = null;

        if (customer.affiliate_id) {
          const { data: affData } = await supabase
            .from("affiliates")
            .select("id, username, user_id")
            .eq("id", customer.affiliate_id)
            .single();
          
          if (affData) {
            affiliateInfo = affData as AffiliateInfo;
            // Get affiliate's email from auth.users via profiles or directly
            const { data: userData } = await supabase
              .from("profiles")
              .select("user_id")
              .eq("user_id", affData.user_id)
              .single();
            
            if (userData) {
              // We can't directly query auth.users, so we'll use the lead_email pattern
              // For now, we'll skip affiliate email but log it
              console.log(`Affiliate ${affData.username} for customer ${customer.id}`);
            }
          }
        }

        const loginUrl = "https://tryeverlaunch.com/auth";
        const subject = "🚨 Urgent: Complete Setup or Service Will Be Paused";
        const html = `
          <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; max-width: 600px; margin: 0 auto; color: #1f2937;">
            <h1 style="margin: 0 0 16px; font-size: 24px; color: #dc2626;">Urgent: Complete Your Setup</h1>
            <p style="margin: 0 0 20px; font-size: 16px;">Hi ${customer.contact_name || "there"},</p>
            <p style="margin: 0 0 20px;">It's been 2 days since you paid for EverLaunch, but your account still isn't set up.</p>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
              <p style="margin: 0; font-size: 15px; color: #991b1b;">
                <strong>We want you to succeed!</strong> But without setup, you're not getting any value from the service.
              </p>
            </div>
            
            <div style="margin: 0 0 24px;">
              <a href="${loginUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                Complete Setup Now →
              </a>
            </div>
            
            <p style="margin: 0 0 8px;"><strong>Login:</strong> <a href="${loginUrl}" style="color: #2563eb;">${loginUrl}</a></p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            
            <p style="margin: 0 0 8px;">OR if you've changed your mind:</p>
            <p style="margin: 0 0 24px;"><a href="mailto:support@everlaunch.ai?subject=Refund Request - ${customer.business_name || customer.id}" style="color: #6b7280;">Request Full Refund →</a></p>
            
            <p style="margin: 0 0 8px;">We're here to help:</p>
            <ul style="margin: 0 0 24px; padding-left: 24px;">
              <li>Call us: (555) 123-4567</li>
              <li>Email: support@everlaunch.ai</li>
              ${affiliateInfo ? `<li>Your partner @${affiliateInfo.username} can help too</li>` : ""}
            </ul>
            
            <p style="margin: 0; color: #6b7280; font-size: 14px;">This is the last reminder. After 5 days, we'll reach out about a refund.</p>
            <p style="margin: 16px 0 0; color: #6b7280;">- EverLaunch Team</p>
          </div>
        `;

        if (resend) {
          try {
            // Send to customer (and CC admin)
            await resend.emails.send({
              from: "EverLaunch <noreply@tryeverlaunch.com>",
              to: [customer.lead_email],
              cc: ["support@everlaunch.ai"],
              subject,
              html,
            });

            await supabase
              .from("customer_profiles")
              .update({ onboarding_reminder_48h_sent_at: new Date().toISOString() })
              .eq("id", customer.id);

            results.reminders48h++;
            console.log(`Sent 48h escalation to ${customer.lead_email}`);

            // Send affiliate notification if they have an affiliate
            if (affiliateInfo) {
              const affiliateSubject = `[Action Needed] Your Customer Needs Setup Help`;
              const affiliateHtml = `
                <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; max-width: 600px; margin: 0 auto; color: #1f2937;">
                  <h1 style="margin: 0 0 16px; font-size: 24px; color: #111827;">Your Customer Needs Help</h1>
                  <p style="margin: 0 0 20px; font-size: 16px;">Hi,</p>
                  <p style="margin: 0 0 20px;">Your customer "${customer.business_name || 'Unknown Business'}" paid 2 days ago but hasn't completed their account setup.</p>
                  
                  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
                    <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase;">CUSTOMER DETAILS</h3>
                    <p style="margin: 0 0 8px;"><strong>Business:</strong> ${customer.business_name || "—"}</p>
                    <p style="margin: 0 0 8px;"><strong>Contact:</strong> ${customer.contact_name || "—"}</p>
                    <p style="margin: 0 0 8px;"><strong>Email:</strong> ${customer.lead_email}</p>
                    ${customer.phone ? `<p style="margin: 0;"><strong>Phone:</strong> ${customer.phone}</p>` : ""}
                  </div>
                  
                  <p style="margin: 0 0 16px;"><strong>They may need help!</strong> Common issues:</p>
                  <ul style="margin: 0 0 24px; padding-left: 24px;">
                    <li>Forgot login credentials</li>
                    <li>Confused about setup process</li>
                    <li>Technical difficulties</li>
                  </ul>
                  
                  <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
                    <p style="margin: 0; font-size: 15px; color: #1e40af;">
                      <strong>CAN YOU HELP?</strong><br>
                      Give them a quick call or email to help them complete the 5-minute setup wizard.
                    </p>
                  </div>
                  
                  <div style="margin: 0 0 24px;">
                    <a href="https://tryeverlaunch.com/affiliate/customers" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                      View Customer in Dashboard →
                    </a>
                  </div>
                  
                  <p style="margin: 0; color: #6b7280;">If you need our support team's help, reply to this email.</p>
                  <p style="margin: 16px 0 0; color: #6b7280;">Thanks for helping your customers succeed!<br>- EverLaunch Team</p>
                </div>
              `;

              // We need the affiliate's email - for now send to support with affiliate username
              // In production, you'd look up the affiliate's email
              try {
                await resend.emails.send({
                  from: "EverLaunch <noreply@tryeverlaunch.com>",
                  to: ["support@everlaunch.ai"], // In production: send to affiliate's email
                  subject: `${affiliateSubject} (@${affiliateInfo.username})`,
                  html: affiliateHtml,
                });
                results.affiliateNotifications++;
                console.log(`Sent affiliate notification for customer ${customer.id}`);
              } catch (affEmailError) {
                console.error(`Error sending affiliate notification:`, affEmailError);
              }
            }
          } catch (emailError) {
            console.error(`Error sending 48h email to ${customer.lead_email}:`, emailError);
            results.errors.push(`48h email to ${customer.lead_email}: ${emailError}`);
          }
        }
      }
    }

    console.log("Onboarding reminders complete:", results);

    return new Response(JSON.stringify({ 
      success: true, 
      results 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in onboarding-reminders:", error);
    const errMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
