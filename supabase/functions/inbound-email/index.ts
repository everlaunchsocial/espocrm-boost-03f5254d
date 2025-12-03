import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InboundEmail {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    // Parse the inbound email from Resend webhook
    const payload = await req.json() as InboundEmail;
    console.log("Received inbound email:", JSON.stringify(payload, null, 2));

    const { from, to, subject, text, html } = payload;
    
    // Extract sender email from "Name <email>" format
    const senderEmailMatch = from.match(/<([^>]+)>/) || [null, from];
    const senderEmail = senderEmailMatch[1] || from;
    const senderName = from.replace(/<[^>]+>/, '').trim();

    // Extract recipient email to find which sender this was sent to
    const recipientEmailMatch = to.match(/<([^>]+)>/) || [null, to];
    const recipientEmail = recipientEmailMatch[1] || to;

    // Look up the contact or lead by their email
    let entityId: string | null = null;
    let entityType: 'contact' | 'lead' | null = null;
    let entityName: string | null = null;

    // Check contacts first
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, first_name, last_name')
      .eq('email', senderEmail)
      .single();

    if (contact) {
      entityId = contact.id;
      entityType = 'contact';
      entityName = `${contact.first_name} ${contact.last_name}`;
    } else {
      // Check leads
      const { data: lead } = await supabase
        .from('leads')
        .select('id, first_name, last_name')
        .eq('email', senderEmail)
        .single();

      if (lead) {
        entityId = lead.id;
        entityType = 'lead';
        entityName = `${lead.first_name} ${lead.last_name}`;
      }
    }

    // Store the inbound email in the emails table
    const { data: emailRecord, error: emailError } = await supabase
      .from('emails')
      .insert({
        contact_id: entityId || 'unknown',
        sender_address: senderEmail,
        sender_name: senderName,
        to_email: recipientEmail,
        to_name: null,
        subject: subject || '(No subject)',
        body: html || text || '',
        status: 'received',
        tracking_id: crypto.randomUUID(),
      })
      .select()
      .single();

    if (emailError) {
      console.error("Error storing inbound email:", emailError);
    } else {
      console.log("Stored inbound email:", emailRecord.id);
    }

    // Log activity if we found the entity
    if (entityId && entityType && entityName) {
      await supabase.from('activities').insert({
        type: 'email',
        subject: `Reply received: ${subject || '(No subject)'}`,
        description: `Received email from ${senderName || senderEmail}`,
        related_to_type: entityType,
        related_to_id: entityId,
        related_to_name: entityName,
        is_system_generated: true,
      });
      console.log(`Logged activity for ${entityType}: ${entityId}`);
    }

    // Forward the email to the original sender's actual inbox
    // Look up the sender address to get the rep's forwarding email
    const { data: senderAddress } = await supabase
      .from('sender_addresses')
      .select('email, name')
      .eq('email', recipientEmail)
      .single();

    if (senderAddress && resend) {
      // Forward to the rep's actual email
      console.log(`Forwarding reply to: ${senderAddress.email}`);
      
      const forwardResult = await resend.emails.send({
        from: `CRM Forward <noreply@${recipientEmail.split('@')[1]}>`,
        to: [senderAddress.email],
        subject: `[CRM Reply] ${subject || '(No subject)'}`,
        html: `
          <div style="background: #f4f4f4; padding: 15px; border-left: 4px solid #0066cc; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              <strong>Reply from:</strong> ${senderName || senderEmail} (${senderEmail})<br>
              ${entityType && entityName ? `<strong>CRM ${entityType}:</strong> ${entityName}` : ''}
            </p>
          </div>
          <div style="padding: 15px 0;">
            ${html || text?.replace(/\n/g, '<br>') || '(No content)'}
          </div>
        `,
        replyTo: senderEmail,
      });

      if (forwardResult.error) {
        console.error("Error forwarding email:", forwardResult.error);
      } else {
        console.log("Email forwarded successfully:", forwardResult.data?.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Inbound email processed",
        entityId,
        entityType,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error processing inbound email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
