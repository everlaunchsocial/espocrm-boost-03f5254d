import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskToCreate {
  name: string;
  description: string;
  task_type: string;
  priority: string;
  status: string;
  due_date: string;
  related_to_id: string;
  related_to_type: string;
  related_to_name: string;
  is_auto_generated: boolean;
  ai_reasoning: string;
  estimated_duration_minutes: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { leadId, runForAll } = await req.json();
    
    console.log('Starting smart task generation', { leadId, runForAll });

    // Get leads to analyze
    let leadsQuery = supabase
      .from('leads')
      .select(`
        id, first_name, last_name, company, email, phone,
        status, pipeline_status, updated_at, created_at, notes
      `)
      .neq('pipeline_status', 'customer_won')
      .neq('pipeline_status', 'lost_closed');

    if (leadId) {
      leadsQuery = leadsQuery.eq('id', leadId);
    }

    const { data: leads, error: leadsError } = await leadsQuery.limit(100);
    if (leadsError) throw leadsError;

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ success: true, tasksCreated: 0, message: 'No leads to analyze' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing pending tasks to avoid duplicates
    const leadIds = leads.map(l => l.id);
    const { data: existingTasks } = await supabase
      .from('tasks')
      .select('id, related_to_id, name, status')
      .in('related_to_id', leadIds)
      .eq('status', 'pending');

    const existingTaskMap = new Map<string, Set<string>>();
    for (const task of existingTasks || []) {
      if (!existingTaskMap.has(task.related_to_id)) {
        existingTaskMap.set(task.related_to_id, new Set());
      }
      existingTaskMap.get(task.related_to_id)!.add(task.name.toLowerCase());
    }

    // Get recent demo views
    const { data: recentDemoViews } = await supabase
      .from('demo_views')
      .select('lead_id, created_at, demo_id')
      .in('lead_id', leadIds)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const demoViewMap = new Map<string, any>();
    for (const view of recentDemoViews || []) {
      if (!demoViewMap.has(view.lead_id)) {
        demoViewMap.set(view.lead_id, view);
      }
    }

    // Get sentiment data
    const { data: sentimentData } = await supabase
      .from('emotional_journey')
      .select('lead_id, current_emotional_state, trend, risk_level')
      .in('lead_id', leadIds);

    const sentimentMap = new Map<string, any>();
    for (const s of sentimentData || []) {
      sentimentMap.set(s.lead_id, s);
    }

    // Generate tasks
    const tasksToCreate: TaskToCreate[] = [];
    const now = new Date();

    for (const lead of leads) {
      const leadName = `${lead.first_name} ${lead.last_name}`;
      const existingTaskNames = existingTaskMap.get(lead.id) || new Set();
      const lastUpdated = new Date(lead.updated_at);
      const daysSinceUpdate = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));

      // Rule 1: Demo viewed in last 24 hours - follow up
      const demoView = demoViewMap.get(lead.id);
      if (demoView) {
        const viewTime = new Date(demoView.created_at);
        const hoursSinceView = (now.getTime() - viewTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceView >= 2 && hoursSinceView <= 24) {
          const taskName = `Follow up on demo view: ${leadName}`;
          if (!existingTaskNames.has(taskName.toLowerCase())) {
            const dueDate = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
            tasksToCreate.push({
              name: taskName,
              description: `${leadName} viewed the demo. Follow up to discuss their interest and answer questions.`,
              task_type: 'call',
              priority: 'high',
              status: 'pending',
              due_date: dueDate.toISOString(),
              related_to_id: lead.id,
              related_to_type: 'lead',
              related_to_name: leadName,
              is_auto_generated: true,
              ai_reasoning: `Lead viewed demo ${Math.round(hoursSinceView)} hours ago. Hot leads should be contacted quickly.`,
              estimated_duration_minutes: 15,
            });
          }
        }
      }

      // Rule 2: Hot lead with positive sentiment - send contract
      const sentiment = sentimentMap.get(lead.id);
      if (sentiment?.current_emotional_state === 'very_positive' || sentiment?.current_emotional_state === 'positive') {
        if (lead.pipeline_status === 'ready_to_buy' || lead.pipeline_status === 'demo_engaged') {
          const taskName = `Send contract to hot lead: ${leadName}`;
          if (!existingTaskNames.has(taskName.toLowerCase())) {
            tasksToCreate.push({
              name: taskName,
              description: `${leadName} shows strong buying signals. Send contract or proposal to close the deal.`,
              task_type: 'email',
              priority: 'urgent',
              status: 'pending',
              due_date: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
              related_to_id: lead.id,
              related_to_type: 'lead',
              related_to_name: leadName,
              is_auto_generated: true,
              ai_reasoning: `Lead has positive sentiment (${sentiment.current_emotional_state}) and is in ${lead.pipeline_status} stage.`,
              estimated_duration_minutes: 20,
            });
          }
        }
      }

      // Rule 3: Declining sentiment - address concerns
      if (sentiment?.trend === 'declining' && sentiment?.risk_level !== 'none') {
        const taskName = `Address concerns: ${leadName}`;
        if (!existingTaskNames.has(taskName.toLowerCase())) {
          tasksToCreate.push({
            name: taskName,
            description: `${leadName}'s sentiment is declining. Reach out to address any concerns before losing the deal.`,
            task_type: 'call',
            priority: sentiment.risk_level === 'high' ? 'urgent' : 'high',
            status: 'pending',
            due_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            related_to_id: lead.id,
            related_to_type: 'lead',
            related_to_name: leadName,
            is_auto_generated: true,
            ai_reasoning: `Lead sentiment is ${sentiment.trend} with ${sentiment.risk_level} risk. Intervention needed.`,
            estimated_duration_minutes: 20,
          });
        }
      }

      // Rule 4: No contact in 7+ days for active leads
      if (daysSinceUpdate >= 7 && daysSinceUpdate < 30) {
        if (['contacted', 'demo_created', 'demo_sent'].includes(lead.pipeline_status)) {
          const taskName = `Weekly check-in: ${leadName}`;
          if (!existingTaskNames.has(taskName.toLowerCase())) {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);
            
            tasksToCreate.push({
              name: taskName,
              description: `It's been ${daysSinceUpdate} days since last contact with ${leadName}. Time for a check-in.`,
              task_type: 'call',
              priority: 'medium',
              status: 'pending',
              due_date: tomorrow.toISOString(),
              related_to_id: lead.id,
              related_to_type: 'lead',
              related_to_name: leadName,
              is_auto_generated: true,
              ai_reasoning: `No activity in ${daysSinceUpdate} days. Regular check-ins maintain engagement.`,
              estimated_duration_minutes: 15,
            });
          }
        }
      }

      // Rule 5: Cold lead re-engagement (30+ days)
      if (daysSinceUpdate >= 30) {
        const taskName = `Re-engage cold lead: ${leadName}`;
        if (!existingTaskNames.has(taskName.toLowerCase())) {
          const dueDate = new Date(now);
          dueDate.setDate(dueDate.getDate() + 3);
          
          tasksToCreate.push({
            name: taskName,
            description: `${leadName} has been inactive for ${daysSinceUpdate} days. Send a re-engagement email with new value proposition.`,
            task_type: 'email',
            priority: 'low',
            status: 'pending',
            due_date: dueDate.toISOString(),
            related_to_id: lead.id,
            related_to_type: 'lead',
            related_to_name: leadName,
            is_auto_generated: true,
            ai_reasoning: `Lead dormant for ${daysSinceUpdate} days. Re-engagement can revive interest.`,
            estimated_duration_minutes: 15,
          });
        }
      }

      // Rule 6: Competitor mentioned in notes
      if (lead.notes && /competitor|callrail|dialpad|smith\.ai|ruby|answering service/i.test(lead.notes)) {
        const taskName = `Review battle card: ${leadName}`;
        if (!existingTaskNames.has(taskName.toLowerCase())) {
          tasksToCreate.push({
            name: taskName,
            description: `Competitor was mentioned in notes for ${leadName}. Review battle card and prepare competitive response.`,
            task_type: 'administrative',
            priority: 'high',
            status: 'pending',
            due_date: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(),
            related_to_id: lead.id,
            related_to_type: 'lead',
            related_to_name: leadName,
            is_auto_generated: true,
            ai_reasoning: 'Competitor mentioned in lead notes. Prepare competitive positioning.',
            estimated_duration_minutes: 20,
          });
        }
      }
    }

    // Insert tasks in batch
    if (tasksToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('tasks')
        .insert(tasksToCreate);

      if (insertError) {
        console.error('Error inserting tasks:', insertError);
        throw insertError;
      }
    }

    console.log(`Generated ${tasksToCreate.length} smart tasks`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tasksCreated: tasksToCreate.length,
        tasks: tasksToCreate.map(t => ({ name: t.name, priority: t.priority })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in generate-smart-tasks:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
