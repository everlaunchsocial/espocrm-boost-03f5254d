import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, eventIds, regenerate } = await req.json();

    if (!leadId) {
      return new Response(
        JSON.stringify({ error: 'leadId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch recent timeline events for this lead
    let query = supabase
      .from('lead_timeline')
      .select('*')
      .eq('lead_id', leadId)
      .order('event_at', { ascending: false })
      .limit(10);

    if (eventIds && eventIds.length > 0) {
      query = query.in('id', eventIds);
    }

    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      console.error('Error fetching timeline events:', eventsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch timeline events' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ highlights: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing highlights unless regenerating
    if (!regenerate) {
      const eventIdList = events.map(e => e.id);
      const { data: existingHighlights } = await supabase
        .from('lead_timeline_highlights')
        .select('*')
        .eq('lead_id', leadId)
        .in('event_id', eventIdList)
        .order('created_at', { ascending: false });

      // Filter out events that already have recent highlights (< 48 hours old)
      const recentHighlightEventIds = new Set(
        (existingHighlights || [])
          .filter(h => {
            const age = Date.now() - new Date(h.created_at).getTime();
            return age < 48 * 60 * 60 * 1000; // 48 hours
          })
          .map(h => h.event_id)
      );

      const eventsToProcess = events.filter(e => !recentHighlightEventIds.has(e.id));

      if (eventsToProcess.length === 0 && existingHighlights && existingHighlights.length > 0) {
        // Return existing highlights
        return new Response(
          JSON.stringify({ highlights: existingHighlights.slice(0, 5) }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate new highlights using AI
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const eventsToSummarize = regenerate ? events : events.slice(0, 5);
    const highlights: Array<{
      lead_id: string;
      event_id: string;
      event_type: string;
      summary: string;
    }> = [];

    for (const event of eventsToSummarize) {
      const eventContext = `
Event Type: ${event.event_type}
Summary: ${event.summary}
Preview: ${event.preview_content || 'N/A'}
Metadata: ${JSON.stringify(event.metadata || {})}
Time: ${event.event_at}
`;

      const prompt = `Generate a brief, actionable one-line summary (max 60 chars) for this CRM timeline event. Use an action-oriented tone.

${eventContext}

Examples by type:
- Demo view: "Lead watched 92% of demo — follow-up recommended"
- Call: "Call lasted 4m 22s — no callback scheduled"
- Follow-up: "Follow-up sent about pricing — not yet opened"
- Note: "Internal note: Lead waiting for decision-maker"

Return ONLY the summary text, no quotes or formatting.`;

      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a CRM assistant. Generate brief, actionable summaries.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 100,
          }),
        });

        if (aiResponse.status === 429) {
          console.error('Rate limit exceeded');
          continue;
        }

        if (aiResponse.status === 402) {
          console.error('Payment required');
          continue;
        }

        if (!aiResponse.ok) {
          console.error('AI response error:', await aiResponse.text());
          continue;
        }

        const aiData = await aiResponse.json();
        const summary = aiData.choices?.[0]?.message?.content?.trim() || '';

        if (summary) {
          highlights.push({
            lead_id: leadId,
            event_id: event.id,
            event_type: event.event_type,
            summary: summary.slice(0, 100), // Limit length
          });
        }
      } catch (aiError) {
        console.error('Error generating AI summary for event:', event.id, aiError);
      }
    }

    // Upsert highlights to database
    if (highlights.length > 0) {
      for (const highlight of highlights) {
        const { error: upsertError } = await supabase
          .from('lead_timeline_highlights')
          .upsert(
            {
              ...highlight,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'lead_id,event_id' }
          );

        if (upsertError) {
          console.error('Error upserting highlight:', upsertError);
        }
      }
    }

    // Fetch all current highlights for this lead
    const { data: allHighlights } = await supabase
      .from('lead_timeline_highlights')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`Generated ${highlights.length} new highlights for lead ${leadId}`);

    return new Response(
      JSON.stringify({ highlights: allHighlights || highlights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-timeline-highlights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
