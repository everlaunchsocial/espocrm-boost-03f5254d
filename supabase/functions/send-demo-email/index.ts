import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendDemoEmailRequest {
  demoId: string;
  toEmail: string;
  toName?: string;
  fromName?: string;
  baseUrl?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for RESEND_API_KEY first
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY environment variable is not set");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured. Please set RESEND_API_KEY." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);

    let requestBody: SendDemoEmailRequest;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { demoId, toEmail, toName, fromName, baseUrl } = requestBody;

    console.log("Send demo email request:", { demoId, toEmail, toName, fromName, baseUrl });

    // Validate required fields
    if (!demoId) {
      return new Response(
        JSON.stringify({ success: false, error: "demoId is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!toEmail) {
      return new Response(
        JSON.stringify({ success: false, error: "toEmail is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format for toEmail" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ success: false, error: "Database service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load demo from database
    const { data: demo, error: demoError } = await supabase
      .from("demos")
      .select("*")
      .eq("id", demoId)
      .single();

    if (demoError) {
      console.error("Database error loading demo:", demoError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to load demo from database" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!demo) {
      console.error("Demo not found:", demoId);
      return new Response(
        JSON.stringify({ success: false, error: "Demo not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Found demo:", { id: demo.id, business_name: demo.business_name, status: demo.status });

    // Build demo URL - use baseUrl from request, or PUBLIC_DEMO_BASE_URL env var
    let publicBaseUrl = baseUrl;
    if (!publicBaseUrl) {
      publicBaseUrl = Deno.env.get("PUBLIC_DEMO_BASE_URL");
    }
    if (!publicBaseUrl) {
      // Fallback: try to construct from Supabase project ID
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      if (projectRef) {
        publicBaseUrl = `https://${projectRef}.lovable.app`;
      } else {
        publicBaseUrl = "https://everlaunch.ai";
      }
    }
    
    const demoUrl = `${publicBaseUrl.replace(/\/$/, '')}/demo/${demoId}`;
    console.log("Demo URL:", demoUrl);

    // Build email content
    const senderName = fromName || "EverLaunch";
    const recipientName = toName || "there";
    const businessName = demo.business_name;

    const emailSubject = `Your personalized AI receptionist demo is ready`;

    // Generate tracking ID and pixel URL (same pattern as send-email)
    const trackingId = crypto.randomUUID();
    const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-email-open?id=${trackingId}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your AI Demo is Ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                ✨ EverLaunch
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">
                AI-Powered Customer Engagement
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">
                Hi ${recipientName},
              </h2>
              
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                We've built a personalized AI demo specifically for <strong>${businessName}</strong>. 
                This demo shows exactly how an AI voice and chat assistant could work on your website — 
                answering customer questions, capturing leads, and booking appointments 24/7.
              </p>
              
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                Click below to experience your custom AI assistant:
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${demoUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                      View Your AI Demo →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 32px 0 0 0;">
                In your demo, you can:
              </p>
              <ul style="color: #52525b; font-size: 14px; line-height: 1.8; margin: 8px 0 0 0; padding-left: 20px;">
                <li>Talk to an AI voice assistant trained on your business</li>
                <li>See how it would handle customer inquiries</li>
                <li>Experience 24/7 lead capture in action</li>
              </ul>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
              <p style="color: #71717a; font-size: 13px; margin: 0; text-align: center;">
                Questions? Reply to this email or contact us anytime.
              </p>
              <p style="color: #a1a1aa; font-size: 12px; margin: 12px 0 0 0; text-align: center;">
                Powered by EverLaunch • AI that works while you sleep
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <!-- Tracking pixel for open tracking -->
  <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
</body>
</html>
    `;

    // Send email via Resend
    // Use a verified domain email address (same as the working send-email function)
    const fromAddress = "info@send.everlaunch.ai";
    console.log("Sending email via Resend...");
    console.log("From:", `${senderName} <${fromAddress}>`);
    console.log("To:", toEmail);
    console.log("Tracking ID:", trackingId);

    let emailResponse;
    try {
      emailResponse = await resend.emails.send({
        from: `${senderName} <${fromAddress}>`,
        to: [toEmail],
        subject: emailSubject,
        html: emailHtml,
      });
      console.log("Resend response:", JSON.stringify(emailResponse, null, 2));
    } catch (sendError: unknown) {
      const errorDetails = sendError instanceof Error ? sendError.message : String(sendError);
      console.error("Resend send() threw exception:", sendError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Email provider error: ${errorDetails}`,
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (emailResponse.error) {
      console.error("Resend returned error object:", JSON.stringify(emailResponse.error, null, 2));
      const errorMessage = emailResponse.error.message || "Email provider returned an error";
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to send email: ${errorMessage}`,
          details: emailResponse.error
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Store email in emails table for open tracking (same as regular send-email)
    const { data: emailRecord, error: emailDbError } = await supabase.from("emails").insert({
      contact_id: demo.lead_id || demo.contact_id || demoId, // Use entity ID or demo ID as fallback
      sender_address: fromAddress,
      sender_name: senderName,
      to_email: toEmail,
      to_name: toName,
      subject: emailSubject,
      body: emailHtml,
      status: "sent",
      tracking_id: trackingId,
    }).select().single();

    if (emailDbError) {
      console.error("Error storing email record:", emailDbError);
      // Don't fail - email was sent, just tracking won't work
    } else {
      console.log("Email record stored with tracking ID:", trackingId);
    }

    // Update demo record
    const updateData: Record<string, unknown> = {
      email_sent_at: new Date().toISOString(),
    };

    // Only update status to 'sent' if currently 'draft'
    if (demo.status === 'draft') {
      updateData.status = 'sent';
    }

    const { data: updatedDemo, error: updateError } = await supabase
      .from("demos")
      .update(updateData)
      .eq("id", demoId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating demo:", updateError);
      // Email was sent successfully, so we don't fail the request but log the error
    }

    // Log activity for the linked lead or contact
    const entityId = demo.lead_id || demo.contact_id;
    const entityType = demo.lead_id ? 'lead' : 'contact';
    
    if (entityId) {
      // Get entity name for activity log
      let entityName = demo.business_name;
      
      try {
        if (demo.lead_id) {
          const { data: lead } = await supabase
            .from('leads')
            .select('first_name, last_name')
            .eq('id', demo.lead_id)
            .single();
          if (lead) {
            entityName = `${lead.first_name} ${lead.last_name}`;
          }
        } else if (demo.contact_id) {
          const { data: contact } = await supabase
            .from('contacts')
            .select('first_name, last_name')
            .eq('id', demo.contact_id)
            .single();
          if (contact) {
            entityName = `${contact.first_name} ${contact.last_name}`;
          }
        }
      } catch (lookupErr) {
        console.error("Error looking up entity name:", lookupErr);
      }

      // Insert activity record
      const { error: activityError } = await supabase.from('activities').insert({
        type: 'email',
        subject: `Demo email sent for ${demo.business_name}`,
        description: `Demo invitation email sent to ${toEmail}. Demo link: ${demoUrl}`,
        related_to_id: entityId,
        related_to_type: entityType,
        related_to_name: entityName,
        is_system_generated: true,
      });

      if (activityError) {
        console.error("Error logging activity:", activityError);
        // Don't fail the request, email was sent successfully
      } else {
        console.log("Activity logged for demo email send");
      }
    }

    const finalStatus = updatedDemo?.status || demo.status;

    console.log("Demo email sent successfully:", {
      demoId,
      demoUrl,
      status: finalStatus,
      emailId: emailResponse.data?.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        demoId: demoId,
        demoUrl: demoUrl,
        status: finalStatus,
        emailId: emailResponse.data?.id,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in send-demo-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});