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
    
    // Extract duration - Vapi provides durationSeconds, or we calculate from timestamps
    let callDuration = call.durationSeconds || message.durationSeconds || call.duration || message.duration || 0;
    
    // If still 0, try to calculate from start/end timestamps
    if (callDuration === 0 && call.startedAt && call.endedAt) {
      const startTime = new Date(call.startedAt).getTime();
      const endTime = new Date(call.endedAt).getTime();
      callDuration = Math.round((endTime - startTime) / 1000);
    }
    
    console.log('Extracted call duration:', callDuration, 'seconds');
    const callId = call.id || message.callId || 'unknown';
    const endedReason = message.endedReason || call.endedReason || 'unknown';
    const assistantId = call.assistantId || message.assistantId;
    const recordingUrl = call.recordingUrl || message.recordingUrl || null;

    // Extract metadata for attribution
    const metadata = call.metadata || message.metadata || {};
    let customerId = metadata.customer_id || call.metadata?.customer_id || null;
    const affiliateId = metadata.affiliate_id || null;
    const demoId = metadata.demo_id || null;
    
    // PHASE A: Detect if call came via Master Testing Line
    const viaTestingLine = metadata.via_testing_line === true || metadata.via_testing_line === 'true';
    console.log('Via testing line:', viaTestingLine, 'metadata:', JSON.stringify(metadata));

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
    
    // PHASE A: Force call_type to 'preview' if via testing line, otherwise use metadata or derive
    const callType = viaTestingLine ? 'preview' : (metadata.call_type || (customerId ? 'customer' : (demoId ? 'demo' : 'preview')));

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
            via_testing_line: viaTestingLine, // PHASE A: Track testing line calls
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
    // PHASE A: Do NOT charge minutes for testing line calls (preview)
    if (customerId && callDuration > 0 && !viaTestingLine && callType === 'customer') {
      const minutes = callDuration / 60;
      console.log('Charging customer minutes (not via testing line):', minutes);
      
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

    // If this is a demo call, increment voice_interaction_count and log activity
    if (demoId) {
      try {
        // Increment voice interaction count using RPC
        const { error: rpcError } = await supabase.rpc('increment_demo_voice_count', { demo_id: demoId });
        
        if (rpcError) {
          console.error('Error incrementing demo voice count:', rpcError);
          // Fallback: direct update
          await supabase.from('demos')
            .update({ status: 'engaged', updated_at: new Date().toISOString() })
            .eq('id', demoId);
        }

        // Get lead_id from demo for activity tracking
        const { data: demoInfo } = await supabase
          .from('demos')
          .select('lead_id, business_name')
          .eq('id', demoId)
          .single();

        if (demoInfo?.lead_id) {
          // Log activity for the phone call
          const { error: activityError } = await supabase
            .from('activities')
            .insert({
              type: 'call',
              subject: `Demo phone call - ${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')}`,
              description: summary || `Phone demo call for ${demoInfo.business_name}`,
              related_to_type: 'lead',
              related_to_id: demoInfo.lead_id,
              related_to_name: demoInfo.business_name,
              is_system_generated: true,
            });

          if (activityError) {
            console.error('Error logging demo call activity:', activityError);
          } else {
            console.log('Demo call activity logged for lead:', demoInfo.lead_id);
          }
        }

        console.log('Demo voice interaction incremented for demo:', demoId);
      } catch (demoErr) {
        console.error('Error updating demo engagement:', demoErr);
      }
    }

    // If this is a demo call, send transcript to prospect with tracking
    if (demoId && transcript && transcript.length >= 10) {
      try {
        // Look up demo details including prospect email, affiliate name and contact info
        const { data: demoData, error: demoError } = await supabase
          .from('demos')
          .select('*, leads(first_name, email), affiliates:affiliate_id(username, user_id)')
          .eq('id', demoId)
          .single();
        
        // Get affiliate's phone from profiles if available
        let affiliatePhone = '';
        if (demoData?.affiliates?.user_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('phone')
            .eq('user_id', demoData.affiliates.user_id)
            .single();
          affiliatePhone = profileData?.phone || '';
        }

        if (demoError) {
          console.error('Error fetching demo for transcript email:', demoError);
        } else if (demoData?.leads?.email) {
          const prospectEmail = demoData.leads.email;
          const prospectName = demoData.leads.first_name || 'there';
          const affiliateName = demoData.affiliates?.username || 'your rep';
          const businessName = demoData.business_name || 'your business';
          const personaName = demoData.ai_persona_name || 'Jenna';

          // Generate tracking ID for email open tracking
          const trackingId = crypto.randomUUID();
          const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-email-open?id=${trackingId}`;

          const minutes = Math.floor(callDuration / 60);
          const seconds = callDuration % 60;
          const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

          // Send transcript email to prospect
          const prospectEmailResponse = await resend.emails.send({
            from: "EverLaunch AI <info@send.everlaunch.ai>",
            to: [prospectEmail],
            subject: `Your ${businessName} AI Demo Transcript`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0F1C; color: #F8FAFC; padding: 30px; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #3B82F6; margin: 0;">EverLaunch AI</h1>
                  <p style="color: #94A3B8; margin-top: 5px;">Your Demo Call Transcript</p>
                </div>
                
                <p style="font-size: 16px; line-height: 1.6;">
                  Hi ${prospectName}!
                </p>
                
                <p style="font-size: 16px; line-height: 1.6;">
                  Thanks for taking the time to experience your personalized AI demo! Below is the transcript from your call with ${personaName}—this is similar to the transcript you would receive of your customers' calls when you sign up.
                </p>
                
                <div style="background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%); padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
                  <p style="margin: 0 0 10px 0; font-size: 16px;">
                    Ready to get started?
                  </p>
                  <a href="https://tryeverlaunch.com/${affiliateName}" style="display: inline-block; background: #ffffff; color: #1E40AF; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-bottom: 15px;">
                    Sign Up Today
                  </a>
                  <p style="margin: 15px 0 0 0; font-size: 14px; color: #E2E8F0;">
                    Or schedule a follow-up call with <strong>${affiliateName}</strong>${affiliatePhone ? ` at <a href="tel:${affiliatePhone}" style="color: #93C5FD;">${affiliatePhone}</a>` : ''}
                  </p>
                </div>
                
                <div style="background: #1E293B; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0; color: #94A3B8;"><strong>Call Duration:</strong> ${formattedDuration}</p>
                  <p style="margin: 5px 0; color: #94A3B8;"><strong>AI Persona:</strong> ${personaName}</p>
                  <p style="margin: 5px 0; color: #94A3B8;"><strong>Business:</strong> ${businessName}</p>
                </div>
                
                <div style="margin: 25px 0;">
                  <h3 style="color: #3B82F6; margin-bottom: 15px;">Call Transcript</h3>
                  <div style="background: #1E293B; border: 1px solid #334155; padding: 20px; border-radius: 8px; white-space: pre-wrap; line-height: 1.6; color: #E2E8F0; font-size: 14px;">
${transcript}
                  </div>
                </div>
                
                <p style="color: #64748B; font-size: 12px; margin-top: 30px; text-align: center;">
                  Demo arranged by ${affiliateName} • Powered by EverLaunch AI
                </p>
                
                <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
              </div>
            `,
          });

          console.log('Prospect transcript email sent:', prospectEmailResponse);

          // Save to emails table for tracking
          const { error: emailSaveError } = await supabase
            .from('emails')
            .insert({
              tracking_id: trackingId,
              contact_id: demoData.contact_id || demoData.lead_id || demoId,
              to_email: prospectEmail,
              to_name: prospectName,
              sender_address: 'info@everlaunch.ai',
              sender_name: 'EverLaunch AI',
              subject: `Your ${businessName} AI Demo Transcript`,
              body: `Demo transcript for ${businessName}`,
              status: 'sent',
              sent_at: new Date().toISOString(),
            });

          if (emailSaveError) {
            console.error('Error saving email record for tracking:', emailSaveError);
          } else {
            console.log('Email saved for open tracking, tracking_id:', trackingId);
          }
        }
      } catch (prospectEmailErr) {
        console.error('Failed to send prospect transcript email:', prospectEmailErr);
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
      from: "EverLaunch AI <info@send.everlaunch.ai>",
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
