import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendSummaryRequest {
  channel: 'email' | 'sms';
  leadName: string;
  leadCompany?: string;
  leadStatus: string;
  tags: string[];
  notes: Array<{ content: string; createdAt: string }>;
  activities: Array<{ type: string; summary: string; eventAt: string }>;
  demoStatus?: {
    sent: boolean;
    viewed: boolean;
    progressPercent?: number;
  } | null;
  followUps: Array<{ reason: string; suggestionText: string }>;
}

function formatSummaryForEmail(data: SendSummaryRequest): string {
  const { leadName, leadCompany, leadStatus, tags, notes, activities, demoStatus, followUps } = data;
  
  let html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a1a; margin-bottom: 16px;">📞 Pre-Call Summary</h2>
      
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: #333;">Lead Overview</h3>
        <p style="margin: 4px 0;"><strong>${leadName}</strong></p>
        ${leadCompany ? `<p style="margin: 4px 0; color: #666;">🏢 ${leadCompany}</p>` : ''}
        <p style="margin: 4px 0; color: #666;">Status: ${leadStatus}</p>
        ${tags.length > 0 ? `<p style="margin: 4px 0; color: #666;">Tags: ${tags.join(', ')}</p>` : ''}
      </div>
  `;

  if (notes.length > 0) {
    html += `
      <div style="margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: #333;">📝 Recent Notes</h3>
        ${notes.map(n => `
          <div style="background: #fafafa; padding: 8px 12px; border-radius: 4px; margin-bottom: 8px; border-left: 3px solid #6366f1;">
            <p style="margin: 0; font-size: 14px;">${n.content}</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (activities.length > 0) {
    html += `
      <div style="margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: #333;">🔁 Recent Activity</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${activities.map(a => `<li style="margin-bottom: 4px; font-size: 14px;">${a.summary}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  if (followUps.length > 0) {
    html += `
      <div style="margin-bottom: 16px; background: #fef3c7; padding: 12px; border-radius: 8px;">
        <h3 style="margin: 0 0 8px 0; color: #92400e;">⚠️ Follow-Up Flags</h3>
        ${followUps.map(f => `
          <p style="margin: 4px 0; font-size: 14px;">
            <strong>${f.reason}</strong>: ${f.suggestionText}
          </p>
        `).join('')}
      </div>
    `;
  }

  if (demoStatus) {
    html += `
      <div style="margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: #333;">👁️ Demo Status</h3>
        <p style="margin: 4px 0; font-size: 14px;">
          Sent: ${demoStatus.sent ? '✅ Yes' : '❌ No'} | 
          Viewed: ${demoStatus.viewed ? '✅ Yes' : '❌ No'}
          ${demoStatus.progressPercent !== undefined ? ` | Progress: ${demoStatus.progressPercent}%` : ''}
        </p>
      </div>
    `;
  }

  html += `
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px; text-align: center;">
        Sent from EverLaunch CRM
      </p>
    </div>
  `;

  return html;
}

function formatSummaryForSMS(data: SendSummaryRequest): string {
  const { leadName, leadCompany, leadStatus, notes, activities, followUps, demoStatus } = data;
  
  let sms = `📞 Pre-Call: ${leadName}`;
  if (leadCompany) sms += ` (${leadCompany})`;
  sms += `\nStatus: ${leadStatus}`;
  
  if (notes.length > 0) {
    const notePreview = notes[0].content.substring(0, 60);
    sms += `\n📝 Note: ${notePreview}${notes[0].content.length > 60 ? '...' : ''}`;
  }
  
  if (activities.length > 0) {
    sms += `\n🔁 Last: ${activities[0].summary.substring(0, 50)}`;
  }
  
  if (followUps.length > 0) {
    sms += `\n⚠️ ${followUps[0].reason}`;
  }
  
  if (demoStatus) {
    sms += `\n👁️ Demo: ${demoStatus.viewed ? 'Viewed' : demoStatus.sent ? 'Sent' : 'Not sent'}`;
    if (demoStatus.progressPercent !== undefined) {
      sms += ` (${demoStatus.progressPercent}%)`;
    }
  }
  
  return sms;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const summaryData: SendSummaryRequest = await req.json();
    const { channel } = summaryData;

    if (channel === 'email') {
      if (!user.email) {
        return new Response(JSON.stringify({ error: 'No email on user profile' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const html = formatSummaryForEmail(summaryData);
      
      const emailResponse = await resend.emails.send({
        from: 'EverLaunch CRM <notifications@crm.localsearch365.com>',
        to: [user.email],
        subject: `📞 Pre-Call Summary: ${summaryData.leadName}`,
        html,
      });

      if (emailResponse.error) {
        console.error("Resend error:", emailResponse.error);
        return new Response(JSON.stringify({ error: emailResponse.error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log("Pre-call summary email sent to:", user.email);

      return new Response(JSON.stringify({ 
        success: true, 
        channel: 'email',
        recipient: user.email,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } 
    
    if (channel === 'sms') {
      // SMS not implemented yet - return error
      return new Response(JSON.stringify({ 
        error: 'SMS sending not yet configured. Please use email.',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid channel' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Error in send-precall-summary:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
