import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadData {
  first_name: string;
  last_name?: string;
  phone?: string;
  email?: string;
  source: string;
  message?: string;
}

interface LeadRoutingSettings {
  lead_capture_enabled: boolean;
  lead_email: string | null;
  lead_sms_number: string | null;
  additional_notification_emails: string[];
  additional_notification_phones: string[];
  sms_notifications_enabled: boolean;
  business_hours: Record<string, { enabled: boolean; open: string; close: string }>;
  customer_timezone: string;
  after_hours_behavior: string;
  lead_sources_enabled: { voice: boolean; chat: boolean; form: boolean; callback: boolean };
  business_name: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customer_id, lead_data, is_test } = await req.json() as {
      customer_id: string;
      lead_data: LeadData;
      is_test?: boolean;
    };

    if (!customer_id || !lead_data) {
      return new Response(
        JSON.stringify({ error: 'customer_id and lead_data are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating lead and notifying for customer:', customer_id);
    console.log('Lead data:', lead_data);
    console.log('Is test:', is_test);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch customer routing settings
    const { data: customer, error: customerError } = await supabase
      .from('customer_profiles')
      .select(`
        lead_capture_enabled,
        lead_email,
        lead_sms_number,
        additional_notification_emails,
        additional_notification_phones,
        sms_notifications_enabled,
        business_hours,
        customer_timezone,
        after_hours_behavior,
        lead_sources_enabled,
        business_name
      `)
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      console.error('Customer not found:', customerError);
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = customer as LeadRoutingSettings;

    // Check if lead capture is enabled
    if (!settings.lead_capture_enabled && !is_test) {
      console.log('Lead capture disabled for customer');
      return new Response(
        JSON.stringify({ success: false, message: 'Lead capture is disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this source is enabled
    const sourceMap: Record<string, keyof typeof settings.lead_sources_enabled> = {
      'voice': 'voice',
      'phone': 'voice',
      'voice_call': 'voice',
      'chat': 'chat',
      'web_chat': 'chat',
      'form': 'form',
      'callback': 'callback',
      'test': 'voice', // Allow test notifications
    };
    
    const sourceKey = sourceMap[lead_data.source?.toLowerCase()] || 'voice';
    if (settings.lead_sources_enabled && !settings.lead_sources_enabled[sourceKey] && !is_test) {
      console.log(`Lead source ${lead_data.source} is disabled`);
      return new Response(
        JSON.stringify({ success: false, message: `Lead source ${lead_data.source} is disabled` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build notification recipients
    const emailRecipients: string[] = [];
    if (settings.lead_email) emailRecipients.push(settings.lead_email);
    if (settings.additional_notification_emails?.length) {
      emailRecipients.push(...settings.additional_notification_emails);
    }

    const smsRecipients: string[] = [];
    if (settings.sms_notifications_enabled) {
      if (settings.lead_sms_number) smsRecipients.push(settings.lead_sms_number);
      if (settings.additional_notification_phones?.length) {
        smsRecipients.push(...settings.additional_notification_phones);
      }
    }

    // Check business hours and after-hours behavior
    const now = new Date();
    const timezone = settings.customer_timezone || 'America/New_York';
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone }).toLowerCase();
    const currentTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: timezone });
    
    const todayHours = settings.business_hours?.[dayName];
    let isWithinBusinessHours = true;
    
    if (todayHours && !todayHours.enabled) {
      isWithinBusinessHours = false;
    } else if (todayHours) {
      isWithinBusinessHours = currentTime >= todayHours.open && currentTime <= todayHours.close;
    }

    const shouldNotifyNow = isWithinBusinessHours || settings.after_hours_behavior === 'notify';

    console.log('Business hours check:', { dayName, currentTime, isWithinBusinessHours, afterHoursBehavior: settings.after_hours_behavior, shouldNotifyNow });

    // Create lead record in usage_logs (following existing pattern)
    if (!is_test) {
      const { error: logError } = await supabase
        .from('usage_logs')
        .insert({
          customer_id,
          interaction_type: 'lead_captured',
          metadata: {
            first_name: lead_data.first_name,
            last_name: lead_data.last_name || '',
            phone: lead_data.phone || null,
            email: lead_data.email || null,
            source: lead_data.source,
            message: lead_data.message || null,
            pipeline_status: 'new_lead',
            captured_within_hours: isWithinBusinessHours,
          },
        });

      if (logError) {
        console.error('Error creating lead log:', logError);
        // Continue to send notifications even if log fails
      } else {
        console.log('Lead logged in usage_logs');
      }
    }

    // Send notifications
    let emailSent = false;
    let smsSent = false;

    // Send email notifications
    if (emailRecipients.length > 0 && shouldNotifyNow) {
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (resendKey) {
        const resend = new Resend(resendKey);
        
        const businessName = settings.business_name || 'Your AI Assistant';
        const leadName = `${lead_data.first_name}${lead_data.last_name ? ' ' + lead_data.last_name : ''}`;
        const isTestLabel = is_test ? '[TEST] ' : '';
        
        try {
          const emailResult = await resend.emails.send({
            from: 'EverLaunch AI <info@everlaunch.ai>',
            to: emailRecipients,
            subject: `${isTestLabel}🔔 New Lead: ${leadName} via ${lead_data.source}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; margin-bottom: 20px;">
                  ${isTestLabel ? '🧪 Test Notification' : '🔔 New Lead Captured'}
                </h2>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="margin: 0 0 15px 0; color: #333;">Contact Information</h3>
                  <p style="margin: 8px 0;"><strong>Name:</strong> ${leadName}</p>
                  ${lead_data.phone ? `<p style="margin: 8px 0;"><strong>Phone:</strong> <a href="tel:${lead_data.phone}">${lead_data.phone}</a></p>` : ''}
                  ${lead_data.email ? `<p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${lead_data.email}">${lead_data.email}</a></p>` : ''}
                  <p style="margin: 8px 0;"><strong>Source:</strong> ${lead_data.source}</p>
                </div>
                
                ${lead_data.message ? `
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                  <strong>Message/Notes:</strong>
                  <p style="margin: 8px 0 0 0;">${lead_data.message}</p>
                </div>
                ` : ''}
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="color: #666; font-size: 12px; margin: 0;">
                    This lead was captured by your AI assistant at ${businessName}.
                    ${!isWithinBusinessHours ? '<br><em>Note: This lead was captured outside business hours.</em>' : ''}
                  </p>
                </div>
              </div>
            `,
          });
          
          console.log('Email sent:', emailResult);
          emailSent = true;
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      } else {
        console.log('RESEND_API_KEY not configured, skipping email');
      }
    }

    // SMS notifications (placeholder - would integrate with Twilio/other SMS provider)
    if (smsRecipients.length > 0 && shouldNotifyNow) {
      // TODO: Integrate with SMS provider (Twilio, etc.)
      console.log('SMS notification would be sent to:', smsRecipients);
      // For now, just log that we would send SMS
      smsSent = false; // Set to true once SMS provider is integrated
    }

    return new Response(
      JSON.stringify({
        success: true,
        lead_logged: !is_test,
        email_sent: emailSent,
        sms_sent: smsSent,
        within_business_hours: isWithinBusinessHours,
        notifications_delayed: !shouldNotifyNow,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in create-lead-and-notify:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});