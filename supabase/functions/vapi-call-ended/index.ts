import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const TRANSCRIPT_EMAIL = "info@everlaunch.ai";

// Vapi bundled cost estimate (DeepSeek + Deepgram + Cartesia)
const VAPI_COST_PER_MINUTE = 0.10; // $0.10/min fallback estimate

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Vapi call-ended webhook received:', JSON.stringify(body, null, 2));

    const message = body.message || body;
    const call = message.call || body.call || {};
    const transcript = message.transcript || body.transcript || '';
    const summary = message.summary || body.summary || '';
    const callerPhone = call.customer?.number || message.customer?.number || 'Unknown';
    const callDuration = call.duration || message.duration || 0;
    const callId = call.id || message.callId || 'unknown';
    const endedReason = message.endedReason || call.endedReason || 'unknown';
    const assistantId = call.assistantId || message.assistantId;
    const recordingUrl = call.recordingUrl || message.recordingUrl || null;

    // Extract metadata for attribution
    const metadata = call.metadata || message.metadata || {};
    let customerId = metadata.customer_id || call.metadata?.customer_id || null;
    const affiliateId = metadata.affiliate_id || null;
    const demoId = metadata.demo_id || null;

    // Extract Vapi cost data
    const costTotal = call.cost || message.cost || 0;
    const costBreakdown = call.costBreakdown || message.costBreakdown || {};
    const costLlm = costBreakdown.llm || 0;
    const costStt = costBreakdown.transcription || costBreakdown.stt || 0;
    const costTts = costBreakdown.voice || costBreakdown.tts || 0;
    const costTransport = costBreakdown.transport || 0;
    const costPlatform = costBreakdown.vapi || costBreakdown.platform || 0;

    // If no cost provided, estimate from duration
    const finalCostTotal = costTotal > 0 ? costTotal : (callDuration / 60) * VAPI_COST_PER_MINUTE;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If no customerId but we have assistantId, look up the customer via phone number records
    if (!customerId && assistantId) {
      const { data: phoneRecord } = await supabase
        .from('customer_phone_numbers')
        .select('customer_id')
        .eq('vapi_assistant_id', assistantId)
        .maybeSingle();
      
      if (phoneRecord?.customer_id) {
        customerId = phoneRecord.customer_id;
        console.log('Resolved customer_id from assistant_id:', customerId);
      }
    }
    
    const callType = metadata.call_type || (customerId ? 'customer' : (demoId ? 'demo' : 'preview'));

    // Save call to vapi_calls table with full cost data
    let savedCallId: string | null = null;
    if (transcript && transcript.length >= 10) {
      try {
        const { data: savedCall, error: saveError } = await supabase
          .from('vapi_calls')
          .insert({
            vapi_call_id: callId !== 'unknown' ? callId : null,
            customer_id: customerId || null,
            affiliate_id: affiliateId || null,
            demo_id: demoId || null,
            call_type: callType,
            caller_phone: callerPhone,
            transcript: transcript,
            summary: summary || null,
            duration_seconds: callDuration,
            ended_reason: endedReason,
            assistant_id: assistantId || null,
            recording_url: recordingUrl,
            cost_total: finalCostTotal,
            cost_llm: costLlm,
            cost_stt: costStt,
            cost_tts: costTts,
            cost_transport: costTransport,
            cost_platform: costPlatform,
            call_metadata: { original_body: body },
          })
          .select('id')
          .single();

        if (saveError) {
          console.error('Error saving call to vapi_calls:', saveError);
        } else {
          savedCallId = savedCall?.id;
          console.log('Call saved to vapi_calls:', savedCallId);

          // Insert into service_usage for unified tracking
          const { error: usageError } = await supabase
            .from('service_usage')
            .insert({
              provider: 'vapi',
              model: 'deepseek-chat',
              usage_type: 'phone_call',
              call_type: callType,
              customer_id: customerId || null,
              affiliate_id: affiliateId || null,
              demo_id: demoId || null,
              duration_seconds: callDuration,
              tokens_in: 0,
              tokens_out: 0,
              message_count: 0,
              cost_usd: finalCostTotal,
              cost_breakdown: {
                llm: costLlm,
                stt: costStt,
                tts: costTts,
                transport: costTransport,
                platform: costPlatform
              },
              session_id: callId,
              reference_id: savedCallId,
              metadata: {
                caller_phone: callerPhone,
                ended_reason: endedReason,
                assistant_id: assistantId
              }
            });

          if (usageError) {
            console.error('Error inserting service_usage:', usageError);
          } else {
            console.log('Service usage logged successfully');
          }

          // Trigger async quality analysis (non-blocking)
          supabase.functions.invoke('analyze-call-quality', {
            body: { call_id: savedCallId },
          }).then(result => {
            console.log('Quality analysis triggered:', result.data);
          }).catch(err => {
            console.error('Quality analysis failed:', err);
          });
        }
      } catch (saveErr) {
        console.error('Failed to save call:', saveErr);
      }
    }

    // If we have a customer_id, log minutes and check for alerts
    if (customerId && callDuration > 0) {
      const minutes = callDuration / 60;
      
      try {
        // Log minutes usage and get current status
        const { data: usageResult, error: usageError } = await supabase
          .rpc('log_minutes_usage_for_customer', {
            p_customer_id: customerId,
            p_minutes: minutes,
            p_occurred_at: new Date().toISOString(),
            p_cost_usd: finalCostTotal
          });

        if (usageError) {
          console.error('Error logging minutes usage:', usageError);
        } else if (usageResult && usageResult.length > 0) {
          const { new_minutes_used, minutes_included, percent_used } = usageResult[0];
          console.log(`Customer usage: ${new_minutes_used}/${minutes_included} minutes (${percent_used.toFixed(1)}%)`);

          // Check for usage thresholds and create alerts
          if (minutes_included > 0) {
            const thresholds = [
              { percent: 80, type: 'customer_at_80pct' },
              { percent: 95, type: 'customer_at_95pct' },
              { percent: 100, type: 'customer_over_limit' }
            ];

            for (const threshold of thresholds) {
              if (percent_used >= threshold.percent) {
                // Check if alert already exists
                const { data: existingAlert } = await supabase
                  .from('usage_alerts')
                  .select('id')
                  .eq('alert_type', threshold.type)
                  .eq('entity_id', customerId)
                  .is('resolved_at', null)
                  .maybeSingle();

                if (!existingAlert) {
                  const { error: alertError } = await supabase
                    .from('usage_alerts')
                    .insert({
                      alert_type: threshold.type,
                      entity_type: 'customer',
                      entity_id: customerId,
                      threshold_value: threshold.percent,
                      current_value: percent_used,
                      message: `Customer has used ${percent_used.toFixed(1)}% of their ${minutes_included} minute allocation.`,
                      metadata: {
                        minutes_used: new_minutes_used,
                        minutes_included: minutes_included,
                        last_call_id: savedCallId
                      }
                    });

                  if (alertError) {
                    console.error(`Error creating ${threshold.type} alert:`, alertError);
                  } else {
                    console.log(`Created ${threshold.type} alert for customer ${customerId}`);
                  }
                }
              }
            }
          }
        }
      } catch (usageErr) {
        console.error('Failed to log minutes usage:', usageErr);
      }
    }

    // If we have a customer_id, create lead and notify
    if (customerId && callerPhone && callerPhone !== 'Unknown') {
      try {
        const { data, error } = await supabase.functions.invoke('create-lead-and-notify', {
          body: {
            customer_id: customerId,
            lead_data: {
              first_name: 'Caller',
              last_name: callerPhone,
              phone: callerPhone,
              source: 'voice',
              message: summary || transcript?.substring(0, 500) || 'Phone call received',
            },
          },
        });

        if (error) {
          console.error('Error calling create-lead-and-notify:', error);
        } else {
          console.log('Lead notification sent:', data);
        }
      } catch (leadError) {
        console.error('Failed to create lead notification:', leadError);
      }
    }

    // Still send transcript email to admin
    if (!transcript || transcript.length < 10) {
      console.log('No meaningful transcript to send');
      return new Response(
        JSON.stringify({ success: true, message: 'No transcript to send' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const minutes = Math.floor(callDuration / 60);
    const seconds = callDuration % 60;
    const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const emailResponse = await resend.emails.send({
      from: "EverLaunch AI <info@everlaunch.ai>",
      to: [TRANSCRIPT_EMAIL],
      subject: `📞 Vapi Call Transcript - ${callerPhone} (${formattedDuration})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Phone Demo Call</h2>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>Caller:</strong> ${callerPhone}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${formattedDuration}</p>
            <p style="margin: 5px 0;"><strong>Call ID:</strong> ${callId}</p>
            <p style="margin: 5px 0;"><strong>Call Type:</strong> ${callType}</p>
            <p style="margin: 5px 0;"><strong>Ended:</strong> ${endedReason}</p>
            <p style="margin: 5px 0;"><strong>Cost:</strong> $${finalCostTotal.toFixed(4)}</p>
            ${customerId ? `<p style="margin: 5px 0;"><strong>Customer ID:</strong> ${customerId}</p>` : ''}
            ${affiliateId ? `<p style="margin: 5px 0;"><strong>Affiliate ID:</strong> ${affiliateId}</p>` : ''}
            ${demoId ? `<p style="margin: 5px 0;"><strong>Demo ID:</strong> ${demoId}</p>` : ''}
            ${savedCallId ? `<p style="margin: 5px 0;"><strong>DB Record:</strong> ${savedCallId}</p>` : ''}
          </div>
          
          ${summary ? `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #555;">Summary</h3>
            <p style="background: #e8f4fd; padding: 15px; border-radius: 8px;">${summary}</p>
          </div>
          ` : ''}
          
          <div>
            <h3 style="color: #555;">Full Transcript</h3>
            <div style="background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 8px; white-space: pre-wrap; line-height: 1.6;">
${transcript}
            </div>
          </div>
          
          <p style="color: #888; font-size: 12px; margin-top: 30px;">
            Sent by EverLaunch AI Phone Demo System
          </p>
        </div>
      `,
    });

    console.log('Transcript email sent:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailSent: true, 
        callSaved: !!savedCallId,
        costTracked: finalCostTotal,
        callType: callType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing call-ended webhook:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
