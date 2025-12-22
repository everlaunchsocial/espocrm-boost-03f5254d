import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Auto-tag definitions with conditions
const AUTO_TAGS = {
  'engaged-demo-watcher': {
    emoji: '👀',
    label: 'Engaged Demo Watcher',
    check: (data: any) => {
      const maxProgress = Math.max(...(data.demoViews?.map((v: any) => v.progress_percent || 0) || [0]));
      return maxProgress >= 80;
    }
  },
  'multiple-followups': {
    emoji: '📨',
    label: 'Multiple Follow-ups',
    check: (data: any) => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const recentFollowups = (data.activities || []).filter((a: any) => 
        a.type === 'followup' && new Date(a.created_at) >= twoWeeksAgo
      );
      return recentFollowups.length >= 2;
    }
  },
  'late-night-clicker': {
    emoji: '🌙',
    label: 'Late Night Clicker',
    check: (data: any) => {
      return (data.demoViews || []).some((v: any) => {
        const hour = new Date(v.created_at).getHours();
        return hour >= 0 && hour < 6;
      });
    }
  },
  'quick-responder': {
    emoji: '⚡',
    label: 'Quick Responder',
    check: (data: any) => {
      // Has demo engagement within 24 hours of creation
      if (!data.lead?.created_at || !data.demoViews?.length) return false;
      const leadCreated = new Date(data.lead.created_at);
      return data.demoViews.some((v: any) => {
        const viewTime = new Date(v.created_at);
        const hoursDiff = (viewTime.getTime() - leadCreated.getTime()) / (1000 * 60 * 60);
        return hoursDiff <= 24 && (v.progress_percent || 0) > 0;
      });
    }
  },
  'high-intent': {
    emoji: '🎯',
    label: 'High Intent',
    check: (data: any) => {
      // Multiple demo views or high engagement
      const viewCount = data.demoViews?.length || 0;
      const hasNotes = (data.notes?.length || 0) > 0;
      const hasMultipleActivities = (data.activities?.length || 0) >= 3;
      return viewCount >= 2 || (viewCount >= 1 && hasNotes && hasMultipleActivities);
    }
  },
  'needs-attention': {
    emoji: '⚠️',
    label: 'Needs Attention',
    check: (data: any) => {
      // Demo sent but no engagement for 3+ days
      const hasDemoSent = (data.activities || []).some((a: any) => 
        a.type === 'demo-sent' || a.subject?.toLowerCase().includes('demo sent')
      );
      if (!hasDemoSent) return false;
      
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const recentEngagement = (data.demoViews || []).some((v: any) => 
        new Date(v.created_at) >= threeDaysAgo
      );
      return !recentEngagement;
    }
  },
  'returning-visitor': {
    emoji: '🔄',
    label: 'Returning Visitor',
    check: (data: any) => {
      // Multiple demo views on different days
      const viewDates = (data.demoViews || []).map((v: any) => 
        new Date(v.created_at).toDateString()
      );
      const uniqueDates = new Set(viewDates);
      return uniqueDates.size >= 2;
    }
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId } = await req.json();

    if (!leadId) {
      return new Response(JSON.stringify({ error: 'leadId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError) {
      console.error('Failed to fetch lead:', leadError);
      return new Response(JSON.stringify({ error: 'Lead not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch related data in parallel
    const [demoViewsRes, activitiesRes, notesRes, existingTagsRes] = await Promise.all([
      supabase
        .from('demo_views')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false }),
      supabase
        .from('activities')
        .select('*')
        .eq('related_to_id', leadId)
        .eq('related_to_type', 'lead')
        .order('created_at', { ascending: false }),
      supabase
        .from('notes')
        .select('*')
        .eq('related_to_id', leadId)
        .eq('related_to_type', 'lead')
        .order('created_at', { ascending: false }),
      supabase
        .from('lead_tags')
        .select('*')
        .eq('lead_id', leadId),
    ]);

    const activityData = {
      lead,
      demoViews: demoViewsRes.data || [],
      activities: activitiesRes.data || [],
      notes: notesRes.data || [],
    };

    const existingTags = existingTagsRes.data || [];
    const existingTagTexts = existingTags.map((t: any) => t.tag_text);

    // Evaluate each auto-tag
    const tagsToAdd: string[] = [];
    const tagsToRemove: string[] = [];

    for (const [key, config] of Object.entries(AUTO_TAGS)) {
      const fullTag = `${config.emoji} ${config.label}`;
      const shouldHaveTag = config.check(activityData);
      const hasTag = existingTagTexts.includes(fullTag);

      if (shouldHaveTag && !hasTag) {
        tagsToAdd.push(fullTag);
      } else if (!shouldHaveTag && hasTag) {
        // Only remove auto-generated tags (those with matching format)
        const tagToRemove = existingTags.find((t: any) => t.tag_text === fullTag);
        if (tagToRemove) {
          tagsToRemove.push(tagToRemove.id);
        }
      }
    }

    // Insert new tags
    if (tagsToAdd.length > 0) {
      const { error: insertError } = await supabase
        .from('lead_tags')
        .insert(tagsToAdd.map(tag => ({
          lead_id: leadId,
          tag_text: tag,
          created_by: null, // System-generated
        })));

      if (insertError) {
        console.error('Failed to insert tags:', insertError);
      }
    }

    // Remove tags that no longer apply
    if (tagsToRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('lead_tags')
        .delete()
        .in('id', tagsToRemove);

      if (deleteError) {
        console.error('Failed to remove tags:', deleteError);
      }
    }

    console.log(`Auto-tagging for lead ${leadId}: added ${tagsToAdd.length}, removed ${tagsToRemove.length}`);

    return new Response(JSON.stringify({ 
      success: true,
      tagsAdded: tagsToAdd,
      tagsRemoved: tagsToRemove.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in auto-assign-lead-tags:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to auto-assign tags' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
