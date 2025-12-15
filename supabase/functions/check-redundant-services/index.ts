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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[check-redundant-services] Starting daily redundancy check...');

    // Get all active services with base_cost > 0
    const { data: services, error: servicesError } = await supabase
      .from('expenses_services')
      .select('id, service_name, base_cost, status, pricing_model')
      .eq('status', 'active')
      .gt('base_cost', 0);

    if (servicesError) {
      console.error('[check-redundant-services] Error fetching services:', servicesError);
      throw servicesError;
    }

    console.log(`[check-redundant-services] Found ${services?.length || 0} active services with base_cost > 0`);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    const redundantServices: string[] = [];
    const alerts: any[] = [];

    for (const service of services || []) {
      const providerName = service.service_name.toLowerCase().replace(/\s+/g, '');
      
      // Check service_usage for any usage in last 30 days
      const { data: usageData, error: usageError } = await supabase
        .from('service_usage')
        .select('id')
        .ilike('provider', `%${providerName.split(' ')[0]}%`)
        .gte('created_at', thirtyDaysAgoISO)
        .limit(1);

      if (usageError) {
        console.error(`[check-redundant-services] Error checking usage for ${service.service_name}:`, usageError);
        
        // Create admin alert for missing/error service_usage
        await supabase.from('usage_alerts').insert({
          alert_type: 'service_usage_error',
          entity_type: 'system',
          entity_id: service.id,
          message: `Failed to query service_usage for ${service.service_name}: ${usageError.message}`,
          metadata: { service_name: service.service_name, error: usageError.message }
        });
        continue;
      }

      const hasUsage = usageData && usageData.length > 0;
      
      if (!hasUsage) {
        console.log(`[check-redundant-services] No usage found for ${service.service_name} in last 30 days - flagging as redundant`);
        redundantServices.push(service.service_name);

        // Create usage_alert for redundant service
        alerts.push({
          alert_type: 'service_redundant',
          entity_type: 'expense_service',
          entity_id: service.id,
          threshold_value: 30, // days without usage
          current_value: 0, // usage count
          message: `${service.service_name} has no usage in 30 days but costs $${service.base_cost}/month. Consider cancellation.`,
          metadata: {
            service_name: service.service_name,
            base_cost: service.base_cost,
            pricing_model: service.pricing_model,
            potential_annual_savings: service.base_cost * 12
          }
        });
      }
    }

    // Insert alerts
    if (alerts.length > 0) {
      const { error: alertError } = await supabase.from('usage_alerts').insert(alerts);
      if (alertError) {
        console.error('[check-redundant-services] Error inserting alerts:', alertError);
      }
    }

    console.log(`[check-redundant-services] Completed. Found ${redundantServices.length} potentially redundant services:`, redundantServices);

    return new Response(JSON.stringify({
      success: true,
      checked_services: services?.length || 0,
      redundant_services: redundantServices,
      alerts_created: alerts.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[check-redundant-services] Error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
