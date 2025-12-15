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

    console.log('[reconcile-monthly-expenses] Starting monthly reconciliation...');

    // Calculate previous month date range
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStart = prevMonth.toISOString().split('T')[0];
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    const monthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;

    console.log(`[reconcile-monthly-expenses] Reconciling for: ${prevMonthStart} to ${prevMonthEnd}`);

    // Get all services
    const { data: services, error: servicesError } = await supabase
      .from('expenses_services')
      .select('*')
      .neq('status', 'cancelled');

    if (servicesError) {
      console.error('[reconcile-monthly-expenses] Error fetching services:', servicesError);
      throw servicesError;
    }

    console.log(`[reconcile-monthly-expenses] Processing ${services?.length || 0} services`);

    const reconciled: any[] = [];

    for (const service of services || []) {
      let actualAmount = service.base_cost;
      let usageStats: any = {};

      // For usage-based services, aggregate from service_usage
      if (service.pricing_model === 'usage_based' && service.base_cost > 0) {
        const providerName = service.service_name.toLowerCase().split(' ')[0];
        
        const { data: usageData, error: usageError } = await supabase
          .from('service_usage')
          .select('cost_usd, duration_seconds, message_count')
          .ilike('provider', `%${providerName}%`)
          .gte('created_at', prevMonthStart)
          .lte('created_at', prevMonthEnd + 'T23:59:59.999Z');

        if (usageError) {
          console.error(`[reconcile-monthly-expenses] Usage query error for ${service.service_name}:`, usageError);
          // Create alert for missing data
          await supabase.from('usage_alerts').insert({
            alert_type: 'reconciliation_error',
            entity_type: 'expense_service',
            entity_id: service.id,
            message: `Could not reconcile usage for ${service.service_name}: ${usageError.message}`,
            metadata: { service_name: service.service_name, month: monthKey }
          });
        } else if (usageData && usageData.length > 0) {
          const totalCost = usageData.reduce((sum, row) => sum + (parseFloat(row.cost_usd) || 0), 0);
          const totalDuration = usageData.reduce((sum, row) => sum + (row.duration_seconds || 0), 0);
          const totalMessages = usageData.reduce((sum, row) => sum + (row.message_count || 0), 0);
          
          actualAmount = service.base_cost + totalCost;
          usageStats = {
            usage_cost: totalCost,
            total_duration_seconds: totalDuration,
            total_messages: totalMessages,
            usage_records: usageData.length
          };
        }
      }

      // Upsert expenses_monthly record
      const { error: upsertError } = await supabase
        .from('expenses_monthly')
        .upsert({
          service_id: service.id,
          month: monthKey,
          budgeted_amount: service.base_cost,
          actual_amount: actualAmount,
          notes: {
            reconciled_at: new Date().toISOString(),
            pricing_model: service.pricing_model,
            ...usageStats
          }
        }, {
          onConflict: 'service_id,month'
        });

      if (upsertError) {
        console.error(`[reconcile-monthly-expenses] Upsert error for ${service.service_name}:`, upsertError);
      } else {
        reconciled.push({
          service_name: service.service_name,
          budgeted: service.base_cost,
          actual: actualAmount
        });
      }
    }

    console.log(`[reconcile-monthly-expenses] Completed. Reconciled ${reconciled.length} services.`);

    return new Response(JSON.stringify({
      success: true,
      month: monthKey,
      reconciled_count: reconciled.length,
      details: reconciled
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[reconcile-monthly-expenses] Error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
