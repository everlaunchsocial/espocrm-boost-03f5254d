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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Use Authorization header for user context
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is super_admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check super_admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('global_role')
      .eq('user_id', user.id)
      .single();

    if (profile?.global_role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: super_admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { id, service_id, month, budgeted_amount, actual_amount, is_overdue, paid_at, invoice_url, notes } = body;

    console.log('[expenses-monthly-upsert] Processing:', { id, service_id, month });

    // Use service role for the actual update
    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const upsertData = {
      service_id,
      month,
      budgeted_amount,
      actual_amount,
      is_overdue: is_overdue ?? false,
      paid_at,
      invoice_url,
      notes: notes ?? {}
    };

    let result;
    if (id) {
      // Update existing
      const { data, error } = await supabaseService
        .from('expenses_monthly')
        .update(upsertData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Upsert by service_id + month
      const { data, error } = await supabaseService
        .from('expenses_monthly')
        .upsert(upsertData, { onConflict: 'service_id,month' })
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[expenses-monthly-upsert] Error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
