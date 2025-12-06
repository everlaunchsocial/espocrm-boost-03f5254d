import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Email address to receive call transcripts
const TRANSCRIPT_EMAIL = "john@localsearch365.com";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Vapi call-ended webhook received:', JSON.stringify(body, null, 2));

    // Extract call data from Vapi end-of-call report
    const message = body.message || body;
    const call = message.call || body.call || {};
    const transcript = message.transcript || body.transcript || '';
    const summary = message.summary || body.summary || '';
    const callerPhone = call.customer?.number || message.customer?.number || 'Unknown';
    const callDuration = call.duration || message.duration || 0;
    const callId = call.id || message.callId || 'unknown';
    const endedReason = message.endedReason || call.endedReason || 'unknown';

    console.log('Call ID:', callId);
    console.log('Caller phone:', callerPhone);
    console.log('Duration:', callDuration, 'seconds');
    console.log('Transcript length:', transcript.length);

    if (!transcript || transcript.length < 10) {
      console.log('No meaningful transcript to send');
      return new Response(
        JSON.stringify({ success: true, message: 'No transcript to send' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format duration as MM:SS
    const minutes = Math.floor(callDuration / 60);
    const seconds = callDuration % 60;
    const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Send email with transcript
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
            <p style="margin: 5px 0;"><strong>Ended:</strong> ${endedReason}</p>
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
      JSON.stringify({ success: true, emailSent: true }),
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
