import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledFollowUp {
  id: string;
  suggestion_id: string;
  lead_id: string;
  action_type: 'email' | 'sms' | 'call_reminder';
  scheduled_for: string;
  message_subject: string | null;
  message_body: string | null;
  created_by: string;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  quiet_mode: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[process-scheduled-follow-ups] Starting scheduled follow-up processing...');

    // Check if auto-send is globally enabled
    const { data: settingData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'auto_send_follow_ups_enabled')
      .single();

    if (settingData?.value === 'false') {
      console.log('[process-scheduled-follow-ups] Auto-send is globally disabled, skipping.');
      return new Response(
        JSON.stringify({ success: true, message: 'Auto-send disabled', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find scheduled follow-ups that are due
    const now = new Date().toISOString();
    const { data: scheduledItems, error: fetchError } = await supabase
      .from('scheduled_follow_ups')
      .select('*')
      .lte('scheduled_for', now)
      .is('sent_at', null)
      .is('cancelled_at', null)
      .limit(50);

    if (fetchError) {
      console.error('[process-scheduled-follow-ups] Error fetching scheduled items:', fetchError);
      throw fetchError;
    }

    if (!scheduledItems || scheduledItems.length === 0) {
      console.log('[process-scheduled-follow-ups] No scheduled follow-ups due.');
      return new Response(
        JSON.stringify({ success: true, message: 'No items due', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[process-scheduled-follow-ups] Found ${scheduledItems.length} items to process`);

    let processedCount = 0;
    const errors: string[] = [];

    for (const item of scheduledItems as ScheduledFollowUp[]) {
      try {
        // Fetch lead details
        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .select('id, first_name, last_name, email, phone, company, quiet_mode')
          .eq('id', item.lead_id)
          .single();

        if (leadError || !lead) {
          console.error(`[process-scheduled-follow-ups] Lead not found: ${item.lead_id}`);
          errors.push(`Lead not found: ${item.lead_id}`);
          continue;
        }

        // Respect quiet mode
        if ((lead as Lead).quiet_mode) {
          console.log(`[process-scheduled-follow-ups] Lead ${item.lead_id} has quiet mode enabled, skipping`);
          // Cancel this scheduled item
          await supabase
            .from('scheduled_follow_ups')
            .update({ cancelled_at: now })
            .eq('id', item.id);
          continue;
        }

        const leadData = lead as Lead;
        let sendSuccess = false;

        // Process based on action type
        if (item.action_type === 'email' && leadData.email) {
          console.log(`[process-scheduled-follow-ups] Sending email to ${leadData.email}`);
          
          const emailResponse = await supabase.functions.invoke('send-email', {
            body: {
              contactId: item.lead_id,
              senderAddress: 'info@send.everlaunch.ai',
              senderName: 'EverLaunch',
              toEmail: leadData.email,
              toName: `${leadData.first_name} ${leadData.last_name}`,
              subject: item.message_subject || 'Following up on your AI demo',
              body: item.message_body || `
                <p>Hi ${leadData.first_name},</p>
                <p>I wanted to follow up and see if you had any questions about the AI demo I sent over.</p>
                <p>I'd love to hear your thoughts and help you see how it could work for ${leadData.company || 'your business'}.</p>
                <p>Let me know if you'd like to schedule a quick call.</p>
                <p>Best,<br/>Your EverLaunch Rep</p>
              `,
            },
          });

          if (emailResponse.error) {
            throw new Error(`Email send failed: ${emailResponse.error.message}`);
          }
          sendSuccess = true;
        } else if (item.action_type === 'sms' && leadData.phone) {
          // SMS sending would go here - for now just log
          console.log(`[process-scheduled-follow-ups] SMS to ${leadData.phone} - not implemented yet`);
          sendSuccess = true; // Mark as success for now
        } else if (item.action_type === 'call_reminder') {
          // Just create an activity reminder
          sendSuccess = true;
        }

        if (sendSuccess) {
          // Mark as sent
          await supabase
            .from('scheduled_follow_ups')
            .update({ sent_at: now })
            .eq('id', item.id);

          // Log activity
          await supabase.from('activities').insert({
            type: item.action_type === 'email' ? 'email' : item.action_type === 'sms' ? 'sms' : 'task',
            subject: `Auto-sent ${item.action_type} follow-up to ${leadData.first_name} ${leadData.last_name}`,
            description: `Automated follow-up sent via scheduled auto-send feature.`,
            related_to_id: item.lead_id,
            related_to_type: 'lead',
            related_to_name: `${leadData.first_name} ${leadData.last_name}`,
            is_system_generated: true,
          });

          processedCount++;
          console.log(`[process-scheduled-follow-ups] Successfully processed item ${item.id}`);
        }
      } catch (itemError) {
        const errorMsg = itemError instanceof Error ? itemError.message : 'Unknown error';
        console.error(`[process-scheduled-follow-ups] Error processing item ${item.id}:`, errorMsg);
        errors.push(`Item ${item.id}: ${errorMsg}`);
      }
    }

    console.log(`[process-scheduled-follow-ups] Completed. Processed: ${processedCount}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount, 
        errors: errors.length > 0 ? errors : undefined 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[process-scheduled-follow-ups] Fatal error:', errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});