import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  if (!resendApiKey) {
    console.error("Missing RESEND_API_KEY");
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const resend = new Resend(resendApiKey);

  try {
    // Get the user from the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get customer profile
    const { data: profile, error: profileError } = await supabase
      .from("customer_profiles")
      .select("id, business_name, contact_name, lead_email, affiliate_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Customer profile not found:", profileError);
      return new Response(JSON.stringify({ error: "Customer profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerEmail = profile.lead_email || user.email;
    if (!customerEmail) {
      return new Response(JSON.stringify({ error: "No email address found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const loginUrl = "https://tryeverlaunch.com/auth";
    const onboardingUrl = "https://tryeverlaunch.com/auth?redirect=/customer/onboarding/wizard/1";
    
    // Get affiliate username if available
    let affiliateUsername = "";
    if (profile.affiliate_id) {
      const { data: affData } = await supabase
        .from("affiliates")
        .select("username")
        .eq("id", profile.affiliate_id)
        .single();
      affiliateUsername = affData?.username || "";
    }

    const businessName = profile.business_name;
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
            You need to finish setting up your account to activate your AI Employee. This takes about 5 minutes.
          </p>
        </div>
        
        <p style="text-align: center; margin: 0 0 24px;">
          <a href="${onboardingUrl}" style="display: inline-block; background: #111827; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Complete Setup Now</a>
        </p>
        
        <p style="text-align: center; margin: 0 0 24px; font-size: 14px; color: #6b7280;">
          Or sign in directly at: <a href="${loginUrl}" style="color: #2563eb;">${loginUrl}</a>
        </p>
        
        <div style="margin: 0 0 24px;">
          <p style="margin: 0 0 8px; font-weight: 600;">What happens during setup:</p>
          <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
            <li>Connect your business phone number</li>
            <li>Set your business hours and services</li>
            <li>Customize your AI's responses</li>
            <li>Test your AI Employee</li>
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
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Welcome email resent to:", customerEmail);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error resending welcome email:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
