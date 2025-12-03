import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  contactId: string;
  senderAddress: string;
  senderName: string;
  toEmail: string;
  toName?: string;
  subject: string;
  body: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contactId, senderAddress, senderName, toEmail, toName, subject, body }: SendEmailRequest = await req.json();

    console.log("Sending email:", { contactId, senderAddress, toEmail, subject });

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate tracking ID
    const trackingId = crypto.randomUUID();
    
    // Create tracking pixel URL
    const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-email-open?id=${trackingId}`;
    
    // Embed tracking pixel in email HTML
    const htmlWithTracking = `
      ${body}
      <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
    `;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: `${senderName} <${senderAddress}>`,
      to: toName ? [`${toName} <${toEmail}>`] : [toEmail],
      subject: subject,
      html: htmlWithTracking,
    });

    console.log("Resend response:", emailResponse);

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      
      // Store failed email record
      await supabase.from("emails").insert({
        contact_id: contactId,
        sender_address: senderAddress,
        sender_name: senderName,
        to_email: toEmail,
        to_name: toName,
        subject: subject,
        body: body,
        status: "failed",
        tracking_id: trackingId,
      });

      return new Response(
        JSON.stringify({ error: emailResponse.error.message }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Store sent email record in database
    const { data: emailRecord, error: dbError } = await supabase.from("emails").insert({
      contact_id: contactId,
      sender_address: senderAddress,
      sender_name: senderName,
      to_email: toEmail,
      to_name: toName,
      subject: subject,
      body: body,
      status: "sent",
      tracking_id: trackingId,
    }).select().single();

    if (dbError) {
      console.error("Database error:", dbError);
    }

    console.log("Email sent successfully:", emailRecord);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id,
        trackingId: trackingId,
        record: emailRecord 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
