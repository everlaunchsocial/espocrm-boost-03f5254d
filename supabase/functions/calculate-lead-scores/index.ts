import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Lead {
  id: string;
  pipeline_status: string;
  created_at: string;
  updated_at: string;
  industry: string | null;
  service_category: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  has_website: boolean;
  affiliate_id: string | null;
}

interface DemoView {
  lead_id: string;
  created_at: string;
  progress_percent: number | null;
}

interface EmailEvent {
  lead_id: string;
  event_type: string;
  created_at: string;
}

interface Activity {
  related_to_id: string;
  type: string;
  created_at: string;
}

interface ScoreFactors {
  engagement: {
    demo_views: number;
    email_opens: number;
    replies: number;
    days_since_interaction: number;
  };
  urgency: {
    days_in_status: number;
    follow_ups_ignored: number;
    status_type: string;
  };
  fit: {
    industry_match: boolean;
    has_website: boolean;
    has_reviews: boolean;
    review_rating: number | null;
  };
}

function calculateEngagementScore(
  demoViews: number,
  emailOpens: number,
  hasReplied: boolean,
  daysSinceLastInteraction: number
): { score: number; factors: ScoreFactors['engagement'] } {
  let score = 0;

  // Demo views: +20 per view (max 40)
  const demoScore = Math.min(demoViews * 20, 40);
  score += demoScore;

  // Email opens: +10 per open (max 30)
  const emailScore = Math.min(emailOpens * 10, 30);
  score += emailScore;

  // Reply rate: +30 if replied
  if (hasReplied) {
    score += 30;
  }

  // Days since last interaction: -5 per day (max -20)
  const decayPenalty = Math.min(daysSinceLastInteraction * 5, 20);
  score = Math.max(0, score - decayPenalty);

  return {
    score: Math.min(score, 100),
    factors: {
      demo_views: demoViews,
      email_opens: emailOpens,
      replies: hasReplied ? 1 : 0,
      days_since_interaction: daysSinceLastInteraction,
    },
  };
}

function calculateUrgencyScore(
  pipelineStatus: string,
  daysInStatus: number,
  followUpsIgnored: number
): { score: number; factors: ScoreFactors['urgency'] } {
  let score = 0;

  // Status-based urgency
  if (pipelineStatus === 'demo_sent' && daysInStatus >= 3) {
    score += 30;
  }

  if (pipelineStatus === 'contact_attempted' && daysInStatus >= 7) {
    score += 40;
  }

  if (pipelineStatus === 'demo_engaged' && daysInStatus >= 2) {
    score += 25;
  }

  // Multiple follow-ups ignored: +20
  if (followUpsIgnored >= 2) {
    score += 20;
  }

  // Leads that are demo_engaged or ready_to_buy get urgency boost
  if (pipelineStatus === 'ready_to_buy') {
    score += 50;
  }

  return {
    score: Math.min(score, 100),
    factors: {
      days_in_status: daysInStatus,
      follow_ups_ignored: followUpsIgnored,
      status_type: pipelineStatus,
    },
  };
}

function calculateFitScore(
  industryMatch: boolean,
  hasWebsite: boolean,
  hasReviews: boolean,
  reviewRating: number | null
): { score: number; factors: ScoreFactors['fit'] } {
  let score = 0;

  // Industry match (target industries): 0-30
  if (industryMatch) {
    score += 30;
  }

  // Has website: 0-20
  if (hasWebsite) {
    score += 20;
  }

  // Has reviews: 0-20
  if (hasReviews) {
    score += 20;
  }

  // Good review rating (4+): 0-30
  if (reviewRating && reviewRating >= 4) {
    score += 30;
  } else if (reviewRating && reviewRating >= 3) {
    score += 15;
  }

  return {
    score: Math.min(score, 100),
    factors: {
      industry_match: industryMatch,
      has_website: hasWebsite,
      has_reviews: hasReviews,
      review_rating: reviewRating,
    },
  };
}

function calculateOverallScore(
  engagementScore: number,
  urgencyScore: number,
  fitScore: number
): number {
  // Weighted average: engagement (40%), urgency (40%), fit (20%)
  let overall = engagementScore * 0.4 + urgencyScore * 0.4 + fitScore * 0.2;

  // Bonus: +10 if all 3 categories >70
  if (engagementScore > 70 && urgencyScore > 70 && fitScore > 70) {
    overall += 10;
  }

  return Math.min(Math.round(overall), 100);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting lead score calculation...');

    // Check if scoring is enabled
    const { data: settings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'lead_scoring_enabled')
      .single();

    if (settings?.value === 'false') {
      console.log('Lead scoring is disabled');
      return new Response(
        JSON.stringify({ success: true, message: 'Lead scoring is disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all active leads (not lost/closed)
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .not('pipeline_status', 'in', '("lost_closed","customer_won")');

    if (leadsError) {
      throw new Error(`Failed to fetch leads: ${leadsError.message}`);
    }

    if (!leads || leads.length === 0) {
      console.log('No active leads to score');
      return new Response(
        JSON.stringify({ success: true, message: 'No active leads to score' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${leads.length} leads...`);

    // Fetch demo views for all leads
    const leadIds = leads.map(l => l.id);
    const { data: demoViews } = await supabase
      .from('demo_views')
      .select('lead_id, created_at, progress_percent')
      .in('lead_id', leadIds);

    // Fetch email events for all leads
    const { data: emailEvents } = await supabase
      .from('email_events')
      .select('lead_id, event_type, created_at')
      .in('lead_id', leadIds);

    // Fetch activities for all leads
    const { data: activities } = await supabase
      .from('activities')
      .select('related_to_id, type, created_at')
      .eq('related_to_type', 'lead')
      .in('related_to_id', leadIds);

    // Target industries for fit scoring
    const targetIndustries = ['home-improvement', 'hvac', 'plumbing', 'electrical', 'roofing', 'landscaping'];

    const now = new Date();
    const scores: Array<{
      lead_id: string;
      overall_score: number;
      engagement_score: number;
      urgency_score: number;
      fit_score: number;
      score_factors: ScoreFactors;
    }> = [];

    for (const lead of leads) {
      // Calculate engagement metrics
      const leadDemoViews = (demoViews || []).filter(d => d.lead_id === lead.id);
      const leadEmailEvents = (emailEvents || []).filter(e => e.lead_id === lead.id);
      const leadActivities = (activities || []).filter(a => a.related_to_id === lead.id);

      const demoViewCount = leadDemoViews.length;
      const emailOpenCount = leadEmailEvents.filter(e => e.event_type === 'open').length;
      const hasReplied = leadEmailEvents.some(e => e.event_type === 'reply') ||
                         leadActivities.some(a => a.type === 'email-reply' || a.type === 'sms-reply');

      // Calculate days since last interaction
      const allInteractions = [
        ...leadDemoViews.map(d => new Date(d.created_at)),
        ...leadEmailEvents.map(e => new Date(e.created_at)),
        ...leadActivities.map(a => new Date(a.created_at)),
      ];
      const lastInteraction = allInteractions.length > 0
        ? Math.max(...allInteractions.map(d => d.getTime()))
        : new Date(lead.created_at).getTime();
      const daysSinceLastInteraction = Math.floor((now.getTime() - lastInteraction) / (1000 * 60 * 60 * 24));

      // Calculate days in current status
      const daysInStatus = Math.floor((now.getTime() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60 * 24));

      // Count follow-ups that were ignored (sent but no response)
      const followUpActivities = leadActivities.filter(a => 
        a.type === 'email' || a.type === 'sms' || a.type === 'call'
      );
      const responseActivities = leadActivities.filter(a =>
        a.type === 'email-reply' || a.type === 'sms-reply' || a.type === 'call-answered'
      );
      const followUpsIgnored = Math.max(0, followUpActivities.length - responseActivities.length);

      // Calculate individual scores
      const engagement = calculateEngagementScore(
        demoViewCount,
        emailOpenCount,
        hasReplied,
        daysSinceLastInteraction
      );

      const urgency = calculateUrgencyScore(
        lead.pipeline_status,
        daysInStatus,
        followUpsIgnored
      );

      const industryMatch = targetIndustries.includes(lead.industry || '');
      const hasReviews = (lead.google_review_count || 0) > 0;

      const fit = calculateFitScore(
        industryMatch,
        lead.has_website || false,
        hasReviews,
        lead.google_rating
      );

      const overallScore = calculateOverallScore(
        engagement.score,
        urgency.score,
        fit.score
      );

      scores.push({
        lead_id: lead.id,
        overall_score: overallScore,
        engagement_score: engagement.score,
        urgency_score: urgency.score,
        fit_score: fit.score,
        score_factors: {
          engagement: engagement.factors,
          urgency: urgency.factors,
          fit: fit.factors,
        },
      });
    }

    console.log(`Calculated scores for ${scores.length} leads`);

    // Upsert scores to lead_scores table
    for (const score of scores) {
      const { error: upsertError } = await supabase
        .from('lead_scores')
        .upsert({
          lead_id: score.lead_id,
          overall_score: score.overall_score,
          engagement_score: score.engagement_score,
          urgency_score: score.urgency_score,
          fit_score: score.fit_score,
          score_factors: score.score_factors,
          last_calculated: new Date().toISOString(),
        }, {
          onConflict: 'lead_id',
        });

      if (upsertError) {
        console.error(`Failed to upsert score for lead ${score.lead_id}:`, upsertError);
      }
    }

    // Find leads that crossed the "hot" threshold (80+)
    const hotLeads = scores.filter(s => s.overall_score >= 80);
    if (hotLeads.length > 0) {
      console.log(`${hotLeads.length} leads crossed the "hot" threshold (80+)`);
      // TODO: Trigger notifications for hot leads
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Calculated scores for ${scores.length} leads`,
        hotLeads: hotLeads.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in calculate-lead-scores:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
