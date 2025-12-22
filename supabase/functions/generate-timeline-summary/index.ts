import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, leadName, forceRefresh } = await req.json();

    if (!leadId) {
      return new Response(JSON.stringify({ error: 'leadId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for cached summary (valid for 1 hour)
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('lead_timeline_summaries')
        .select('*')
        .eq('lead_id', leadId)
        .single();

      if (cached) {
        const cacheAge = Date.now() - new Date(cached.generated_at).getTime();
        const oneHour = 60 * 60 * 1000;
        
        if (cacheAge < oneHour) {
          return new Response(JSON.stringify({
            summary: cached.summary,
            generatedAt: cached.generated_at,
            cached: true,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Fetch recent activity data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [activitiesRes, demoViewsRes, notesRes, tagsRes] = await Promise.all([
      supabase
        .from('activities')
        .select('*')
        .eq('related_to_id', leadId)
        .eq('related_to_type', 'lead')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('demo_views')
        .select('*')
        .eq('lead_id', leadId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('notes')
        .select('*')
        .eq('related_to_id', leadId)
        .eq('related_to_type', 'lead')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('lead_tags')
        .select('*')
        .eq('lead_id', leadId),
    ]);

    const activities = activitiesRes.data || [];
    const demoViews = demoViewsRes.data || [];
    const notes = notesRes.data || [];
    const tags = tagsRes.data || [];

    // Check if there's enough data to summarize
    const totalItems = activities.length + demoViews.length + notes.length;
    if (totalItems === 0) {
      return new Response(JSON.stringify({
        summary: null,
        error: 'No recent activity to summarize',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build context for AI
    const contextParts: string[] = [];

    if (demoViews.length > 0) {
      const maxWatch = Math.max(...demoViews.map((v: any) => v.progress_percent || 0));
      const viewTimes = demoViews.map((v: any) => new Date(v.created_at).getHours());
      const avgHour = Math.round(viewTimes.reduce((a: number, b: number) => a + b, 0) / viewTimes.length);
      contextParts.push(`Demo Views (${demoViews.length} total): Max watched ${maxWatch}%, typical viewing hour: ${avgHour}:00`);
    }

    if (activities.length > 0) {
      const typeCounts: Record<string, number> = {};
      activities.forEach((a: any) => {
        typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
      });
      const activitySummary = Object.entries(typeCounts)
        .map(([type, count]) => `${count} ${type}(s)`)
        .join(', ');
      contextParts.push(`Activities: ${activitySummary}`);
      
      // Add recent activity subjects
      const recentSubjects = activities.slice(0, 5).map((a: any) => a.subject).join('; ');
      contextParts.push(`Recent activity subjects: ${recentSubjects}`);
    }

    if (notes.length > 0) {
      contextParts.push(`Notes: ${notes.length} notes recorded`);
      const noteSnippets = notes.slice(0, 3).map((n: any) => n.content?.substring(0, 100)).join('; ');
      if (noteSnippets) {
        contextParts.push(`Note excerpts: ${noteSnippets}`);
      }
    }

    if (tags.length > 0) {
      const tagList = tags.map((t: any) => t.tag_text).join(', ');
      contextParts.push(`Tags: ${tagList}`);
    }

    // Analyze timing patterns
    const allTimestamps = [
      ...activities.map((a: any) => new Date(a.created_at)),
      ...demoViews.map((v: any) => new Date(v.created_at)),
    ];
    
    if (allTimestamps.length >= 2) {
      const hours = allTimestamps.map(d => d.getHours());
      const morningCount = hours.filter(h => h >= 6 && h < 12).length;
      const afternoonCount = hours.filter(h => h >= 12 && h < 18).length;
      const eveningCount = hours.filter(h => h >= 18 || h < 6).length;
      
      let peakTime = 'morning';
      if (afternoonCount > morningCount && afternoonCount > eveningCount) peakTime = 'afternoon';
      if (eveningCount > morningCount && eveningCount > afternoonCount) peakTime = 'evening';
      contextParts.push(`Peak activity time: ${peakTime}`);
    }

    const context = contextParts.join('\n');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const prompt = `Summarize the recent activity for lead "${leadName || 'this lead'}" in 2-3 sentences. Focus on:
- Engagement level and patterns
- Key activities and their outcomes
- Best time to reach out
- Overall assessment and recommended next action

Activity data (last 30 days):
${context}

Write a concise, actionable summary that helps a sales rep understand this lead's engagement and decide next steps. Be specific about numbers and timing.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a CRM assistant that helps sales reps understand lead engagement. Write concise, actionable summaries.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error('No summary generated');
    }

    // Cache the summary
    const { error: upsertError } = await supabase
      .from('lead_timeline_summaries')
      .upsert({
        lead_id: leadId,
        summary,
        generated_at: new Date().toISOString(),
      }, {
        onConflict: 'lead_id',
      });

    if (upsertError) {
      console.error('Failed to cache summary:', upsertError);
    }

    return new Response(JSON.stringify({
      summary,
      generatedAt: new Date().toISOString(),
      cached: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-timeline-summary:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to generate summary' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
