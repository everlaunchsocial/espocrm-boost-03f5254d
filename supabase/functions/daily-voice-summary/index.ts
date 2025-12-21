import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface UserPreference {
  user_id: string;
  enable_voice_summary: boolean;
  summary_delivery_time: string;
  include_followup_reminders: boolean;
}

interface SummaryData {
  newLeadsToday: number;
  followUpsDue: { name: string; company?: string }[];
  demosViewed: number;
  appointmentsToday: { name: string; time: string }[];
  notableActivity: { description: string }[];
  textSummary: string;
  voiceScript: string;
}

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

async function generateSummaryForUser(
  supabase: any,
  userId: string,
  includeFollowups: boolean
): Promise<SummaryData | null> {
  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  console.log(`Generating summary for user ${userId}, date range: ${todayStart} to ${todayEnd}`);

  // Fetch new leads created today
  const { data: leadsToday, error: leadsError } = await supabase
    .from('leads')
    .select('id, first_name, last_name, company')
    .gte('created_at', todayStart)
    .lte('created_at', todayEnd);

  if (leadsError) {
    console.error('Error fetching leads:', leadsError);
  }

  const newLeadsToday = leadsToday?.length || 0;

  // Fetch tasks due today (follow-ups)
  let followUpsDue: { name: string; company?: string }[] = [];
  if (includeFollowups) {
    const { data: tasksDue, error: tasksError } = await supabase
      .from('tasks')
      .select('id, name, related_to_name, related_to_type')
      .gte('due_date', todayStart)
      .lte('due_date', todayEnd)
      .neq('status', 'completed');

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
    }

    followUpsDue = tasksDue?.map((t: any) => ({
      name: t.related_to_name || t.name,
      company: undefined
    })) || [];
  }

  // Fetch demos viewed today
  const { data: demosViewedToday, error: demosError } = await supabase
    .from('demos')
    .select('id, business_name, view_count, last_viewed_at')
    .gte('last_viewed_at', todayStart)
    .lte('last_viewed_at', todayEnd);

  if (demosError) {
    console.error('Error fetching demos:', demosError);
  }

  const demosViewed = demosViewedToday?.length || 0;

  // Fetch upcoming appointments
  const { data: bookings, error: bookingsError } = await supabase
    .from('calendar_bookings')
    .select('id, prospect_name, booking_date, booking_time')
    .gte('booking_date', todayStr)
    .lte('booking_date', tomorrowStr)
    .eq('status', 'confirmed');

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
  }

  const appointmentsToday = bookings?.map((b: any) => ({
    name: b.prospect_name,
    time: b.booking_time
  })) || [];

  // Notable activity
  const notableActivity: { description: string }[] = [];
  demosViewedToday?.forEach((demo: any) => {
    if (demo.view_count >= 3) {
      notableActivity.push({
        description: `${demo.business_name} viewed your demo ${demo.view_count} times`
      });
    }
  });

  // Check if there's any activity worth reporting
  const hasActivity = newLeadsToday > 0 || 
    followUpsDue.length > 0 || 
    demosViewed > 0 || 
    appointmentsToday.length > 0 ||
    notableActivity.length > 0;

  if (!hasActivity) {
    console.log(`No activity to report for user ${userId}`);
    return null;
  }

  // Build text summary
  const parts: string[] = [];
  if (newLeadsToday > 0) {
    parts.push(`${newLeadsToday} new lead${newLeadsToday > 1 ? 's' : ''}`);
  }
  if (followUpsDue.length > 0) {
    parts.push(`${followUpsDue.length} follow-up${followUpsDue.length > 1 ? 's' : ''} pending`);
  }
  if (demosViewed > 0) {
    parts.push(`${demosViewed} demo view${demosViewed > 1 ? 's' : ''}`);
  }
  if (appointmentsToday.length > 0) {
    parts.push(`${appointmentsToday.length} appointment${appointmentsToday.length > 1 ? 's' : ''} today`);
  }

  const textSummary = parts.length > 0 
    ? parts.join(', ') + '.'
    : 'No activity to report yet today.';

  // Build voice script
  const voiceParts: string[] = [`${getGreeting()}!`];
  
  if (newLeadsToday > 0) {
    voiceParts.push(`You have ${newLeadsToday} new lead${newLeadsToday > 1 ? 's' : ''} today.`);
  }
  
  if (followUpsDue.length > 0) {
    voiceParts.push(`${followUpsDue.length} follow-up${followUpsDue.length > 1 ? 's are' : ' is'} due.`);
  }
  
  if (notableActivity.length > 0) {
    notableActivity.slice(0, 2).forEach(n => {
      voiceParts.push(n.description + '.');
    });
  }
  
  if (appointmentsToday.length > 0) {
    voiceParts.push(`You have ${appointmentsToday.length} appointment${appointmentsToday.length > 1 ? 's' : ''} scheduled.`);
  }

  const voiceScript = voiceParts.join(' ');

  return {
    newLeadsToday,
    followUpsDue,
    demosViewed,
    appointmentsToday,
    notableActivity,
    textSummary,
    voiceScript
  };
}

async function sendSummaryEmail(
  userEmail: string,
  userName: string,
  summary: SummaryData
): Promise<boolean> {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 20px 0; }
            .stat-card { background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; }
            .stat-value { font-size: 24px; font-weight: bold; color: #6366f1; }
            .stat-label { font-size: 12px; color: #6b7280; }
            .notable { background: white; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 3px solid #6366f1; }
            .footer { text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📊 Your Daily Summary</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div class="content">
              <p>Hi ${userName || 'there'},</p>
              <p>${summary.textSummary}</p>
              
              <div class="stat-grid">
                <div class="stat-card">
                  <div class="stat-value">${summary.newLeadsToday}</div>
                  <div class="stat-label">New Leads</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${summary.followUpsDue.length}</div>
                  <div class="stat-label">Follow-ups Due</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${summary.demosViewed}</div>
                  <div class="stat-label">Demo Views</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${summary.appointmentsToday.length}</div>
                  <div class="stat-label">Appointments</div>
                </div>
              </div>

              ${summary.notableActivity.length > 0 ? `
                <div class="notable">
                  <strong>Notable Activity:</strong>
                  <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                    ${summary.notableActivity.map(a => `<li>${a.description}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}

              ${summary.followUpsDue.length > 0 ? `
                <div class="notable">
                  <strong>Pending Follow-ups:</strong>
                  <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                    ${summary.followUpsDue.slice(0, 5).map(f => `<li>${f.name}${f.company ? ` (${f.company})` : ''}</li>`).join('')}
                    ${summary.followUpsDue.length > 5 ? `<li>...and ${summary.followUpsDue.length - 5} more</li>` : ''}
                  </ul>
                </div>
              ` : ''}
            </div>
            <div class="footer">
              <p>Powered by EverLaunch AI</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "EverLaunch <summaries@send.everlaunch.ai>",
      to: [userEmail],
      subject: `📊 Your Daily Summary - ${summary.textSummary}`,
      html: htmlContent,
    });

    console.log('Email sent successfully:', emailResponse);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

async function hasAlreadyDeliveredToday(
  supabase: any,
  userId: string
): Promise<boolean> {
  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();

  const { data, error } = await supabase
    .from('summary_deliveries')
    .select('id')
    .eq('user_id', userId)
    .eq('summary_type', 'daily')
    .gte('delivered_at', todayStart)
    .limit(1);

  if (error) {
    console.error('Error checking delivery status:', error);
    return false;
  }

  return data && data.length > 0;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Daily voice summary delivery triggered');

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users with voice summary enabled
    const { data: preferences, error: prefsError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('enable_voice_summary', true);

    if (prefsError) {
      console.error('Error fetching preferences:', prefsError);
      throw prefsError;
    }

    console.log(`Found ${preferences?.length || 0} users with voice summary enabled`);

    const results = {
      processed: 0,
      delivered: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const pref of (preferences || []) as UserPreference[]) {
      results.processed++;
      const userId = pref.user_id;

      try {
        // Check if already delivered today
        const alreadyDelivered = await hasAlreadyDeliveredToday(supabase, userId);
        if (alreadyDelivered) {
          console.log(`User ${userId} already received summary today, skipping`);
          results.skipped++;
          continue;
        }

        // Get user email from auth
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
        
        if (userError || !userData?.user?.email) {
          console.error(`Failed to get user email for ${userId}:`, userError);
          results.failed++;
          
          await supabase.from('summary_deliveries').insert({
            user_id: userId,
            delivery_method: 'email',
            summary_type: 'daily',
            status: 'failed',
            error_message: 'Failed to retrieve user email'
          });
          
          continue;
        }

        const userEmail = userData.user.email;
        const userName = userData.user.user_metadata?.name || 
                        userData.user.user_metadata?.full_name || 
                        userEmail.split('@')[0];

        // Generate summary
        const summary = await generateSummaryForUser(
          supabase, 
          userId, 
          pref.include_followup_reminders
        );

        if (!summary) {
          console.log(`No activity for user ${userId}, skipping delivery`);
          
          await supabase.from('summary_deliveries').insert({
            user_id: userId,
            delivery_method: 'email',
            summary_type: 'daily',
            status: 'skipped',
            error_message: 'No activity to report'
          });
          
          results.skipped++;
          continue;
        }

        // Send email
        const emailSent = await sendSummaryEmail(userEmail, userName, summary);

        if (emailSent) {
          await supabase.from('summary_deliveries').insert({
            user_id: userId,
            delivery_method: 'email',
            summary_type: 'daily',
            status: 'success',
            summary_content: summary.textSummary
          });
          
          results.delivered++;
          console.log(`Successfully delivered summary to ${userEmail}`);
        } else {
          await supabase.from('summary_deliveries').insert({
            user_id: userId,
            delivery_method: 'email',
            summary_type: 'daily',
            status: 'failed',
            error_message: 'Email send failed'
          });
          
          results.failed++;
        }

      } catch (userError) {
        console.error(`Error processing user ${userId}:`, userError);
        results.failed++;
        results.errors.push(`User ${userId}: ${userError instanceof Error ? userError.message : 'Unknown error'}`);
      }
    }

    console.log('Daily summary delivery complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error) {
    console.error("Error in daily-voice-summary function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
