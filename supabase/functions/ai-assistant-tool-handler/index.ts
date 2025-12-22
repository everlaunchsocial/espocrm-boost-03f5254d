import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { tool_name, arguments: args, userContext } = body;

    console.log(`Executing AI assistant tool: ${tool_name}`, args);
    console.log('User context:', userContext);

    let result: any;

    switch (tool_name) {
      case 'book_demo':
        result = await handleBookDemo(supabase, args, userContext);
        break;
      case 'send_email':
        result = await handleSendEmail(args, userContext);
        break;
      case 'get_appointments':
        result = await handleGetAppointments(supabase, args, userContext);
        break;
      case 'get_leads':
        result = await handleGetLeads(supabase, args, userContext);
        break;
      case 'create_task':
        result = await handleCreateTask(supabase, args, userContext);
        break;
      case 'get_follow_ups':
        result = await handleGetFollowUps(supabase, args, userContext);
        break;
      case 'get_demo_stats':
        result = await handleGetDemoStats(supabase, args, userContext);
        break;
      default:
        throw new Error(`Unknown tool: ${tool_name}`);
    }

    console.log(`Tool ${tool_name} result:`, result);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error executing AI assistant tool:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleBookDemo(supabase: any, args: any, userContext: any) {
  const { business_name, business_email, website_url, notes } = args;

  if (!userContext?.affiliateId) {
    return { success: false, message: "Only affiliates can book demos" };
  }

  try {
    const { data: demo, error } = await supabase
      .from('demos')
      .insert({
        affiliate_id: userContext.affiliateId,
        business_name,
        email: business_email || null,
        website_url: website_url || null,
        notes: notes || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating demo:', error);
      return { success: false, message: `Failed to create demo: ${error.message}` };
    }

    return {
      success: true,
      message: `Demo created for ${business_name}`,
      demo_id: demo.id
    };

  } catch (error) {
    console.error('Error in handleBookDemo:', error);
    return { success: false, message: 'Failed to book demo' };
  }
}

async function handleSendEmail(args: any, userContext: any) {
  const { recipient_email, recipient_name, subject, content, email_type } = args;

  if (!recipient_email) {
    return { success: false, message: "No email address provided" };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipient_email)) {
    return { success: false, message: "Invalid email address format" };
  }

  const senderName = userContext?.userName || 'EverLaunch Team';

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .footer { margin-top: 20px; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          ${recipient_name ? `<p>Hi ${recipient_name},</p>` : '<p>Hello,</p>'}
          ${content.replace(/\n/g, '<br>')}
          <p>Best regards,<br>${senderName}</p>
        </div>
        <div class="footer">
          <p>Sent via EverLaunch AI Assistant</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const emailResponse = await resend.emails.send({
      from: `${senderName} <onboarding@resend.dev>`,
      to: [recipient_email],
      subject: subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);
    return {
      success: true,
      message: `Email sent to ${recipient_name || recipient_email}`,
      emailId: (emailResponse as any).data?.id || 'sent'
    };

  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function handleGetAppointments(supabase: any, args: any, userContext: any) {
  const { date_range } = args;

  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (date_range) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      break;
    case 'tomorrow':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
      break;
    case 'this_week':
      const dayOfWeek = now.getDay();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - dayOfWeek));
      break;
    case 'next_week':
      const daysUntilNextWeek = 7 - now.getDay();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilNextWeek);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilNextWeek + 7);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  }

  try {
    const { data: bookings, error } = await supabase
      .from('calendar_bookings')
      .select('*')
      .gte('booking_date', startDate.toISOString().split('T')[0])
      .lt('booking_date', endDate.toISOString().split('T')[0])
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
      return { success: false, message: 'Failed to fetch appointments' };
    }

    if (!bookings || bookings.length === 0) {
      return {
        success: true,
        message: `No appointments found for ${date_range.replace('_', ' ')}`,
        appointments: []
      };
    }

    const formattedAppointments = bookings.map((b: any) => ({
      date: b.booking_date,
      time: b.booking_time,
      name: b.prospect_name,
      email: b.prospect_email,
      status: b.status
    }));

    return {
      success: true,
      message: `Found ${bookings.length} appointment(s) for ${date_range.replace('_', ' ')}`,
      appointments: formattedAppointments
    };

  } catch (error) {
    console.error('Error in handleGetAppointments:', error);
    return { success: false, message: 'Failed to fetch appointments' };
  }
}

async function handleGetLeads(supabase: any, args: any, userContext: any) {
  const { search_term, status_filter, limit = 10 } = args;

  try {
    let query = supabase
      .from('leads')
      .select('id, first_name, last_name, email, phone, status, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by affiliate if user is an affiliate
    if (userContext?.affiliateId) {
      query = query.eq('affiliate_id', userContext.affiliateId);
    }

    if (status_filter) {
      query = query.eq('status', status_filter);
    }

    if (search_term) {
      query = query.or(`first_name.ilike.%${search_term}%,last_name.ilike.%${search_term}%,email.ilike.%${search_term}%`);
    }

    const { data: leads, error } = await query;

    if (error) {
      console.error('Error fetching leads:', error);
      return { success: false, message: 'Failed to fetch leads' };
    }

    if (!leads || leads.length === 0) {
      return {
        success: true,
        message: search_term ? `No leads found matching "${search_term}"` : 'No leads found',
        leads: []
      };
    }

    const formattedLeads = leads.map((l: any) => ({
      id: l.id,
      name: `${l.first_name} ${l.last_name}`,
      email: l.email,
      phone: l.phone,
      status: l.status,
      created: new Date(l.created_at).toLocaleDateString()
    }));

    return {
      success: true,
      message: `Found ${leads.length} lead(s)`,
      leads: formattedLeads
    };

  } catch (error) {
    console.error('Error in handleGetLeads:', error);
    return { success: false, message: 'Failed to fetch leads' };
  }
}

async function handleCreateTask(supabase: any, args: any, userContext: any) {
  const { title, description, due_date, priority, related_lead_name } = args;

  // Parse due date
  let parsedDueDate: string | null = null;
  if (due_date) {
    const now = new Date();
    if (due_date === 'today') {
      parsedDueDate = now.toISOString();
    } else if (due_date === 'tomorrow') {
      now.setDate(now.getDate() + 1);
      parsedDueDate = now.toISOString();
    } else if (due_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      parsedDueDate = new Date(due_date).toISOString();
    }
  }

  // Find related lead if name provided
  let relatedLeadId: string | null = null;
  if (related_lead_name) {
    const { data: leads } = await supabase
      .from('leads')
      .select('id')
      .or(`first_name.ilike.%${related_lead_name}%,last_name.ilike.%${related_lead_name}%`)
      .limit(1);

    if (leads && leads.length > 0) {
      relatedLeadId = leads[0].id;
    }
  }

  try {
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description: description || null,
        due_date: parsedDueDate,
        priority: priority || 'medium',
        status: 'pending',
        related_to_type: relatedLeadId ? 'lead' : null,
        related_to_id: relatedLeadId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return { success: false, message: `Failed to create task: ${error.message}` };
    }

    return {
      success: true,
      message: `Task created: "${title}"${parsedDueDate ? ` due ${due_date}` : ''}`,
      task_id: task.id
    };

  } catch (error) {
    console.error('Error in handleCreateTask:', error);
    return { success: false, message: 'Failed to create task' };
  }
}

async function handleGetFollowUps(supabase: any, args: any, userContext: any) {
  const { date_range } = args;

  const now = new Date();
  let query = supabase
    .from('tasks')
    .select('id, title, description, due_date, priority, status, related_to_id')
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(20);

  if (date_range === 'overdue') {
    query = query.lt('due_date', now.toISOString());
  } else if (date_range === 'today') {
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    query = query.gte('due_date', now.toISOString().split('T')[0])
      .lt('due_date', endOfDay.toISOString());
  } else if (date_range === 'this_week') {
    const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - now.getDay()));
    query = query.lte('due_date', endOfWeek.toISOString());
  }

  try {
    const { data: tasks, error } = await query;

    if (error) {
      console.error('Error fetching follow-ups:', error);
      return { success: false, message: 'Failed to fetch follow-ups' };
    }

    if (!tasks || tasks.length === 0) {
      return {
        success: true,
        message: `No follow-ups ${date_range === 'overdue' ? 'overdue' : `due ${date_range.replace('_', ' ')}`}`,
        follow_ups: []
      };
    }

    const formattedTasks = tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      due: t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No date',
      priority: t.priority
    }));

    return {
      success: true,
      message: `Found ${tasks.length} follow-up(s) ${date_range === 'overdue' ? 'overdue' : `due ${date_range.replace('_', ' ')}`}`,
      follow_ups: formattedTasks
    };

  } catch (error) {
    console.error('Error in handleGetFollowUps:', error);
    return { success: false, message: 'Failed to fetch follow-ups' };
  }
}

async function handleGetDemoStats(supabase: any, args: any, userContext: any) {
  const { time_period } = args;

  const now = new Date();
  let startDate: Date;

  switch (time_period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'this_week':
      const dayOfWeek = now.getDay();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      break;
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'all_time':
      startDate = new Date(2020, 0, 1); // Far back enough
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  try {
    let query = supabase
      .from('demos')
      .select('id, status, created_at')
      .gte('created_at', startDate.toISOString());

    if (userContext?.affiliateId) {
      query = query.eq('affiliate_id', userContext.affiliateId);
    }

    const { data: demos, error } = await query;

    if (error) {
      console.error('Error fetching demo stats:', error);
      return { success: false, message: 'Failed to fetch demo statistics' };
    }

    const total = demos?.length || 0;
    const statusCounts: Record<string, number> = {};
    demos?.forEach((d: any) => {
      statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
    });

    return {
      success: true,
      message: `Demo stats for ${time_period.replace('_', ' ')}: ${total} total demos`,
      stats: {
        total,
        by_status: statusCounts,
        period: time_period
      }
    };

  } catch (error) {
    console.error('Error in handleGetDemoStats:', error);
    return { success: false, message: 'Failed to fetch demo statistics' };
  }
}
