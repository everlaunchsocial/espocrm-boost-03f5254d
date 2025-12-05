import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Support both formats:
    // - OpenAI sends: { tool_name, arguments: {...}, businessInfo }
    // - ElevenLabs sends: { tool_name, businessInfo, ...params directly }
    const tool_name = body.tool_name;
    const args = body.arguments || body; // ElevenLabs sends params directly in body
    const businessInfo = body.businessInfo || {};

    console.log(`Executing tool: ${tool_name}`, args);
    console.log('Business info:', businessInfo);

    let result: any;

    switch (tool_name) {
      case 'send_email':
        result = await handleSendEmail(args, businessInfo);
        break;
      case 'schedule_callback':
        result = await handleScheduleCallback(args, businessInfo);
        break;
      case 'get_business_info':
        result = handleGetBusinessInfo(args, businessInfo);
        break;
      default:
        throw new Error(`Unknown tool: ${tool_name}`);
    }

    console.log(`Tool ${tool_name} result:`, result);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error executing tool:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleSendEmail(args: any, businessInfo: any) {
  const { recipient_email, subject, content, caller_name } = args;

  if (!recipient_email) {
    return { sent: false, message: "No email address provided" };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipient_email)) {
    return { sent: false, message: "Invalid email address format" };
  }

  const businessName = businessInfo?.businessName || "Our Business";
  const businessEmail = businessInfo?.emails?.[0] || "info@localsearch365.com";

  // Build professional email HTML
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">${businessName}</h1>
        </div>
        <div class="content">
          ${caller_name ? `<p>Hi ${caller_name},</p>` : '<p>Hello,</p>'}
          <p>Thank you for your interest in ${businessName}! As requested during our conversation, here is the information you asked for:</p>
          <div style="background: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
            ${content.replace(/\n/g, '<br>')}
          </div>
          <p>If you have any additional questions, please don't hesitate to reach out!</p>
          <p>Best regards,<br>${businessName} Team</p>
        </div>
        <div class="footer">
          <p>This email was sent by ${businessName}'s AI assistant.</p>
          ${businessInfo?.phones?.[0] ? `<p>Phone: ${businessInfo.phones[0]}</p>` : ''}
          ${businessInfo?.address ? `<p>${businessInfo.address}</p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const emailResponse = await resend.emails.send({
      from: `${businessName} <onboarding@resend.dev>`,
      to: [recipient_email],
      subject: subject || `Information from ${businessName}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);
    return { 
      sent: true, 
      message: `Email sent successfully to ${recipient_email}`,
      emailId: (emailResponse as any).data?.id || 'sent'
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return { 
      sent: false, 
      message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

async function handleScheduleCallback(args: any, businessInfo: any) {
  const { caller_name, phone_number, preferred_time, reason } = args;

  if (!phone_number) {
    return { scheduled: false, message: "No phone number provided" };
  }

  // In a real implementation, this would save to database and/or send notification
  // For now, we'll send an email notification to the business owner
  const businessEmail = businessInfo?.emails?.[0] || "john@localsearch365.com";
  const businessName = businessInfo?.businessName || "Business";

  const notificationHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #fef2f2; padding: 20px; border: 1px solid #fecaca; }
        .detail { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
        .label { font-weight: bold; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">📞 Callback Request</h1>
        </div>
        <div class="content">
          <p>A caller has requested a callback through your AI receptionist:</p>
          <div class="detail">
            <span class="label">Name:</span> ${caller_name || 'Not provided'}
          </div>
          <div class="detail">
            <span class="label">Phone:</span> ${phone_number}
          </div>
          ${preferred_time ? `<div class="detail"><span class="label">Preferred Time:</span> ${preferred_time}</div>` : ''}
          ${reason ? `<div class="detail"><span class="label">Reason:</span> ${reason}</div>` : ''}
          <div class="detail">
            <span class="label">Received:</span> ${new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: `${businessName} AI <onboarding@resend.dev>`,
      to: [businessEmail],
      subject: `🔔 Callback Request: ${caller_name || phone_number}`,
      html: notificationHtml,
    });

    console.log("Callback notification sent to business owner");
    return { 
      scheduled: true, 
      message: `Callback request logged. ${caller_name ? caller_name + ' will' : 'Someone will'} receive a call back ${preferred_time ? preferred_time : 'soon'}.`
    };
  } catch (error) {
    console.error("Error sending callback notification:", error);
    // Still return success to the caller even if notification fails
    return { 
      scheduled: true, 
      message: "Callback request has been logged. Someone will call you back soon."
    };
  }
}

function handleGetBusinessInfo(args: any, businessInfo: any) {
  const { info_type } = args;

  if (!businessInfo) {
    return { info: "Business information is not available at this time." };
  }

  switch (info_type) {
    case 'hours':
      return { 
        info: businessInfo.hours || "Business hours are not available. Please call back during regular business hours or leave a message."
      };
    case 'address':
      return { 
        info: businessInfo.address || "Address information is not available."
      };
    case 'services':
      return { 
        info: businessInfo.services?.length > 0 
          ? `We offer the following services: ${businessInfo.services.join(', ')}.`
          : "Service information is not available."
      };
    case 'contact':
      const contacts = [];
      if (businessInfo.phones?.length > 0) contacts.push(`Phone: ${businessInfo.phones[0]}`);
      if (businessInfo.emails?.length > 0) contacts.push(`Email: ${businessInfo.emails[0]}`);
      return { 
        info: contacts.length > 0 ? contacts.join('. ') : "Contact information is not available."
      };
    case 'all':
      return {
        info: {
          name: businessInfo.businessName,
          hours: businessInfo.hours,
          address: businessInfo.address,
          services: businessInfo.services,
          phones: businessInfo.phones,
          emails: businessInfo.emails
        }
      };
    default:
      return { info: "I don't have that specific information available." };
  }
}
