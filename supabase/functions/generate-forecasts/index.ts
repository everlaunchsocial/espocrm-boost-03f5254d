import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Lead {
  id: string;
  pipeline_status: string;
  industry: string;
  company_name: string;
  created_at: string;
  updated_at: string;
}

interface LeadScore {
  lead_id: string;
  overall_score: number;
  engagement_score: number;
}

interface DemoView {
  lead_id: string;
  created_at: string;
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

// Industry-based historical close rates and deal values
const INDUSTRY_DATA: Record<string, { closeRate: number; avgDealValue: number; avgDaysToClose: number }> = {
  'restaurant': { closeRate: 0.32, avgDealValue: 2400, avgDaysToClose: 18 },
  'hvac': { closeRate: 0.28, avgDealValue: 3600, avgDaysToClose: 21 },
  'plumbing': { closeRate: 0.30, avgDealValue: 3000, avgDaysToClose: 19 },
  'legal': { closeRate: 0.22, avgDealValue: 6000, avgDaysToClose: 35 },
  'medical': { closeRate: 0.25, avgDealValue: 4800, avgDaysToClose: 28 },
  'dental': { closeRate: 0.27, avgDealValue: 4200, avgDaysToClose: 25 },
  'automotive': { closeRate: 0.29, avgDealValue: 3000, avgDaysToClose: 20 },
  'real_estate': { closeRate: 0.24, avgDealValue: 4800, avgDaysToClose: 30 },
  'insurance': { closeRate: 0.26, avgDealValue: 3600, avgDaysToClose: 24 },
  'default': { closeRate: 0.25, avgDealValue: 3000, avgDaysToClose: 22 },
};

// Stage progression weights for time-to-close calculation
const STAGE_PROGRESS: Record<string, number> = {
  'new_lead': 0,
  'contact_attempted': 0.15,
  'demo_created': 0.30,
  'demo_sent': 0.45,
  'demo_engaged': 0.60,
  'ready_to_buy': 0.80,
  'customer_won': 1.0,
  'lost_closed': 1.0,
};

function calculateLeadPrediction(
  lead: Lead,
  leadScore: LeadScore | undefined,
  demoViews: DemoView[],
  emailEvents: EmailEvent[],
  activities: Activity[]
): {
  probability: number;
  closeDays: number;
  dealValue: number;
  factors: Record<string, any>;
} {
  const industry = (lead.industry || 'default').toLowerCase();
  const industryData = INDUSTRY_DATA[industry] || INDUSTRY_DATA['default'];
  
  const factors: Record<string, any> = {
    industryCloseRate: industryData.closeRate,
    industry: lead.industry || 'Unknown',
  };

  // Base probability from industry
  let probability = industryData.closeRate;

  // Engagement multiplier from demo views
  const leadDemoViews = demoViews.filter(d => d.lead_id === lead.id);
  const demoViewBonus = Math.min(leadDemoViews.length * 0.15, 0.40);
  probability += demoViewBonus;
  factors.demoViews = leadDemoViews.length;
  factors.demoViewBonus = demoViewBonus;

  // Email engagement
  const leadEmailEvents = emailEvents.filter(e => e.lead_id === lead.id);
  const opens = leadEmailEvents.filter(e => e.event_type === 'open').length;
  const replies = leadEmailEvents.filter(e => e.event_type === 'reply').length;
  
  const emailOpenBonus = Math.min(opens * 0.05, 0.15);
  const replyBonus = replies > 0 ? 0.20 : 0;
  probability += emailOpenBonus + replyBonus;
  factors.emailOpens = opens;
  factors.emailReplies = replies;
  factors.emailBonus = emailOpenBonus + replyBonus;

  // Lead score factor
  if (leadScore) {
    const scoreMultiplier = leadScore.overall_score / 100;
    probability *= (0.5 + scoreMultiplier * 0.5); // Score affects 50% of probability
    factors.leadScore = leadScore.overall_score;
    factors.scoreMultiplier = scoreMultiplier;
  }

  // Decay factor based on days since last interaction
  const leadActivities = activities.filter(a => a.related_to_id === lead.id);
  let daysSinceLastInteraction = 30; // Default if no activities
  
  if (leadActivities.length > 0) {
    const lastActivity = leadActivities.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    daysSinceLastInteraction = Math.floor(
      (Date.now() - new Date(lastActivity.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
  }
  
  const decayFactor = Math.max(0.5, 1 - (daysSinceLastInteraction * 0.02));
  probability *= decayFactor;
  factors.daysSinceLastInteraction = daysSinceLastInteraction;
  factors.decayFactor = decayFactor;

  // Stage bonus
  const stageProgress = STAGE_PROGRESS[lead.pipeline_status] || 0;
  probability += stageProgress * 0.15;
  factors.pipelineStatus = lead.pipeline_status;
  factors.stageProgress = stageProgress;

  // Cap probability
  probability = Math.min(0.95, Math.max(0.05, probability));

  // Calculate time to close
  const remainingProgress = 1 - stageProgress;
  let baseDaysRemaining = industryData.avgDaysToClose * remainingProgress;
  
  // Adjust based on engagement level
  if (leadScore && leadScore.engagement_score > 70) {
    baseDaysRemaining *= 0.7; // Engaged leads close faster
  }
  
  const closeDays = Math.max(3, Math.round(baseDaysRemaining));
  factors.predictedDaysToClose = closeDays;

  // Calculate deal value
  let dealValue = industryData.avgDealValue;
  // Could adjust based on company size signals in the future
  factors.predictedDealValue = dealValue;

  return { probability, closeDays, dealValue, factors };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting forecast generation...');

    // Fetch active leads (exclude won/lost)
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, pipeline_status, industry, company_name, created_at, updated_at')
      .not('pipeline_status', 'in', '("customer_won","lost_closed")');

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      throw leadsError;
    }

    if (!leads || leads.length === 0) {
      console.log('No active leads found');
      return new Response(JSON.stringify({ success: true, message: 'No active leads' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${leads.length} leads...`);

    // Fetch lead scores
    const { data: leadScores } = await supabase
      .from('lead_scores')
      .select('lead_id, overall_score, engagement_score');

    // Fetch demo views from last 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: demoViews } = await supabase
      .from('demo_views')
      .select('lead_id, created_at')
      .gte('created_at', ninetyDaysAgo);

    // Fetch email events
    const { data: emailEvents } = await supabase
      .from('email_events')
      .select('lead_id, event_type, created_at')
      .gte('created_at', ninetyDaysAgo);

    // Fetch activities
    const { data: activities } = await supabase
      .from('activities')
      .select('related_to_id, type, created_at')
      .eq('related_to_type', 'lead')
      .gte('created_at', ninetyDaysAgo);

    // Generate predictions for each lead
    const predictions: any[] = [];
    let totalPredictedRevenue = 0;
    let totalPredictedCloses = 0;

    for (const lead of leads) {
      const leadScore = leadScores?.find(s => s.lead_id === lead.id);
      
      const prediction = calculateLeadPrediction(
        lead,
        leadScore,
        demoViews || [],
        emailEvents || [],
        activities || []
      );

      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + prediction.closeDays);

      predictions.push({
        lead_id: lead.id,
        predicted_close_probability: prediction.probability,
        predicted_close_date: closeDate.toISOString().split('T')[0],
        predicted_deal_value: prediction.dealValue,
        predicted_time_to_close_days: prediction.closeDays,
        prediction_factors: prediction.factors,
        last_updated: new Date().toISOString(),
      });

      // Aggregate for pipeline forecast
      if (prediction.probability >= 0.4) {
        totalPredictedRevenue += prediction.dealValue * prediction.probability;
        if (prediction.probability >= 0.5) {
          totalPredictedCloses += 1;
        }
      }
    }

    // Upsert lead predictions
    const { error: upsertError } = await supabase
      .from('lead_predictions')
      .upsert(predictions, { onConflict: 'lead_id' });

    if (upsertError) {
      console.error('Error upserting predictions:', upsertError);
      throw upsertError;
    }

    console.log(`Generated predictions for ${predictions.length} leads`);

    // Generate pipeline forecast for current month
    const now = new Date();
    const forecastData = {
      forecast_date: now.toISOString().split('T')[0],
      forecast_period: 'month',
      predicted_revenue: Math.round(totalPredictedRevenue * 100) / 100,
      confidence_interval_low: Math.round(totalPredictedRevenue * 0.7 * 100) / 100,
      confidence_interval_high: Math.round(totalPredictedRevenue * 1.3 * 100) / 100,
      predicted_closes: totalPredictedCloses,
      predicted_close_rate: leads.length > 0 ? totalPredictedCloses / leads.length : 0,
      factors: {
        totalLeads: leads.length,
        hotLeads: predictions.filter(p => p.predicted_close_probability >= 0.7).length,
        warmLeads: predictions.filter(p => p.predicted_close_probability >= 0.4 && p.predicted_close_probability < 0.7).length,
        coldLeads: predictions.filter(p => p.predicted_close_probability < 0.4).length,
      },
      generated_at: now.toISOString(),
    };

    const { error: forecastError } = await supabase
      .from('pipeline_forecasts')
      .insert(forecastData);

    if (forecastError) {
      console.error('Error inserting forecast:', forecastError);
      // Don't throw - predictions were saved successfully
    }

    console.log('Forecast generation complete');

    return new Response(JSON.stringify({ 
      success: true, 
      leadsProcessed: predictions.length,
      predictedRevenue: totalPredictedRevenue,
      predictedCloses: totalPredictedCloses,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in generate-forecasts:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
