import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoldenScenario {
  id: string;
  name: string;
  vertical_id: number | null;
  channel: string;
  config_overrides: Record<string, unknown>;
  conversation_script: Array<{ role: string; content: string }>;
  expected_assertions: {
    must_include?: string[];
    must_include_any?: string[];
    must_include_groups?: string[][];
    must_include_regex?: string[];
    must_not_include?: string[];
    must_trigger_tool_allowed?: string[];
    must_not_trigger_tool?: string[];
    must_capture_fields?: string[];
    response_length?: string;
    must_not_include_length_over?: number;
  };
}

interface AssertionResult {
  type: string;
  passed: boolean;
  details: string;
  matched?: string[];
  expected?: string[] | string[][];
}

// Simplified prompt generator matching the frontend logic
function generateTestPrompt(verticalId: number | null, channel: string, configOverrides: Record<string, unknown>): string {
  const vid = verticalId ?? 0;
  const verticalNames: Record<number, string> = {
    0: 'Generic Local Business', 1: 'Plumbing', 2: 'HVAC', 3: 'Electricians',
    4: 'Roofing', 6: 'Pest Control', 7: 'Locksmith', 8: 'Towing',
    14: 'Personal Injury Attorney', 15: 'Bail Bonds', 17: 'Dental',
    81: 'Medical Spa', 82: 'Chiropractor'
  };
  
  const verticalName = verticalNames[vid] || 'Local Business';
  const isLegal = [14, 15, 16, 66, 67, 68, 69, 70].includes(vid);
  const isMedical = [17, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92].includes(vid);
  
  let prompt = `You are an AI assistant for ${verticalName}.\n\n`;
  
  // Add channel behavior
  prompt += `## Channel: ${channel.toUpperCase()}\n`;
  if (channel === 'phone') {
    prompt += `- Keep responses brief and conversational\n`;
    prompt += `- Focus on capturing essential information\n`;
  } else if (channel === 'sms') {
    prompt += `- Keep responses under 160 characters when possible\n`;
    prompt += `- Be extremely concise\n`;
  }
  
  // Add compliance guardrails
  if (isLegal) {
    prompt += `\n## LEGAL COMPLIANCE (CRITICAL)\n`;
    prompt += `- NEVER provide legal advice or interpret laws\n`;
    prompt += `- NEVER predict case outcomes or guarantee settlements\n`;
    prompt += `- ALWAYS recommend consulting with a licensed attorney\n`;
    prompt += `- Only capture case details for attorney review\n`;
  }
  
  if (isMedical) {
    prompt += `\n## MEDICAL COMPLIANCE (CRITICAL)\n`;
    prompt += `- NEVER provide medical diagnosis or treatment recommendations\n`;
    prompt += `- NEVER interpret symptoms or suggest conditions\n`;
    prompt += `- ALWAYS recommend consulting with a healthcare professional\n`;
    prompt += `- Only capture intake information and schedule appointments\n`;
  }
  
  // Add feature restrictions based on config
  prompt += `\n## Feature Configuration\n`;
  
  if (configOverrides.appointmentBooking === 'OFF') {
    prompt += `- Booking DISABLED: Do not attempt to schedule appointments. Offer to capture details for callback.\n`;
  } else {
    prompt += `- Booking ENABLED: You can schedule appointments when requested.\n`;
  }
  
  if (configOverrides.emergencyEscalation === 'OFF') {
    prompt += `- Escalation DISABLED: Cannot dispatch immediately. Capture details for callback.\n`;
  }
  
  if (configOverrides.transferToHuman === 'OFF') {
    prompt += `- Transfer DISABLED: Cannot transfer to human. Focus on capturing information and promising callback.\n`;
  }
  
  if (configOverrides.priceQuoting === 'OFF') {
    prompt += `- Pricing DISABLED: Do not quote specific prices or estimates. Explain pricing varies.\n`;
  }
  
  // Universal safety
  prompt += `\n## Universal Rules\n`;
  prompt += `- Never provide DIY instructions for electrical, gas, or structural work\n`;
  prompt += `- Never guarantee specific outcomes or timelines\n`;
  prompt += `- Never make commitments on behalf of the business owner\n`;
  prompt += `- Always capture lead information: name, phone, reason for contact\n`;
  
  return prompt;
}

// Simulate AI response based on prompt and conversation
async function generateAIResponse(
  prompt: string, 
  conversation: Array<{ role: string; content: string }>,
  openaiKey: string
): Promise<{ response: string; toolsCalled: string[] }> {
  const messages = [
    { role: 'system', content: prompt },
    ...conversation.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  ];
  
  // Define available tools for the test
  const tools = [
    { type: 'function', function: { name: 'create_booking', description: 'Schedule an appointment', parameters: { type: 'object', properties: { date: { type: 'string' }, time: { type: 'string' } } } } },
    { type: 'function', function: { name: 'emergency_dispatch', description: 'Dispatch for emergency', parameters: { type: 'object', properties: { priority: { type: 'string' } } } } },
    { type: 'function', function: { name: 'transfer_to_human', description: 'Transfer call to human', parameters: { type: 'object', properties: {} } } },
    { type: 'function', function: { name: 'capture_lead', description: 'Save lead information', parameters: { type: 'object', properties: { name: { type: 'string' }, phone: { type: 'string' } } } } },
    { type: 'function', function: { name: 'quote_estimate', description: 'Provide price quote', parameters: { type: 'object', properties: { amount: { type: 'number' } } } } },
  ];
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto',
        max_tokens: 500,
        temperature: 0.3, // Lower temperature for more consistent results
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }
    
    const data = await response.json();
    const choice = data.choices?.[0];
    
    const toolsCalled: string[] = [];
    if (choice?.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        toolsCalled.push(tc.function.name);
      }
    }
    
    const responseText = choice?.message?.content || '';
    
    return { response: responseText, toolsCalled };
  } catch (error) {
    console.error('[run-regression-tests] AI generation error:', error);
    throw error;
  }
}

// Helper: case-insensitive phrase check with trimming
function containsPhrase(text: string, phrase: string): boolean {
  return text.toLowerCase().trim().includes(phrase.toLowerCase().trim());
}

// Helper: check regex pattern (case-insensitive)
function matchesRegex(text: string, pattern: string): boolean {
  try {
    const regex = new RegExp(pattern, 'i');
    return regex.test(text);
  } catch {
    console.warn(`[run-regression-tests] Invalid regex pattern: ${pattern}`);
    return false;
  }
}

// Evaluate assertions against response
function evaluateAssertions(
  response: string,
  toolsCalled: string[],
  assertions: GoldenScenario['expected_assertions']
): { passed: boolean; passedList: AssertionResult[]; failedList: AssertionResult[] } {
  const passedList: AssertionResult[] = [];
  const failedList: AssertionResult[] = [];
  const responseLower = response.toLowerCase();
  
  // must_include (ALL required - strict)
  if (assertions.must_include && assertions.must_include.length > 0) {
    for (const phrase of assertions.must_include) {
      const found = containsPhrase(response, phrase);
      const result: AssertionResult = {
        type: 'must_include',
        passed: found,
        details: `"${phrase}" ${found ? 'found' : 'NOT found'} in response`,
        expected: [phrase],
        matched: found ? [phrase] : [],
      };
      if (found) passedList.push(result);
      else failedList.push(result);
    }
  }
  
  // must_include_any (AT LEAST ONE required)
  if (assertions.must_include_any && assertions.must_include_any.length > 0) {
    const matched: string[] = [];
    for (const phrase of assertions.must_include_any) {
      if (containsPhrase(response, phrase)) {
        matched.push(phrase);
      }
    }
    const anyFound = matched.length > 0;
    const result: AssertionResult = {
      type: 'must_include_any',
      passed: anyFound,
      details: anyFound 
        ? `Matched: ${matched.map(m => `"${m}"`).join(', ')}` 
        : `None of [${assertions.must_include_any.map(p => `"${p}"`).join(', ')}] found`,
      expected: assertions.must_include_any,
      matched,
    };
    if (anyFound) passedList.push(result);
    else failedList.push(result);
  }
  
  // must_include_groups (each group requires at least one match - AND of OR-groups)
  if (assertions.must_include_groups && assertions.must_include_groups.length > 0) {
    let allGroupsPassed = true;
    const groupResults: Array<{ group: string[]; matched: string[]; passed: boolean }> = [];
    
    for (const group of assertions.must_include_groups) {
      const matched: string[] = [];
      for (const phrase of group) {
        if (containsPhrase(response, phrase)) {
          matched.push(phrase);
        }
      }
      const groupPassed = matched.length > 0;
      groupResults.push({ group, matched, passed: groupPassed });
      if (!groupPassed) allGroupsPassed = false;
    }
    
    const failedGroups = groupResults.filter(g => !g.passed);
    const passedGroups = groupResults.filter(g => g.passed);
    
    const result: AssertionResult = {
      type: 'must_include_groups',
      passed: allGroupsPassed,
      details: allGroupsPassed
        ? `All ${groupResults.length} groups matched: ${passedGroups.map(g => `[${g.matched.join('|')}]`).join(', ')}`
        : `${failedGroups.length} group(s) failed: ${failedGroups.map(g => `[${g.group.join('|')}]`).join(', ')}`,
      expected: assertions.must_include_groups,
      matched: groupResults.flatMap(g => g.matched),
    };
    if (allGroupsPassed) passedList.push(result);
    else failedList.push(result);
  }
  
  // must_include_regex (at least one regex must match)
  if (assertions.must_include_regex && assertions.must_include_regex.length > 0) {
    const matched: string[] = [];
    for (const pattern of assertions.must_include_regex) {
      if (matchesRegex(response, pattern)) {
        matched.push(pattern);
      }
    }
    const anyMatched = matched.length > 0;
    const result: AssertionResult = {
      type: 'must_include_regex',
      passed: anyMatched,
      details: anyMatched
        ? `Regex matched: ${matched.join(', ')}`
        : `No regex patterns matched from [${assertions.must_include_regex.join(', ')}]`,
      expected: assertions.must_include_regex,
      matched,
    };
    if (anyMatched) passedList.push(result);
    else failedList.push(result);
  }
  
  // must_not_include (CRITICAL - all must be absent)
  if (assertions.must_not_include && assertions.must_not_include.length > 0) {
    for (const phrase of assertions.must_not_include) {
      const found = containsPhrase(response, phrase);
      const result: AssertionResult = {
        type: 'must_not_include',
        passed: !found,
        details: `"${phrase}" ${found ? 'FOUND (violation!)' : 'not found (correct)'}`,
        expected: [phrase],
        matched: found ? [phrase] : [],
      };
      if (!found) passedList.push(result);
      else failedList.push(result);
    }
  }
  
  // must_trigger_tool_allowed
  if (assertions.must_trigger_tool_allowed && assertions.must_trigger_tool_allowed.length > 0) {
    const matched: string[] = [];
    for (const tool of assertions.must_trigger_tool_allowed) {
      if (toolsCalled.includes(tool) || toolsCalled.some(tc => tc.includes(tool) || tool.includes(tc))) {
        matched.push(tool);
      }
    }
    const anyTriggered = matched.length > 0;
    const result: AssertionResult = {
      type: 'must_trigger_tool_allowed',
      passed: anyTriggered,
      details: anyTriggered
        ? `Tool(s) triggered: ${matched.join(', ')}`
        : `Expected one of [${assertions.must_trigger_tool_allowed.join(', ')}], got [${toolsCalled.join(', ') || 'none'}]`,
      expected: assertions.must_trigger_tool_allowed,
      matched,
    };
    if (anyTriggered) passedList.push(result);
    else failedList.push(result);
  }
  
  // must_not_trigger_tool (CRITICAL)
  if (assertions.must_not_trigger_tool && assertions.must_not_trigger_tool.length > 0) {
    for (const tool of assertions.must_not_trigger_tool) {
      const triggered = toolsCalled.includes(tool) || toolsCalled.some(tc => tc.includes(tool));
      const result: AssertionResult = {
        type: 'must_not_trigger_tool',
        passed: !triggered,
        details: `Tool "${tool}" ${triggered ? 'WAS triggered (violation!)' : 'not triggered (correct)'}`,
        expected: [tool],
        matched: triggered ? [tool] : [],
      };
      if (!triggered) passedList.push(result);
      else failedList.push(result);
    }
  }
  
  // must_capture_fields (check if response mentions capturing these)
  if (assertions.must_capture_fields && assertions.must_capture_fields.length > 0) {
    const matched: string[] = [];
    for (const field of assertions.must_capture_fields) {
      // Check if the lead capture tool was called OR the response asks for this field
      const captured = toolsCalled.includes('capture_lead') || 
                       containsPhrase(response, field) ||
                       containsPhrase(response, 'contact') ||
                       containsPhrase(response, 'information') ||
                       containsPhrase(response, 'details');
      if (captured) matched.push(field);
    }
    // Pass if any field capture was attempted
    const anyCapture = matched.length > 0 || toolsCalled.includes('capture_lead');
    const result: AssertionResult = {
      type: 'must_capture_fields',
      passed: anyCapture,
      details: anyCapture 
        ? `Field capture attempted: ${matched.length > 0 ? matched.join(', ') : 'via capture_lead tool'}`
        : `No field capture detected for [${assertions.must_capture_fields.join(', ')}]`,
      expected: assertions.must_capture_fields,
      matched,
    };
    if (anyCapture) passedList.push(result);
    else failedList.push(result);
  }
  
  // response_length
  if (assertions.response_length === 'brief' && response.length > 300) {
    failedList.push({
      type: 'response_length',
      passed: false,
      details: `Response too long for "brief" (${response.length} chars > 300)`,
    });
  } else if (assertions.response_length) {
    passedList.push({
      type: 'response_length',
      passed: true,
      details: `Response length OK (${response.length} chars)`,
    });
  }
  
  // must_not_include_length_over (for SMS)
  if (assertions.must_not_include_length_over) {
    const isOk = response.length <= assertions.must_not_include_length_over;
    const result: AssertionResult = {
      type: 'must_not_include_length_over',
      passed: isOk,
      details: `Response length ${response.length} ${isOk ? '<=' : '>'} ${assertions.must_not_include_length_over}`,
    };
    if (isOk) passedList.push(result);
    else failedList.push(result);
  }
  
  return {
    passed: failedList.length === 0,
    passedList,
    failedList,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { vertical_id, run_all } = await req.json().catch(() => ({}));
    
    console.log('[run-regression-tests] Starting test run:', { vertical_id, run_all });
    
    // Fetch scenarios
    let query = supabase
      .from('golden_scenarios')
      .select('*')
      .eq('is_active', true);
    
    if (vertical_id !== undefined && !run_all) {
      query = query.eq('vertical_id', vertical_id);
    }
    
    const { data: scenarios, error: scenariosError } = await query;
    
    if (scenariosError) {
      throw new Error(`Failed to fetch scenarios: ${scenariosError.message}`);
    }
    
    if (!scenarios || scenarios.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No scenarios found to run',
        results: [],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    console.log(`[run-regression-tests] Running ${scenarios.length} scenarios`);
    
    // Create test run record
    const { data: runRecord, error: runError } = await supabase
      .from('regression_test_runs')
      .insert({
        run_type: run_all ? 'full' : 'vertical',
        vertical_filter: vertical_id,
        total_scenarios: scenarios.length,
        status: 'running',
      })
      .select()
      .single();
    
    if (runError) {
      throw new Error(`Failed to create run record: ${runError.message}`);
    }
    
    const results: Array<{
      scenario: GoldenScenario;
      passed: boolean;
      passedAssertions: AssertionResult[];
      failedAssertions: AssertionResult[];
      response: string;
      prompt: string;
      executionTimeMs: number;
      error?: string;
    }> = [];
    
    let passedCount = 0;
    let failedCount = 0;
    
    // Run each scenario
    for (const scenario of scenarios as GoldenScenario[]) {
      const startTime = Date.now();
      
      try {
        // Generate prompt
        const prompt = generateTestPrompt(
          scenario.vertical_id,
          scenario.channel,
          scenario.config_overrides
        );
        
        // Run AI inference
        const { response, toolsCalled } = await generateAIResponse(
          prompt,
          scenario.conversation_script,
          openaiKey
        );
        
        // Evaluate assertions
        const evaluation = evaluateAssertions(response, toolsCalled, scenario.expected_assertions);
        
        const executionTimeMs = Date.now() - startTime;
        
        const result = {
          scenario,
          passed: evaluation.passed,
          passedAssertions: evaluation.passedList,
          failedAssertions: evaluation.failedList,
          response,
          prompt,
          executionTimeMs,
        };
        
        results.push(result);
        
        if (evaluation.passed) {
          passedCount++;
        } else {
          failedCount++;
        }
        
        // Store result
        await supabase.from('regression_test_results').insert({
          run_id: runRecord.id,
          scenario_id: scenario.id,
          passed: evaluation.passed,
          assertions_passed: evaluation.passedList,
          assertions_failed: evaluation.failedList,
          generated_prompt: prompt,
          ai_response: response,
          execution_time_ms: executionTimeMs,
        });
        
        console.log(`[run-regression-tests] ${scenario.name}: ${evaluation.passed ? 'PASSED' : 'FAILED'}`);
        
      } catch (error) {
        const executionTimeMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        failedCount++;
        
        results.push({
          scenario,
          passed: false,
          passedAssertions: [],
          failedAssertions: [{ type: 'error', passed: false, details: errorMessage }],
          response: '',
          prompt: '',
          executionTimeMs,
          error: errorMessage,
        });
        
        await supabase.from('regression_test_results').insert({
          run_id: runRecord.id,
          scenario_id: scenario.id,
          passed: false,
          assertions_passed: [],
          assertions_failed: [{ type: 'error', passed: false, details: errorMessage }],
          error_message: errorMessage,
          execution_time_ms: executionTimeMs,
        });
        
        console.error(`[run-regression-tests] ${scenario.name}: ERROR - ${errorMessage}`);
      }
    }
    
    // Update run record
    await supabase
      .from('regression_test_runs')
      .update({
        status: 'completed',
        passed_count: passedCount,
        failed_count: failedCount,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runRecord.id);
    
    console.log(`[run-regression-tests] Run complete: ${passedCount} passed, ${failedCount} failed`);
    
    return new Response(JSON.stringify({
      success: true,
      run_id: runRecord.id,
      total: scenarios.length,
      passed: passedCount,
      failed: failedCount,
      results: results.map(r => ({
        scenario_name: r.scenario.name,
        vertical_id: r.scenario.vertical_id,
        channel: r.scenario.channel,
        passed: r.passed,
        failed_assertions: r.failedAssertions,
        passed_assertions: r.passedAssertions,
        execution_time_ms: r.executionTimeMs,
        error: r.error,
      })),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    
  } catch (error) {
    console.error('[run-regression-tests] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
