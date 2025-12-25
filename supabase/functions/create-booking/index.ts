import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateBookingRequest {
  demoId: string;
  prospectName: string;
  prospectEmail: string;
  prospectPhone?: string;
  bookingDate: string;
  bookingTime: string;
  notes?: string;
  businessName: string;
  customerId?: string; // Optional: for customer portal bookings
}

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

serve(async (req: Request): Promise<Response> => {
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
        JSON.stringify({ success: false, error: "Database service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: CreateBookingRequest = await req.json();
    const { demoId, prospectName, prospectEmail, prospectPhone, bookingDate, bookingTime, notes, businessName, customerId } = body;

    console.log("Creating booking:", { demoId, prospectName, prospectEmail, bookingDate, bookingTime, customerId });

    // Validate required fields
    if (!demoId || !prospectName || !prospectEmail || !bookingDate || !bookingTime) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Insert booking into database (SOURCE OF TRUTH)
    const { data: booking, error: bookingError } = await supabase
      .from("calendar_bookings")
      .insert({
        demo_id: demoId,
        prospect_name: prospectName,
        prospect_email: prospectEmail,
        prospect_phone: prospectPhone || null,
        booking_date: bookingDate,
        booking_time: bookingTime,
        notes: notes || null,
        status: 'confirmed',
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Database error:", bookingError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create booking" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Booking created:", booking.id);

    // Get demo details for activity logging and customer lookup
    const { data: demo } = await supabase
      .from("demos")
      .select("lead_id, contact_id, business_name, affiliate_id")
      .eq("id", demoId)
      .single();

    // Log activity
    if (demo) {
      const entityId = demo.lead_id || demo.contact_id;
      const entityType = demo.lead_id ? 'lead' : 'contact';
      
      if (entityId) {
        await supabase.from('activities').insert({
          type: 'meeting',
          subject: `Call booked for ${formatDate(bookingDate)} at ${formatTime(bookingTime)}`,
          description: `${prospectName} (${prospectEmail}) booked a call for ${demo.business_name} demo`,
          related_to_id: entityId,
          related_to_type: entityType,
          related_to_name: prospectName,
          is_system_generated: true,
        });
      }
    }

    // === EXTERNAL SYNC: Webhook/Zapier ===
    // If customer has a webhook_url configured, POST booking data there
    let webhookSyncSuccess = false;
    if (customerId) {
      const { data: calendarIntegration } = await supabase
        .from("calendar_integrations")
        .select("webhook_url, access_token")
        .eq("customer_id", customerId)
        .single();

      if (calendarIntegration?.webhook_url) {
        console.log("Sending booking to webhook:", calendarIntegration.webhook_url);
        try {
          const webhookPayload = {
            event_type: 'appointment_booked',
            booking_id: booking.id,
            customer_name: prospectName,
            customer_email: prospectEmail,
            customer_phone: prospectPhone || null,
            date: bookingDate,
            time: bookingTime,
            formatted_date: formatDate(bookingDate),
            formatted_time: formatTime(bookingTime),
            notes: notes || null,
            business_name: businessName,
            booked_at: new Date().toISOString(),
          };

          const webhookResponse = await fetch(calendarIntegration.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
          });

          if (webhookResponse.ok) {
            webhookSyncSuccess = true;
            console.log("Webhook sync successful");
          } else {
            console.error("Webhook sync failed with status:", webhookResponse.status);
          }
        } catch (webhookError) {
          // Non-blocking: log error but don't fail the booking
          console.error("Webhook sync failed (non-blocking):", webhookError);
        }
      }

      // === EXTERNAL SYNC: Google Calendar (Future) ===
      // if (calendarIntegration?.access_token) {
      //   // TODO: Implement Google Calendar event creation
      //   console.log("Google Calendar sync would happen here");
      // }
    }

    // Send confirmation emails if Resend is configured
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const formattedDate = formatDate(bookingDate);
      const formattedTime = formatTime(bookingTime);
      
      // Email to prospect
      try {
        await resend.emails.send({
          from: "EverLaunch <info@send.everlaunch.ai>",
          to: [prospectEmail],
          subject: `Your call is confirmed - ${formattedDate}`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✅ Your Call is Confirmed!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 32px;">
              <p style="color: #52525b; font-size: 16px; margin: 0 0 24px 0;">Hi ${prospectName},</p>
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Your call about <strong>${businessName}</strong> has been confirmed!
              </p>
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="color: #18181b; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">📅 ${formattedDate}</p>
                <p style="color: #6366f1; font-size: 20px; font-weight: 600; margin: 0;">🕐 ${formattedTime}</p>
              </div>
              <p style="color: #71717a; font-size: 14px; margin: 24px 0 0 0;">
                We'll reach out via email or phone at the scheduled time. If you need to reschedule, just reply to this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">Powered by EverLaunch</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `,
        });
        console.log("Prospect confirmation email sent");
      } catch (emailError) {
        console.error("Failed to send prospect email:", emailError);
      }

      // Email to rep/team (use a default notification email or could be configured per rep)
      try {
        await resend.emails.send({
          from: "EverLaunch <info@send.everlaunch.ai>",
          to: ["john@localsearch365.com"], // TODO: Make this configurable per rep
          subject: `New booking: ${prospectName} - ${formattedDate} at ${formattedTime}`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <h2 style="color: #18181b;">📅 New Call Booking</h2>
  <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 16px 0;">
    <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${prospectName}</p>
    <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${prospectEmail}</p>
    ${prospectPhone ? `<p style="margin: 0 0 8px 0;"><strong>Phone:</strong> ${prospectPhone}</p>` : ''}
    <p style="margin: 0 0 8px 0;"><strong>Date:</strong> ${formattedDate}</p>
    <p style="margin: 0 0 8px 0;"><strong>Time:</strong> ${formattedTime}</p>
    <p style="margin: 0 0 8px 0;"><strong>Business:</strong> ${businessName}</p>
    ${notes ? `<p style="margin: 0;"><strong>Notes:</strong> ${notes}</p>` : ''}
  </div>
  <p style="color: #71717a; font-size: 14px;">This booking was made via the AI Demo for ${businessName}.${webhookSyncSuccess ? ' (Also synced to CRM via webhook)' : ''}</p>
</body>
</html>
          `,
        });
        console.log("Rep notification email sent");
      } catch (emailError) {
        console.error("Failed to send rep email:", emailError);
      }
    } else {
      console.log("RESEND_API_KEY not configured, skipping confirmation emails");
    }

    return new Response(
      JSON.stringify({
        success: true,
        bookingId: booking.id,
        booking: {
          date: bookingDate,
          time: bookingTime,
          name: prospectName,
          email: prospectEmail,
        },
        webhookSynced: webhookSyncSuccess,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in create-booking:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
