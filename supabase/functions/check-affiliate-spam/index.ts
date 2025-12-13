import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Spam detection thresholds
const DEMO_THRESHOLD = 100;        // >100 demos in 30 days
const CONVERSION_THRESHOLD = 0;    // 0 conversions = spam
const LOOKBACK_DAYS = 30;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Running affiliate spam check...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - LOOKBACK_DAYS);

    // Get all affiliates with their demo counts and conversions in last 30 days
    const { data: affiliates, error: affError } = await supabase
      .from('affiliates')
      .select('id, username');

    if (affError) {
      console.error('Error fetching affiliates:', affError);
      throw affError;
    }

    const spamAlerts: Array<{
      affiliate_id: string;
      username: string;
      demo_count: number;
      conversion_count: number;
    }> = [];

    for (const affiliate of affiliates || []) {
      // Count demos in last 30 days
      const { count: demoCount, error: demoError } = await supabase
        .from('demos')
        .select('*', { count: 'exact', head: true })
        .eq('affiliate_id', affiliate.id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (demoError) {
        console.error(`Error counting demos for affiliate ${affiliate.id}:`, demoError);
        continue;
      }

      // Count conversions (demos with converted_at set)
      const { count: conversionCount, error: convError } = await supabase
        .from('demos')
        .select('*', { count: 'exact', head: true })
        .eq('affiliate_id', affiliate.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('converted_at', 'is', null);

      if (convError) {
        console.error(`Error counting conversions for affiliate ${affiliate.id}:`, convError);
        continue;
      }

      const demos = demoCount || 0;
      const conversions = conversionCount || 0;

      // Check if this affiliate is spamming
      if (demos > DEMO_THRESHOLD && conversions === CONVERSION_THRESHOLD) {
        console.log(`Spam detected: Affiliate ${affiliate.username} has ${demos} demos and ${conversions} conversions`);
        
        // Check if alert already exists for this affiliate (not resolved)
        const { data: existingAlert } = await supabase
          .from('usage_alerts')
          .select('id')
          .eq('alert_type', 'affiliate_spam')
          .eq('entity_id', affiliate.id)
          .is('resolved_at', null)
          .maybeSingle();

        if (!existingAlert) {
          spamAlerts.push({
            affiliate_id: affiliate.id,
            username: affiliate.username,
            demo_count: demos,
            conversion_count: conversions
          });
        }
      }
    }

    // Insert spam alerts
    if (spamAlerts.length > 0) {
      const alertsToInsert = spamAlerts.map(alert => ({
        alert_type: 'affiliate_spam',
        entity_type: 'affiliate',
        entity_id: alert.affiliate_id,
        threshold_value: DEMO_THRESHOLD,
        current_value: alert.demo_count,
        message: `Affiliate ${alert.username} created ${alert.demo_count} demos in the last 30 days with 0 conversions. Potential spam activity detected.`,
        metadata: {
          username: alert.username,
          demo_count: alert.demo_count,
          conversion_count: alert.conversion_count,
          lookback_days: LOOKBACK_DAYS
        }
      }));

      const { error: insertError } = await supabase
        .from('usage_alerts')
        .insert(alertsToInsert);

      if (insertError) {
        console.error('Error inserting spam alerts:', insertError);
        throw insertError;
      }

      console.log(`Created ${spamAlerts.length} spam alerts`);
    } else {
      console.log('No spam affiliates detected');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        affiliates_checked: affiliates?.length || 0,
        spam_alerts_created: spamAlerts.length,
        spam_affiliates: spamAlerts.map(a => a.username)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in check-affiliate-spam:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
