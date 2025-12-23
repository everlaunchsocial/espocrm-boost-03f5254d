import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FollowUpInteraction {
  timestamp: Date;
  type: 'email_open' | 'email_reply' | 'sms_reply' | 'call_answered';
  dayOfWeek: number;
  hourOfDay: number;
  channelUsed: 'email' | 'sms' | 'phone';
  responseTimeMinutes?: number;
}

interface DayStats {
  dayOfWeek: number;
  dayName: string;
  successCount: number;
  totalCount: number;
  successRate: number;
}

interface TimeStats {
  hourOfDay: number;
  timeSlot: string;
  successCount: number;
  totalCount: number;
  successRate: number;
  avgResponseTime: number;
}

interface ChannelStats {
  channel: string;
  successCount: number;
  totalCount: number;
  successRate: number;
}

interface LeadPatternAnalysis {
  leadId: string;
  bestDays: string[];
  bestTimes: string[];
  optimalGapHours: number;
  channelPreference: string;
  confidence: number;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getTimeSlot(hour: number): string {
  if (hour >= 8 && hour < 12) return '8am-12pm';
  if (hour >= 12 && hour < 14) return '12pm-2pm';
  if (hour >= 14 && hour < 17) return '2pm-5pm';
  if (hour >= 17 && hour < 20) return '5pm-8pm';
  return 'Off-hours';
}

function calculateConfidence(sampleSize: number, recencyWeight: number): number {
  // Base confidence from sample size (max 60 points)
  const sizeFactor = Math.min(sampleSize / 20, 1) * 60;
  
  // Recency factor (max 40 points) - higher if more recent data
  const recencyFactor = recencyWeight * 40;
  
  return Math.round(sizeFactor + recencyFactor);
}

function analyzePatterns(interactions: FollowUpInteraction[]): LeadPatternAnalysis | null {
  if (interactions.length < 5) {
    return null;
  }

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  
  // Weight recent interactions higher
  const weightedInteractions = interactions.map(i => ({
    ...i,
    weight: new Date(i.timestamp) >= ninetyDaysAgo ? 2 : 1
  }));

  // Calculate recency weight (0-1 scale)
  const recentCount = weightedInteractions.filter(i => i.weight === 2).length;
  const recencyWeight = recentCount / interactions.length;

  // Analyze by day of week
  const dayStats: Map<number, { success: number; total: number }> = new Map();
  for (let d = 0; d < 7; d++) {
    dayStats.set(d, { success: 0, total: 0 });
  }

  // Analyze by hour of day
  const timeStats: Map<number, { success: number; total: number; responseTimes: number[] }> = new Map();
  for (let h = 0; h < 24; h++) {
    timeStats.set(h, { success: 0, total: 0, responseTimes: [] });
  }

  // Analyze by channel
  const channelStats: Map<string, { success: number; total: number }> = new Map();
  channelStats.set('email', { success: 0, total: 0 });
  channelStats.set('sms', { success: 0, total: 0 });
  channelStats.set('phone', { success: 0, total: 0 });

  // Analyze gaps between interactions
  const sortedInteractions = [...interactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const gaps: number[] = [];
  for (let i = 1; i < sortedInteractions.length; i++) {
    const gapMs = new Date(sortedInteractions[i].timestamp).getTime() - 
                  new Date(sortedInteractions[i - 1].timestamp).getTime();
    gaps.push(gapMs / (1000 * 60 * 60)); // Convert to hours
  }

  // Process each interaction
  for (const interaction of weightedInteractions) {
    const isSuccess = interaction.type === 'email_reply' || 
                      interaction.type === 'sms_reply' || 
                      interaction.type === 'call_answered';

    // Day stats
    const day = dayStats.get(interaction.dayOfWeek)!;
    day.total += interaction.weight;
    if (isSuccess) day.success += interaction.weight;

    // Time stats
    const time = timeStats.get(interaction.hourOfDay)!;
    time.total += interaction.weight;
    if (isSuccess) {
      time.success += interaction.weight;
      if (interaction.responseTimeMinutes) {
        time.responseTimes.push(interaction.responseTimeMinutes);
      }
    }

    // Channel stats
    const channel = channelStats.get(interaction.channelUsed)!;
    channel.total += interaction.weight;
    if (isSuccess) channel.success += interaction.weight;
  }

  // Find best days (top 2-3 with > 50% success rate)
  const dayResults: DayStats[] = [];
  dayStats.forEach((stats, day) => {
    if (stats.total > 0) {
      dayResults.push({
        dayOfWeek: day,
        dayName: DAY_NAMES[day],
        successCount: stats.success,
        totalCount: stats.total,
        successRate: stats.success / stats.total
      });
    }
  });
  dayResults.sort((a, b) => b.successRate - a.successRate);
  const bestDays = dayResults
    .filter(d => d.successRate >= 0.5 && d.totalCount >= 2)
    .slice(0, 3)
    .map(d => d.dayName);

  // Find best time slots
  const timeSlotStats: Map<string, { success: number; total: number; avgResponse: number }> = new Map();
  timeStats.forEach((stats, hour) => {
    const slot = getTimeSlot(hour);
    if (!timeSlotStats.has(slot)) {
      timeSlotStats.set(slot, { success: 0, total: 0, avgResponse: 0 });
    }
    const slotStats = timeSlotStats.get(slot)!;
    slotStats.success += stats.success;
    slotStats.total += stats.total;
    if (stats.responseTimes.length > 0) {
      const avgResp = stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length;
      slotStats.avgResponse = (slotStats.avgResponse + avgResp) / 2;
    }
  });

  const timeResults: TimeStats[] = [];
  timeSlotStats.forEach((stats, slot) => {
    if (stats.total > 0 && slot !== 'Off-hours') {
      timeResults.push({
        hourOfDay: 0,
        timeSlot: slot,
        successCount: stats.success,
        totalCount: stats.total,
        successRate: stats.success / stats.total,
        avgResponseTime: stats.avgResponse
      });
    }
  });
  timeResults.sort((a, b) => b.successRate - a.successRate);
  const bestTimes = timeResults
    .filter(t => t.successRate >= 0.4 && t.totalCount >= 2)
    .slice(0, 2)
    .map(t => t.timeSlot);

  // Determine channel preference
  const channelResults: ChannelStats[] = [];
  channelStats.forEach((stats, channel) => {
    if (stats.total > 0) {
      channelResults.push({
        channel,
        successCount: stats.success,
        totalCount: stats.total,
        successRate: stats.success / stats.total
      });
    }
  });
  channelResults.sort((a, b) => b.successRate - a.successRate);

  let channelPreference = 'mixed';
  if (channelResults.length > 0) {
    const topChannel = channelResults[0];
    // Only set preference if significantly better (>20% difference)
    if (channelResults.length > 1 && 
        topChannel.successRate - channelResults[1].successRate > 0.2 &&
        topChannel.totalCount >= 3) {
      channelPreference = topChannel.channel;
    } else if (channelResults.length === 1 && topChannel.totalCount >= 3) {
      channelPreference = topChannel.channel;
    }
  }

  // Calculate optimal gap (average of successful follow-up gaps)
  let optimalGapHours = 48; // Default to 48 hours
  if (gaps.length > 0) {
    // Filter out outliers (gaps > 7 days or < 1 hour)
    const validGaps = gaps.filter(g => g >= 1 && g <= 168);
    if (validGaps.length > 0) {
      optimalGapHours = Math.round(validGaps.reduce((a, b) => a + b, 0) / validGaps.length);
    }
  }

  // Calculate confidence score
  const confidence = calculateConfidence(interactions.length, recencyWeight);

  return {
    leadId: '',
    bestDays: bestDays.length > 0 ? bestDays : ['Tuesday', 'Wednesday', 'Thursday'],
    bestTimes: bestTimes.length > 0 ? bestTimes : ['2pm-5pm'],
    optimalGapHours,
    channelPreference,
    confidence
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting follow-up pattern analysis...');

    // Check if ML learning is enabled
    const { data: settings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'ml_learning_enabled')
      .single();

    if (settings?.value === 'false') {
      console.log('ML learning is disabled in settings');
      return new Response(JSON.stringify({ message: 'ML learning is disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all leads that need analysis (haven't been analyzed in last 24 hours or never analyzed)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, email, phone')
      .or(`last_pattern_analysis.is.null,last_pattern_analysis.lt.${oneDayAgo}`);

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      throw leadsError;
    }

    console.log(`Found ${leads?.length || 0} leads to analyze`);

    let analyzedCount = 0;
    let updatedCount = 0;
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

    for (const lead of leads || []) {
      try {
        const interactions: FollowUpInteraction[] = [];

        // Fetch email events (opens and clicks)
        const { data: emailEvents } = await supabase
          .from('email_events')
          .select('event_type, created_at')
          .eq('lead_id', lead.id)
          .gte('created_at', sixMonthsAgo);

        for (const event of emailEvents || []) {
          const date = new Date(event.created_at);
          interactions.push({
            timestamp: date,
            type: event.event_type === 'open' ? 'email_open' : 'email_reply',
            dayOfWeek: date.getDay(),
            hourOfDay: date.getHours(),
            channelUsed: 'email'
          });
        }

        // Fetch activities related to this lead
        const { data: activities } = await supabase
          .from('activities')
          .select('type, subject, created_at')
          .eq('related_to_id', lead.id)
          .eq('related_to_type', 'lead')
          .gte('created_at', sixMonthsAgo);

        for (const activity of activities || []) {
          const date = new Date(activity.created_at);
          let type: FollowUpInteraction['type'] = 'email_open';
          let channel: FollowUpInteraction['channelUsed'] = 'email';

          if (activity.type === 'email' || activity.subject?.toLowerCase().includes('email')) {
            type = 'email_reply';
            channel = 'email';
          } else if (activity.type === 'call' || activity.subject?.toLowerCase().includes('call')) {
            type = 'call_answered';
            channel = 'phone';
          } else if (activity.type === 'sms' || activity.subject?.toLowerCase().includes('sms')) {
            type = 'sms_reply';
            channel = 'sms';
          }

          interactions.push({
            timestamp: date,
            type,
            dayOfWeek: date.getDay(),
            hourOfDay: date.getHours(),
            channelUsed: channel
          });
        }

        // Fetch demo views for this lead
        const { data: demoViews } = await supabase
          .from('demo_views')
          .select('created_at, updated_at, watch_duration_seconds')
          .eq('lead_id', lead.id)
          .gte('created_at', sixMonthsAgo);

        for (const view of demoViews || []) {
          const date = new Date(view.created_at);
          // Only count as engagement if they watched for more than 10 seconds
          if (view.watch_duration_seconds && view.watch_duration_seconds > 10) {
            interactions.push({
              timestamp: date,
              type: 'email_open', // Treat demo view as similar to email open
              dayOfWeek: date.getDay(),
              hourOfDay: date.getHours(),
              channelUsed: 'email'
            });
          }
        }

        analyzedCount++;

        // Analyze patterns if we have enough data
        if (interactions.length >= 5) {
          const analysis = analyzePatterns(interactions);
          
          if (analysis && analysis.confidence >= 50) {
            const { error: updateError } = await supabase
              .from('leads')
              .update({
                learned_best_days: analysis.bestDays,
                learned_best_times: analysis.bestTimes,
                learned_optimal_gap_hours: analysis.optimalGapHours,
                learned_channel_preference: analysis.channelPreference,
                learning_confidence: analysis.confidence,
                last_pattern_analysis: new Date().toISOString()
              })
              .eq('id', lead.id);

            if (updateError) {
              console.error(`Error updating lead ${lead.id}:`, updateError);
            } else {
              updatedCount++;
              console.log(`Updated lead ${lead.id} with confidence ${analysis.confidence}%`);
            }
          } else {
            // Mark as analyzed even if confidence is too low
            await supabase
              .from('leads')
              .update({
                last_pattern_analysis: new Date().toISOString()
              })
              .eq('id', lead.id);
          }
        } else {
          // Mark as analyzed (not enough data)
          await supabase
            .from('leads')
            .update({
              last_pattern_analysis: new Date().toISOString()
            })
            .eq('id', lead.id);
        }
      } catch (leadError) {
        console.error(`Error analyzing lead ${lead.id}:`, leadError);
      }
    }

    console.log(`Analysis complete. Analyzed: ${analyzedCount}, Updated: ${updatedCount}`);

    return new Response(JSON.stringify({ 
      success: true,
      analyzed: analyzedCount,
      updated: updatedCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in analyze-follow-up-patterns:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
