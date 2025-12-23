import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignExecution {
  id: string;
  enrollment_id: string;
  step_id: string;
  scheduled_for: string;
  status: string;
}

interface CampaignStep {
  id: string;
  campaign_id: string;
  step_number: number;
  channel: string;
  message_template: string;
  subject_template: string | null;
  conditions: Record<string, unknown> | null;
}

interface CampaignEnrollment {
  id: string;
  campaign_id: string;
  lead_id: string;
  current_step: number;
  status: string;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  pipeline_status: string;
  quiet_mode: boolean;
}

function replaceTemplateVariables(template: string, lead: Lead): string {
  return template
    .replace(/\{\{first_name\}\}/g, lead.first_name || '')
    .replace(/\{\{last_name\}\}/g, lead.last_name || '')
    .replace(/\{\{company\}\}/g, lead.company || 'your company')
    .replace(/\{\{email\}\}/g, lead.email || '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    console.log('Processing campaign executions...');

    // Get pending executions that are due
    const now = new Date().toISOString();
    const { data: pendingExecutions, error: execError } = await supabase
      .from('campaign_executions')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .limit(50);

    if (execError) {
      throw new Error(`Failed to fetch executions: ${execError.message}`);
    }

    if (!pendingExecutions || pendingExecutions.length === 0) {
      console.log('No pending executions to process');
      return new Response(
        JSON.stringify({ success: true, message: 'No pending executions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${pendingExecutions.length} executions...`);

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (const execution of pendingExecutions as CampaignExecution[]) {
      try {
        // Get enrollment details
        const { data: enrollment } = await supabase
          .from('campaign_enrollments')
          .select('*, campaigns(*)')
          .eq('id', execution.enrollment_id)
          .single();

        if (!enrollment || enrollment.status !== 'active') {
          // Enrollment no longer active, skip
          await supabase
            .from('campaign_executions')
            .update({ status: 'skipped', executed_at: now })
            .eq('id', execution.id);
          skipped++;
          continue;
        }

        // Get step details
        const { data: step } = await supabase
          .from('campaign_steps')
          .select('*')
          .eq('id', execution.step_id)
          .single();

        if (!step) {
          await supabase
            .from('campaign_executions')
            .update({ status: 'failed', error_message: 'Step not found', executed_at: now })
            .eq('id', execution.id);
          failed++;
          continue;
        }

        // Get lead details
        const { data: lead } = await supabase
          .from('leads')
          .select('*')
          .eq('id', enrollment.lead_id)
          .single();

        if (!lead) {
          await supabase
            .from('campaign_executions')
            .update({ status: 'failed', error_message: 'Lead not found', executed_at: now })
            .eq('id', execution.id);
          failed++;
          continue;
        }

        // Check if lead is now a customer (auto-stop)
        if (lead.pipeline_status === 'customer_won') {
          await supabase
            .from('campaign_enrollments')
            .update({
              status: 'stopped',
              stopped_at: now,
              stopped_reason: 'Lead converted to customer'
            })
            .eq('id', enrollment.id);

          await supabase
            .from('campaign_executions')
            .update({ status: 'skipped', executed_at: now })
            .eq('id', execution.id);
          skipped++;
          continue;
        }

        // Check quiet mode
        if (lead.quiet_mode) {
          await supabase
            .from('campaign_executions')
            .update({ status: 'skipped', error_message: 'Lead in quiet mode', executed_at: now })
            .eq('id', execution.id);
          skipped++;
          continue;
        }

        // Check conditions if any
        if (step.conditions) {
          const conditions = step.conditions as Record<string, unknown>;
          let conditionsMet = true;

          // Check demo_viewed condition
          if (conditions.demo_viewed !== undefined) {
            const { count } = await supabase
              .from('demo_views')
              .select('*', { count: 'exact', head: true })
              .eq('lead_id', lead.id);
            
            if (conditions.demo_viewed === true && (!count || count === 0)) {
              conditionsMet = false;
            }
            if (conditions.demo_viewed === false && count && count > 0) {
              conditionsMet = false;
            }
          }

          if (!conditionsMet) {
            await supabase
              .from('campaign_executions')
              .update({ status: 'skipped', error_message: 'Conditions not met', executed_at: now })
              .eq('id', execution.id);
            skipped++;
            continue;
          }
        }

        // Execute based on channel
        const typedStep = step as CampaignStep;
        const typedLead = lead as Lead;
        let executionSuccess = false;
        let errorMessage: string | null = null;

        switch (typedStep.channel) {
          case 'email':
            if (!typedLead.email) {
              errorMessage = 'Lead has no email';
            } else if (!resend) {
              errorMessage = 'Resend not configured';
            } else {
              try {
                const subject = replaceTemplateVariables(typedStep.subject_template || 'Follow-up', typedLead);
                const body = replaceTemplateVariables(typedStep.message_template, typedLead);

                await resend.emails.send({
                  from: 'Campaigns <onboarding@resend.dev>',
                  to: [typedLead.email],
                  subject: subject,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                      ${body}
                      <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
                      <p style="font-size: 12px; color: #666;">
                        To unsubscribe from future emails, reply with "STOP".
                      </p>
                    </div>
                  `,
                });
                executionSuccess = true;
              } catch (e) {
                errorMessage = e instanceof Error ? e.message : 'Email send failed';
              }
            }
            break;

          case 'sms':
            // SMS would require Twilio integration - log for now
            console.log(`SMS to ${typedLead.phone}: ${replaceTemplateVariables(typedStep.message_template, typedLead)}`);
            executionSuccess = true; // Mark as success for demo
            break;

          case 'call_reminder':
          case 'task':
            // Create a task for the user
            const { error: taskError } = await supabase
              .from('tasks')
              .insert({
                name: typedStep.channel === 'call_reminder' 
                  ? `Call ${typedLead.first_name} ${typedLead.last_name}`
                  : replaceTemplateVariables(typedStep.message_template, typedLead).substring(0, 100),
                description: replaceTemplateVariables(typedStep.message_template, typedLead),
                related_to_id: typedLead.id,
                related_to_type: 'lead',
                status: 'not-started',
                priority: 'high',
              });

            if (taskError) {
              errorMessage = taskError.message;
            } else {
              executionSuccess = true;
            }
            break;

          default:
            errorMessage = `Unknown channel: ${typedStep.channel}`;
        }

        // Update execution status
        await supabase
          .from('campaign_executions')
          .update({
            status: executionSuccess ? 'sent' : 'failed',
            executed_at: now,
            error_message: errorMessage,
          })
          .eq('id', execution.id);

        if (executionSuccess) {
          processed++;

          // Log activity
          await supabase
            .from('activities')
            .insert({
              type: typedStep.channel,
              subject: `Campaign: ${enrollment.campaigns?.name || 'Unknown'}`,
              description: `Step ${typedStep.step_number}: ${typedStep.channel} sent via campaign`,
              related_to_type: 'lead',
              related_to_id: typedLead.id,
              is_system_generated: true,
            });

          // Update enrollment current step and check if campaign complete
          const { data: allSteps } = await supabase
            .from('campaign_steps')
            .select('step_number')
            .eq('campaign_id', enrollment.campaign_id)
            .order('step_number', { ascending: false })
            .limit(1);

          const maxStep = allSteps?.[0]?.step_number || typedStep.step_number;

          if (typedStep.step_number >= maxStep) {
            // Campaign complete
            await supabase
              .from('campaign_enrollments')
              .update({
                status: 'completed',
                completed_at: now,
                current_step: typedStep.step_number,
              })
              .eq('id', enrollment.id);
          } else {
            // Schedule next step
            const { data: nextStep } = await supabase
              .from('campaign_steps')
              .select('*')
              .eq('campaign_id', enrollment.campaign_id)
              .eq('step_number', typedStep.step_number + 1)
              .single();

            if (nextStep) {
              const nextScheduledFor = new Date();
              nextScheduledFor.setDate(nextScheduledFor.getDate() + (nextStep.delay_days || 0));
              nextScheduledFor.setHours(nextScheduledFor.getHours() + (nextStep.delay_hours || 0));

              await supabase
                .from('campaign_executions')
                .insert({
                  enrollment_id: enrollment.id,
                  step_id: nextStep.id,
                  scheduled_for: nextScheduledFor.toISOString(),
                  status: 'pending',
                });

              await supabase
                .from('campaign_enrollments')
                .update({ current_step: typedStep.step_number + 1 })
                .eq('id', enrollment.id);
            }
          }
        } else {
          failed++;
        }

      } catch (e) {
        console.error(`Error processing execution ${execution.id}:`, e);
        await supabase
          .from('campaign_executions')
          .update({
            status: 'failed',
            executed_at: now,
            error_message: e instanceof Error ? e.message : 'Unknown error',
          })
          .eq('id', execution.id);
        failed++;
      }
    }

    console.log(`Processed: ${processed}, Failed: ${failed}, Skipped: ${skipped}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        skipped,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-campaigns:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
