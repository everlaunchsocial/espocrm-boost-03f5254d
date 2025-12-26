import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

// Tool definitions for the AI
const tools = [
  {
    type: "function",
    function: {
      name: "create_test_customer",
      description: "Create a test customer under a specific affiliate with a subscription plan. Only creates records with test emails.",
      parameters: {
        type: "object",
        properties: {
          affiliate_username: {
            type: "string",
            description: "The username of the affiliate to create the customer under"
          },
          plan_code: {
            type: "string",
            enum: ["starter", "pro", "enterprise"],
            description: "The subscription plan code for the customer"
          }
        },
        required: ["affiliate_username", "plan_code"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "verify_commissions",
      description: "Verify that commissions were correctly calculated for a customer. Shows commission amounts at each level.",
      parameters: {
        type: "object",
        properties: {
          customer_id: {
            type: "string",
            description: "The UUID of the customer to verify commissions for"
          }
        },
        required: ["customer_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "clear_test_data",
      description: "Clear all test data from the database. Only affects records where email contains 'test'.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  }
];

// Execute tools
async function executeCreateTestCustomer(supabase: any, args: { affiliate_username: string; plan_code: string }) {
  const logs: string[] = [];
  
  logs.push(`🔍 Looking up affiliate: ${args.affiliate_username}`);
  
  // Get affiliate by username
  const { data: affiliate, error: affError } = await supabase
    .from('affiliates')
    .select('id, username, parent_affiliate_id')
    .eq('username', args.affiliate_username.toLowerCase())
    .single();
  
  if (affError || !affiliate) {
    return { success: false, logs: [...logs, `❌ Affiliate not found: ${args.affiliate_username}`], error: `Affiliate "${args.affiliate_username}" not found` };
  }
  
  logs.push(`✅ Found affiliate: ${affiliate.username} (${affiliate.id})`);
  
  // Get the plan
  logs.push(`🔍 Looking up plan: ${args.plan_code}`);
  const { data: plan, error: planError } = await supabase
    .from('customer_plans')
    .select('*')
    .eq('code', args.plan_code)
    .single();
  
  if (planError || !plan) {
    return { success: false, logs: [...logs, `❌ Plan not found: ${args.plan_code}`], error: `Plan "${args.plan_code}" not found` };
  }
  
  logs.push(`✅ Found plan: ${plan.name} ($${plan.monthly_price}/mo)`);
  
  // Generate test customer data
  const timestamp = Date.now();
  const testEmail = `test_customer_${timestamp}@test.everlaunch.com`;
  const testName = `Test Customer ${timestamp}`;
  
  logs.push(`📝 Creating test customer: ${testName}`);
  logs.push(`📧 Email: ${testEmail}`);
  
  // Create customer profile
  const { data: customer, error: custError } = await supabase
    .from('customer_profiles')
    .insert({
      affiliate_id: affiliate.id,
      customer_plan_id: plan.id,
      business_name: `Test Business ${timestamp}`,
      contact_name: testName,
      lead_email: testEmail,
      phone: '+1555000' + String(timestamp).slice(-4),
      payment_received_at: new Date().toISOString(),
      onboarding_stage: 'completed',
      minutes_included: plan.minutes_included,
      minutes_used: 0
    })
    .select()
    .single();
  
  if (custError) {
    return { success: false, logs: [...logs, `❌ Failed to create customer: ${custError.message}`], error: custError.message };
  }
  
  logs.push(`✅ Customer created: ${customer.id}`);
  
  // Distribute commissions
  logs.push(`💰 Distributing commissions for $${plan.monthly_price}...`);
  
  const { error: commError } = await supabase.rpc('distribute_commissions', {
    p_customer_id: customer.id,
    p_gross_amount: plan.monthly_price,
    p_event_type: 'test_sale'
  });
  
  if (commError) {
    logs.push(`⚠️ Commission distribution warning: ${commError.message}`);
  } else {
    logs.push(`✅ Commissions distributed`);
  }
  
  // Fetch created commissions
  const { data: commissions } = await supabase
    .from('affiliate_commissions')
    .select('*, affiliates(username)')
    .eq('customer_id', customer.id);
  
  if (commissions && commissions.length > 0) {
    logs.push(`📊 Commissions created:`);
    commissions.forEach((c: any) => {
      logs.push(`   Level ${c.commission_level}: $${c.amount} → ${c.affiliates?.username || 'unknown'}`);
    });
  }
  
  return {
    success: true,
    logs,
    result: {
      customer_id: customer.id,
      customer_email: testEmail,
      affiliate_username: affiliate.username,
      plan: plan.name,
      amount: plan.monthly_price,
      commissions_created: commissions?.length || 0
    }
  };
}

async function executeVerifyCommissions(supabase: any, args: { customer_id: string }) {
  const logs: string[] = [];
  
  logs.push(`🔍 Looking up customer: ${args.customer_id}`);
  
  // Get customer
  const { data: customer, error: custError } = await supabase
    .from('customer_profiles')
    .select('*, customer_plans(*), affiliates(username)')
    .eq('id', args.customer_id)
    .single();
  
  if (custError || !customer) {
    return { success: false, logs: [...logs, `❌ Customer not found`], error: 'Customer not found' };
  }
  
  logs.push(`✅ Found customer: ${customer.contact_name || customer.lead_email}`);
  logs.push(`   Affiliate: ${customer.affiliates?.username || 'none'}`);
  logs.push(`   Plan: ${customer.customer_plans?.name || 'none'}`);
  
  // Get commissions
  logs.push(`💰 Fetching commissions...`);
  
  const { data: commissions, error: commError } = await supabase
    .from('affiliate_commissions')
    .select('*, affiliates(username, parent_affiliate_id)')
    .eq('customer_id', args.customer_id)
    .order('commission_level');
  
  if (commError) {
    return { success: false, logs: [...logs, `❌ Error fetching commissions: ${commError.message}`], error: commError.message };
  }
  
  if (!commissions || commissions.length === 0) {
    logs.push(`⚠️ No commissions found for this customer`);
    return { success: true, logs, result: { commissions: [], total: 0 } };
  }
  
  logs.push(`📊 Commission Breakdown:`);
  let total = 0;
  const commissionDetails = commissions.map((c: any) => {
    total += c.amount;
    logs.push(`   Level ${c.commission_level}: $${c.amount} → ${c.affiliates?.username || 'unknown'} (${c.status})`);
    return {
      level: c.commission_level,
      amount: c.amount,
      affiliate: c.affiliates?.username,
      status: c.status
    };
  });
  
  logs.push(`   ─────────────────`);
  logs.push(`   Total: $${total}`);
  
  // Get plan price for verification
  const planPrice = customer.customer_plans?.monthly_price || 0;
  const expectedTotal = planPrice * 0.12; // 5% + 4% + 3% = 12%
  
  logs.push(`\n📋 Verification:`);
  logs.push(`   Plan Price: $${planPrice}`);
  logs.push(`   Expected Total (12%): $${expectedTotal}`);
  logs.push(`   Actual Total: $${total}`);
  
  if (Math.abs(total - expectedTotal) < 0.01) {
    logs.push(`   ✅ Commission calculation CORRECT`);
  } else {
    logs.push(`   ⚠️ Commission may be incorrect (difference: $${Math.abs(total - expectedTotal).toFixed(2)})`);
  }
  
  return {
    success: true,
    logs,
    result: {
      customer: customer.contact_name || customer.lead_email,
      plan_price: planPrice,
      commissions: commissionDetails,
      total,
      verification: Math.abs(total - expectedTotal) < 0.01 ? 'PASS' : 'CHECK'
    }
  };
}

async function executeClearTestData(supabase: any) {
  const logs: string[] = [];
  
  logs.push(`🧹 Starting test data cleanup...`);
  logs.push(`⚠️ Only affecting records with 'test' in email`);
  
  // Get test customers
  const { data: testCustomers } = await supabase
    .from('customer_profiles')
    .select('id, lead_email')
    .ilike('lead_email', '%test%');
  
  const customerCount = testCustomers?.length || 0;
  logs.push(`📊 Found ${customerCount} test customers`);
  
  if (customerCount > 0) {
    const customerIds = testCustomers.map((c: any) => c.id);
    
    // Delete commissions for test customers
    const { count: commCount } = await supabase
      .from('affiliate_commissions')
      .delete()
      .in('customer_id', customerIds);
    
    logs.push(`   🗑️ Deleted ${commCount || 0} commission records`);
    
    // Delete test customers
    const { count: custDeleted } = await supabase
      .from('customer_profiles')
      .delete()
      .ilike('lead_email', '%test%');
    
    logs.push(`   🗑️ Deleted ${custDeleted || customerCount} customer profiles`);
  }
  
  // Also clean up test leads
  const { count: leadCount } = await supabase
    .from('leads')
    .delete()
    .ilike('email', '%test%');
  
  logs.push(`   🗑️ Deleted ${leadCount || 0} test leads`);
  
  logs.push(`\n✅ Test data cleanup complete!`);
  
  return {
    success: true,
    logs,
    result: {
      customers_deleted: customerCount,
      message: 'Test data cleared successfully'
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify user is super_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Check if user is super_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('global_role')
      .eq('user_id', user.id)
      .single();
    
    if (profile?.global_role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Super admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const { message, conversation } = await req.json();
    
    // Build messages for AI
    const messages = [
      {
        role: "system",
        content: `You are an AI Test Orchestrator for EverLaunch CRM. You help super admins test the system by creating test data and verifying business logic.

You have access to these tools:
1. create_test_customer - Create a test customer under an affiliate with a specific plan
2. verify_commissions - Verify commission calculations for a customer
3. clear_test_data - Remove all test data (records with 'test' in email)

IMPORTANT RULES:
- Only work with test data (emails containing 'test')
- Be concise but helpful
- Show what you're doing step by step
- If a command is unclear, ask for clarification
- After executing tools, summarize what happened

Example commands you understand:
- "Create a Pro customer under johnny"
- "Verify commissions for customer abc-123"
- "Create 2 Starter customers under sarah"
- "Clear all test data"
- "Check if the commission calculation is correct for the last customer"`
      },
      ...(conversation || []),
      { role: "user", content: message }
    ];
    
    // Call Lovable AI with tools
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        tools,
        tool_choice: 'auto'
      })
    });
    
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];
    
    if (!choice) {
      return new Response(JSON.stringify({ error: 'No response from AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const assistantMessage = choice.message;
    const allLogs: string[] = [];
    const toolResults: any[] = [];
    
    // Execute tool calls if any
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        let result;
        
        allLogs.push(`\n🔧 Executing: ${toolCall.function.name}`);
        
        switch (toolCall.function.name) {
          case 'create_test_customer':
            result = await executeCreateTestCustomer(supabase, args);
            break;
          case 'verify_commissions':
            result = await executeVerifyCommissions(supabase, args);
            break;
          case 'clear_test_data':
            result = await executeClearTestData(supabase);
            break;
          default:
            result = { success: false, logs: [`Unknown tool: ${toolCall.function.name}`], error: 'Unknown tool' };
        }
        
        allLogs.push(...(result.logs || []));
        toolResults.push({
          tool: toolCall.function.name,
          success: result.success,
          result: 'result' in result ? result.result : undefined,
          error: 'error' in result ? result.error : undefined
        });
      }
      
      // Get AI's summary of what happened
      const summaryMessages = [
        ...messages,
        assistantMessage,
        {
          role: "tool",
          tool_call_id: assistantMessage.tool_calls[0].id,
          content: JSON.stringify({ logs: allLogs, results: toolResults })
        }
      ];
      
      const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: summaryMessages
        })
      });
      
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        const summary = summaryData.choices?.[0]?.message?.content || '';
        
        return new Response(JSON.stringify({
          response: summary,
          logs: allLogs,
          toolResults
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // No tool calls, just return the response
    return new Response(JSON.stringify({
      response: assistantMessage.content || '',
      logs: [],
      toolResults: []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: unknown) {
    console.error('Orchestrator error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
