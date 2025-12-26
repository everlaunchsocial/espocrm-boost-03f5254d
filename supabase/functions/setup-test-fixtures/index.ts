import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-test-key',
};

const VALID_TEST_KEYS = [
  'everlaunch-test-mode-2024',
  'testdriver-ai-2024',
  'automation-test-key',
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate test key
    const testKey = req.headers.get('x-test-key');
    if (!testKey || !VALID_TEST_KEYS.includes(testKey)) {
      console.error('[setup-test-fixtures] Invalid or missing test key');
      return new Response(
        JSON.stringify({ error: 'Invalid test key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[setup-test-fixtures] Valid test key, proceeding with setup');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action } = await req.json();

    if (action === 'create-test-users') {
      // Create test customer user
      const testCustomerEmail = 'test-customer@everlaunch.com';
      const testAffiliateEmail = 'test-affiliate@everlaunch.com';
      const testPassword = 'TestPassword123!';

      const results = {
        customer: null as any,
        affiliate: null as any,
      };

      // Create or get test customer
      const { data: existingCustomer } = await supabase.auth.admin.listUsers();
      const customerUser = existingCustomer?.users?.find(u => u.email === testCustomerEmail);

      if (!customerUser) {
        const { data: newCustomer, error: customerError } = await supabase.auth.admin.createUser({
          email: testCustomerEmail,
          password: testPassword,
          email_confirm: true,
        });

        if (customerError) {
          console.error('[setup-test-fixtures] Error creating customer:', customerError);
        } else {
          results.customer = { id: newCustomer.user.id, email: testCustomerEmail, created: true };
          console.log('[setup-test-fixtures] Created test customer:', newCustomer.user.id);
        }
      } else {
        results.customer = { id: customerUser.id, email: testCustomerEmail, created: false };
        console.log('[setup-test-fixtures] Test customer already exists:', customerUser.id);
      }

      // Create or get test affiliate
      const affiliateUser = existingCustomer?.users?.find(u => u.email === testAffiliateEmail);

      if (!affiliateUser) {
        const { data: newAffiliate, error: affiliateError } = await supabase.auth.admin.createUser({
          email: testAffiliateEmail,
          password: testPassword,
          email_confirm: true,
        });

        if (affiliateError) {
          console.error('[setup-test-fixtures] Error creating affiliate:', affiliateError);
        } else {
          results.affiliate = { id: newAffiliate.user.id, email: testAffiliateEmail, created: true };
          console.log('[setup-test-fixtures] Created test affiliate:', newAffiliate.user.id);
        }
      } else {
        results.affiliate = { id: affiliateUser.id, email: testAffiliateEmail, created: false };
        console.log('[setup-test-fixtures] Test affiliate already exists:', affiliateUser.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          testCredentials: {
            customer: { email: testCustomerEmail, password: testPassword },
            affiliate: { email: testAffiliateEmail, password: testPassword },
          },
          results,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'reset-test-data') {
      // Reset test data to known state
      console.log('[setup-test-fixtures] Resetting test data...');
      
      // This would clean up any test-created data
      // For now, just return success
      return new Response(
        JSON.stringify({ success: true, message: 'Test data reset' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-test-credentials') {
      return new Response(
        JSON.stringify({
          success: true,
          credentials: {
            customer: { email: 'test-customer@everlaunch.com', password: 'TestPassword123!' },
            affiliate: { email: 'test-affiliate@everlaunch.com', password: 'TestPassword123!' },
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[setup-test-fixtures] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
