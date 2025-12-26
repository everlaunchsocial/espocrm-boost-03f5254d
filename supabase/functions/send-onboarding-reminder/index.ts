import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Email sending is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify authenticated user + role
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userRes.user.id;
    const { data: role, error: roleErr } = await supabase.rpc("get_global_role_for_user", { p_user_id: userId });

    if (roleErr) {
      console.error("Role lookup error:", roleErr);
      return new Response(JSON.stringify({ error: "Unable to verify permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (role !== "admin" && role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { customer_id } = await req.json();

    if (!customer_id) {
      return new Response(JSON.stringify({ error: "customer_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: customer, error: customerErr } = await supabase
      .from("customer_profiles")
      .select("id, lead_email, contact_name, business_name")
      .eq("id", customer_id)
      .single();

    if (customerErr || !customer) {
      console.error("Customer lookup error:", customerErr);
      return new Response(JSON.stringify({ error: "Customer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!customer.lead_email) {
      return new Response(JSON.stringify({ error: "Customer has no email on file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey);

    const loginUrl = "https://tryeverlaunch.com/auth?redirect=%2Fcustomer%2Fonboarding%2Fwizard%2F1";
    const subject = "Reminder: finish your EverLaunch setup";

    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; max-width: 600px; margin: 0 auto; color: #111827;">
        <h1 style="margin: 0 0 12px; font-size: 22px;">Finish your setup</h1>
        <p style="margin: 0 0 16px;">Hi ${customer.contact_name || "there"},</p>
        <p style="margin: 0 0 16px;">Your EverLaunch setup isn’t complete yet. It only takes a few minutes.</p>

        <div style="margin: 0 0 18px;">
          <a href="${loginUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 700;">
            Complete Setup Now →
          </a>
        </div>

        <p style="margin: 0 0 8px; color:#374151;"><strong>Business:</strong> ${customer.business_name || "—"}</p>
        <p style="margin: 0; color:#6b7280;">If you need help, just reply to this email.</p>
      </div>
    `;

    const emailRes = await resend.emails.send({
      from: "EverLaunch <noreply@send.everlaunch.ai>",
      to: [customer.lead_email],
      subject,
      html,
    });

    return new Response(JSON.stringify({ success: true, data: emailRes }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-onboarding-reminder error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
