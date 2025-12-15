import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestDemoPayload {
  affiliateId: string;
  affiliateUsername: string;
  businessName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  websiteUrl?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!resendApiKey) {
      console.error("Missing RESEND_API_KEY");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendApiKey);

    // Parse request body
    let payload: RequestDemoPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Request demo payload:", payload);

    const { affiliateId, affiliateUsername, businessName, firstName, lastName, email, phone, websiteUrl } = payload;

    // Validate required fields
    if (!affiliateId || !businessName || !firstName || !lastName || !email || !phone) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get affiliate's user_id for rep_id and check demo credits
    const { data: affiliate, error: affiliateError } = await supabase
      .from("affiliates")
      .select(`
        id, 
        user_id, 
        username,
        demo_credits_balance,
        affiliate_plans (
          demo_credits_per_month
        )
      `)
      .eq("id", affiliateId)
      .single();

    if (affiliateError || !affiliate) {
      console.error("Affiliate not found:", affiliateError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid affiliate" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check demo credits
    const planData = affiliate.affiliate_plans as unknown;
    const plan = Array.isArray(planData) ? planData[0] : planData;
    const creditsPerMonth = (plan as { demo_credits_per_month: number | null } | null)?.demo_credits_per_month ?? null;
    const isUnlimited = creditsPerMonth === null || creditsPerMonth === -1;

    if (!isUnlimited) {
      const currentBalance = affiliate.demo_credits_balance ?? 0;
      if (currentBalance <= 0) {
        console.log("Affiliate has no demo credits remaining:", affiliateId);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "You've used all your demo credits for this period. Please upgrade your plan or wait until your credits reset.",
            credits_exhausted: true
          }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Step 1: Check if lead already exists for this affiliate + email
    const { data: existingLead } = await supabase
      .from("leads")
      .select("*")
      .eq("affiliate_id", affiliateId)
      .eq("email", email.toLowerCase())
      .maybeSingle();

    let leadId: string;
    let leadName: string;

    if (existingLead) {
      // Reuse existing lead
      leadId = existingLead.id;
      leadName = `${existingLead.first_name} ${existingLead.last_name}`;
      console.log("Reusing existing lead:", leadId);

      // Update lead with any new info
      await supabase
        .from("leads")
        .update({
          company: businessName,
          phone: phone,
          website: websiteUrl || existingLead.website,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);
    } else {
      // Create new lead
      const { data: newLead, error: leadError } = await supabase
        .from("leads")
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase(),
          phone: phone,
          company: businessName,
          website: websiteUrl || null,
          source: "web", // Using 'web' as it's an allowed source value
          status: "new",
          affiliate_id: affiliateId,
          has_website: !!websiteUrl,
        })
        .select()
        .single();

      if (leadError) {
        console.error("Error creating lead:", leadError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create lead record" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      leadId = newLead.id;
      leadName = `${firstName} ${lastName}`;
      console.log("Created new lead:", leadId);

      // Log activity for lead creation
      await supabase.from("activities").insert({
        type: "status-change",
        subject: `Lead created from public demo request`,
        description: `${firstName} ${lastName} requested a demo via ${affiliateUsername}'s replicated page`,
        related_to_type: "lead",
        related_to_id: leadId,
        related_to_name: leadName,
        is_system_generated: true,
      });
    }

    // Step 2: Generate passcode for demo - use last 4 digits of phone
    const extractPasscodeFromPhone = (phoneNumber: string): string | null => {
      const digits = phoneNumber.replace(/\D/g, '');
      if (digits.length >= 4) {
        return digits.slice(-4);
      }
      return null;
    };

    let passcode = extractPasscodeFromPhone(phone) || String(Math.floor(Math.random() * 9000) + 1000);
    
    // Check for uniqueness
    const { data: existingPasscode } = await supabase
      .from("demos")
      .select("id")
      .eq("passcode", passcode)
      .maybeSingle();

    if (existingPasscode) {
      // Collision - fall back to random
      passcode = String(Math.floor(Math.random() * 9000) + 1000);
      console.log("Phone passcode collision, using random:", passcode);
    } else {
      console.log("Using phone-based passcode:", passcode);
    }

    // Step 3: Create demo record
    const { data: demo, error: demoError } = await supabase
      .from("demos")
      .insert({
        lead_id: leadId,
        rep_id: affiliate.user_id,
        affiliate_id: affiliateId,
        business_name: businessName,
        website_url: websiteUrl || null,
        voice_provider: "openai",
        ai_persona_name: "AI Assistant",
        chat_title: "Chat with us",
        chat_primary_color: "#6366f1",
        passcode: passcode,
        status: "draft",
      })
      .select()
      .single();

    if (demoError) {
      console.error("Error creating demo:", demoError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create demo record" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Created demo:", demo.id);

    // Step 4: Build demo URL
    let publicBaseUrl = Deno.env.get("PUBLIC_DEMO_BASE_URL");
    if (!publicBaseUrl) {
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      if (projectRef) {
        publicBaseUrl = `https://${projectRef}.lovable.app`;
      } else {
        publicBaseUrl = "https://everlaunch.ai";
      }
    }
    const demoUrl = `${publicBaseUrl.replace(/\/$/, "")}/demo/${demo.id}`;

    // Step 5: Send demo email
    const senderName = "EverLaunch";
    const fromAddress = "info@send.everlaunch.ai";
    const recipientName = firstName;

    const trackingId = crypto.randomUUID();
    const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-email-open?id=${trackingId}`;

    const emailSubject = `Your Personalized AI Receptionist Demo is Ready!`;
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">✨ EverLaunch AI</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">AI-Powered Customer Engagement</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px;">Hi ${recipientName},</h2>
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Great news! Your personalized AI demo for <strong>${businessName}</strong> is ready:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${demoUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      👉 View Your Personalized AI Demo
                    </a>
                  </td>
                </tr>
              </table>
              ${passcode ? `
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #bbf7d0;">
                <h3 style="color: #166534; margin: 0 0 8px 0; font-size: 16px;">📞 Try the Phone Demo</h3>
                <p style="color: #15803d; font-size: 14px; margin: 0 0 12px 0;">Call <strong>+1 (508) 779-9437</strong> to talk with the AI</p>
                <p style="color: #166534; font-size: 13px; margin: 0;">Your passcode is the last 4 digits of your phone number: <span style="font-size: 24px; font-weight: 700; letter-spacing: 4px;">${passcode}</span></p>
              </div>
              ` : ""}
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                This demo shows how AI Chat and AI Voice can engage your visitors 24/7, capturing leads while you sleep.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
              <p style="color: #71717a; font-size: 13px; margin: 0; text-align: center;">Questions? Reply to this email.</p>
              <p style="color: #a1a1aa; font-size: 12px; margin: 12px 0 0 0; text-align: center;">Powered by EverLaunch AI</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
</body>
</html>`;

    try {
      const emailResponse = await resend.emails.send({
        from: `${senderName} <${fromAddress}>`,
        to: [email],
        subject: emailSubject,
        html: emailHtml,
      });

      console.log("Email sent:", emailResponse);

      if (emailResponse.error) {
        console.error("Email send error:", emailResponse.error);
        // Continue anyway - demo was created
      } else {
        // Store email record for tracking
        await supabase.from("emails").insert({
          contact_id: leadId,
          sender_address: fromAddress,
          sender_name: senderName,
          to_email: email,
          to_name: firstName,
          subject: emailSubject,
          body: emailHtml,
          status: "sent",
          tracking_id: trackingId,
        });

        // Update demo status
        await supabase
          .from("demos")
          .update({
            email_sent_at: new Date().toISOString(),
            status: "sent",
          })
          .eq("id", demo.id);
      }
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Don't fail the request - demo was created successfully
    }

    // Log activity for demo creation
    await supabase.from("activities").insert({
      type: "email",
      subject: `Demo requested and email sent`,
      description: `${firstName} ${lastName} requested a demo for ${businessName}. Demo link sent to ${email}.`,
      related_to_type: "lead",
      related_to_id: leadId,
      related_to_name: leadName,
      is_system_generated: true,
    });

    // Decrement demo credits if not unlimited
    if (!isUnlimited) {
      const { error: decrementError } = await supabase
        .from("affiliates")
        .update({
          demo_credits_balance: Math.max(0, (affiliate.demo_credits_balance ?? 0) - 1),
        })
        .eq("id", affiliateId);

      if (decrementError) {
        console.error("Error decrementing demo credits:", decrementError);
        // Don't fail the request - demo was created
      } else {
        console.log("Demo credits decremented for affiliate:", affiliateId);
      }
    }

    console.log("Request demo completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        leadId,
        demoId: demo.id,
        demoUrl,
        message: "Demo created and email sent successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Request demo error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
