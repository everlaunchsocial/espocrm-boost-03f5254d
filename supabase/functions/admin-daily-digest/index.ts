import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { format } from "https://esm.sh/date-fns@3.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IncompleteCustomer {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  lead_email: string | null;
  affiliate_id: string | null;
  affiliate_username: string | null;
  payment_received_at: string;
  onboarding_stage: string | null;
  hours_since_payment: number;
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

  try {
    // Fetch incomplete onboarding customers using RPC
    const { data: incompleteCustomers, error: fetchError } = await supabase
      .rpc("get_incomplete_onboarding_customers", { p_limit: 50 });

    if (fetchError) {
      console.error("Error fetching incomplete customers:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!incompleteCustomers || incompleteCustomers.length === 0) {
      console.log("No incomplete onboardings found, skipping digest");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No incomplete onboardings",
        sent: false 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${incompleteCustomers.length} incomplete onboardings`);

    // Categorize by urgency
    const urgent = incompleteCustomers.filter((c: IncompleteCustomer) => c.hours_since_payment >= 48);
    const warning = incompleteCustomers.filter((c: IncompleteCustomer) => c.hours_since_payment >= 24 && c.hours_since_payment < 48);
    const recent = incompleteCustomers.filter((c: IncompleteCustomer) => c.hours_since_payment < 24);

    // Get admin emails (super_admin users)
    const { data: admins, error: adminError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("global_role", "super_admin");

    if (adminError || !admins || admins.length === 0) {
      console.log("No super_admin users found for digest");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No admin recipients",
        sent: false 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For now, send to support@everlaunch.ai as the admin digest recipient
    // In production, you'd look up each admin's email from auth.users
    const adminEmails = ["support@everlaunch.ai"];

    const today = format(new Date(), "MMM d, yyyy");

    // Build email HTML
    const buildCustomerRow = (c: IncompleteCustomer) => {
      const daysAgo = Math.floor(c.hours_since_payment / 24);
      const paymentDate = format(new Date(c.payment_received_at), "MMM d");
      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 0;">
            <strong>${c.business_name || "Unknown Business"}</strong><br>
            <span style="color: #6b7280; font-size: 14px;">Paid: ${paymentDate} (${daysAgo} days ago)</span><br>
            <span style="color: #6b7280; font-size: 14px;">Contact: ${c.lead_email || "—"}</span><br>
            <span style="color: #6b7280; font-size: 14px;">Affiliate: ${c.affiliate_username ? `@${c.affiliate_username}` : "Direct"}</span>
          </td>
        </tr>
      `;
    };

    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; max-width: 700px; margin: 0 auto; color: #1f2937;">
        <h1 style="margin: 0 0 8px; font-size: 24px; color: #111827;">Incomplete Customer Setups</h1>
        <p style="margin: 0 0 24px; color: #6b7280;">${today}</p>
        
        ${urgent.length > 0 ? `
          <div style="margin-bottom: 32px;">
            <h2 style="margin: 0 0 16px; font-size: 18px; color: #dc2626;">🔴 URGENT (48+ hours) - ${urgent.length}</h2>
            <table style="width: 100%; border-collapse: collapse;">
              ${urgent.map(buildCustomerRow).join("")}
            </table>
          </div>
        ` : ""}
        
        ${warning.length > 0 ? `
          <div style="margin-bottom: 32px;">
            <h2 style="margin: 0 0 16px; font-size: 18px; color: #d97706;">⚠️ WARNING (24-48 hours) - ${warning.length}</h2>
            <table style="width: 100%; border-collapse: collapse;">
              ${warning.map(buildCustomerRow).join("")}
            </table>
          </div>
        ` : ""}
        
        ${recent.length > 0 ? `
          <div style="margin-bottom: 32px;">
            <h2 style="margin: 0 0 16px; font-size: 18px; color: #2563eb;">🆕 NEW (&lt;24 hours) - ${recent.length}</h2>
            <table style="width: 100%; border-collapse: collapse;">
              ${recent.map(buildCustomerRow).join("")}
            </table>
          </div>
        ` : ""}
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px; font-size: 16px;">📊 SUMMARY</h3>
          <p style="margin: 0 0 8px;"><strong>Total incomplete:</strong> ${incompleteCustomers.length} customers</p>
          <p style="margin: 0;"><strong>At-risk:</strong> ${urgent.length} urgent, ${warning.length} warning</p>
        </div>
        
        <div style="margin: 0 0 24px;">
          <a href="https://tryeverlaunch.com/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            View Full Dashboard →
          </a>
        </div>
        
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">This is an automated daily digest from EverLaunch.</p>
      </div>
    `;

    if (resend) {
      try {
        await resend.emails.send({
          from: "EverLaunch Admin <noreply@tryeverlaunch.com>",
          to: adminEmails,
          subject: `[Daily Digest] ${incompleteCustomers.length} Customers Need Onboarding Follow-up`,
          html,
        });

        console.log(`Sent daily digest to ${adminEmails.join(", ")}`);
      } catch (emailError: unknown) {
        console.error("Error sending daily digest:", emailError);
        const errMessage = emailError instanceof Error ? emailError.message : "Unknown error";
        return new Response(JSON.stringify({ error: errMessage }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.log("RESEND_API_KEY not configured, skipping email send");
    }

    return new Response(JSON.stringify({ 
      success: true, 
      sent: true,
      recipients: adminEmails,
      counts: {
        total: incompleteCustomers.length,
        urgent: urgent.length,
        warning: warning.length,
        recent: recent.length,
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in admin-daily-digest:", error);
    const errMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
