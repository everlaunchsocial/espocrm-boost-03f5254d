import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuggestedChanges {
  action?: string;
  layer?: string;
  target?: string;
  description?: string;
  modifier_name?: string;
  skill_name?: string;
  toggle_name?: string;
  missing_field?: string;
}

interface PatchPayload {
  patch_target: string;
  vertical_id: string;
  channel: string | null;
  changes: Record<string, unknown>;
}

// Maps issue tags to their architectural layer and recommended fix type
const ISSUE_TO_PATCH_MAP: Record<string, { layer: string; patchType: string }> = {
  // Legal/Medical risks -> workflow_policy (tighten restrictions)
  restricted_advice_risk_legal: { layer: 'workflow_policy', patchType: 'add_restriction' },
  restricted_advice_risk_medical: { layer: 'workflow_policy', patchType: 'add_restriction' },
  guarantee_language_used: { layer: 'workflow_policy', patchType: 'add_restriction' },
  
  // Escalation issues -> workflow_policy
  missed_escalation: { layer: 'workflow_policy', patchType: 'enable_tool' },
  escalation_when_disabled: { layer: 'default_config', patchType: 'toggle_recommendation' },
  
  // Booking issues -> default_config or workflow_policy
  booking_when_disabled: { layer: 'workflow_policy', patchType: 'enforce_check' },
  missed_booking_opportunity: { layer: 'default_config', patchType: 'toggle_recommendation' },
  
  // Lead capture -> vertical_mapping or workflow_policy
  failed_to_capture_phone: { layer: 'vertical_mapping', patchType: 'add_modifier' },
  failed_to_capture_email: { layer: 'vertical_mapping', patchType: 'add_modifier' },
  
  // Conversation quality -> base_prompt
  too_many_questions: { layer: 'base_prompt', patchType: 'section_edit' },
  pricing_handling_weak: { layer: 'vertical_mapping', patchType: 'add_modifier' },
  
  // Business facts
  missing_hours: { layer: 'business_facts', patchType: 'onboarding_question' },
  missing_service_area: { layer: 'business_facts', patchType: 'onboarding_question' },
  missing_pricing: { layer: 'business_facts', patchType: 'onboarding_question' },
  
  // After hours
  after_hours_flow_missed: { layer: 'workflow_policy', patchType: 'enforce_check' },
};

function generateVerticalMappingPatch(
  suggestion: { vertical_id: string; channel: string | null; issue_tags: string[]; suggested_changes: SuggestedChanges }
): PatchPayload {
  const changes: Record<string, unknown> = {
    verticalId: suggestion.vertical_id,
    addModifiers: [] as string[],
    removeModifiers: [] as string[],
    addAllowedSkills: [] as string[],
    removeAllowedSkills: [] as string[],
    addRestrictedSkills: [] as string[],
    removeRestrictedSkills: [] as string[],
  };

  // Map issue tags to modifiers
  for (const tag of suggestion.issue_tags) {
    if (tag === 'failed_to_capture_phone' || tag === 'failed_to_capture_email') {
      (changes.addModifiers as string[]).push('AGGRESSIVE_LEAD_CAPTURE');
    }
    if (tag === 'pricing_handling_weak') {
      (changes.addModifiers as string[]).push('PRICING_CONFIDENCE');
    }
    if (tag === 'too_many_questions') {
      (changes.addModifiers as string[]).push('CONCISE_RESPONSES');
    }
  }

  // Use suggested changes if available
  if (suggestion.suggested_changes?.modifier_name) {
    (changes.addModifiers as string[]).push(suggestion.suggested_changes.modifier_name);
  }
  if (suggestion.suggested_changes?.skill_name) {
    if (suggestion.suggested_changes.action === 'Add skill') {
      (changes.addAllowedSkills as string[]).push(suggestion.suggested_changes.skill_name);
    } else if (suggestion.suggested_changes.action === 'Restrict skill') {
      (changes.addRestrictedSkills as string[]).push(suggestion.suggested_changes.skill_name);
    }
  }

  return {
    patch_target: 'vertical_mapping',
    vertical_id: suggestion.vertical_id,
    channel: suggestion.channel,
    changes,
  };
}

function generateWorkflowPolicyPatch(
  suggestion: { vertical_id: string; channel: string | null; issue_tags: string[]; suggested_changes: SuggestedChanges }
): PatchPayload {
  const changes: Record<string, unknown> = {
    toolRules: {} as Record<string, { enabled: boolean; conditions: string[] }>,
    branchRules: {} as Record<string, string>,
    restrictions: [] as string[],
  };

  for (const tag of suggestion.issue_tags) {
    if (tag === 'missed_escalation') {
      (changes.toolRules as Record<string, unknown>)['transfer_call'] = {
        enabled: true,
        conditions: ['customer_requests_human', 'complex_issue_detected', 'frustration_detected'],
      };
    }
    if (tag === 'booking_when_disabled') {
      (changes.branchRules as Record<string, string>)['booking'] = 
        'MUST check appointments_enabled flag before offering scheduling';
    }
    if (tag === 'after_hours_flow_missed') {
      (changes.branchRules as Record<string, string>)['after_hours'] = 
        'MUST check business_hours and apply after_hours_behavior before proceeding';
    }
    if (tag === 'restricted_advice_risk_legal' || tag === 'restricted_advice_risk_medical') {
      (changes.restrictions as string[]).push(
        'NEVER provide specific legal/medical advice',
        'ALWAYS recommend consulting a licensed professional',
        'Use disclaimer language when discussing sensitive topics'
      );
    }
    if (tag === 'guarantee_language_used') {
      (changes.restrictions as string[]).push(
        'NEVER use guarantee language (100%, definitely, always works)',
        'Use hedging language (typically, usually, in most cases)'
      );
    }
  }

  return {
    patch_target: 'workflow_policy',
    vertical_id: suggestion.vertical_id,
    channel: suggestion.channel,
    changes,
  };
}

function generateBasePromptPatch(
  suggestion: { vertical_id: string; channel: string | null; issue_tags: string[]; suggested_changes: SuggestedChanges }
): PatchPayload {
  const changes: Record<string, unknown> = {
    basePromptKey: suggestion.channel === 'phone' ? 'PHONE_BASE_PROMPT' : 'CHAT_BASE_PROMPT',
    insertions: [] as { section: string; content: string; position: 'before' | 'after' }[],
    removals: [] as { section: string; pattern: string }[],
  };

  for (const tag of suggestion.issue_tags) {
    if (tag === 'too_many_questions') {
      (changes.insertions as Array<{ section: string; content: string; position: string }>).push({
        section: 'CONVERSATION_STYLE',
        content: 'Keep responses concise. Ask no more than 2 questions per turn. Summarize understanding before asking follow-ups.',
        position: 'after',
      });
    }
  }

  if (suggestion.suggested_changes?.description) {
    (changes.insertions as Array<{ section: string; content: string; position: string }>).push({
      section: suggestion.suggested_changes.target || 'GENERAL',
      content: suggestion.suggested_changes.description,
      position: 'after',
    });
  }

  return {
    patch_target: 'base_prompt',
    vertical_id: suggestion.vertical_id,
    channel: suggestion.channel,
    changes,
  };
}

function generateDefaultConfigPatch(
  suggestion: { vertical_id: string; channel: string | null; issue_tags: string[]; suggested_changes: SuggestedChanges }
): PatchPayload {
  const changes: Record<string, unknown> = {
    defaultToggles: {} as Record<string, { recommended: boolean; reason: string }>,
  };

  for (const tag of suggestion.issue_tags) {
    if (tag === 'missed_booking_opportunity') {
      (changes.defaultToggles as Record<string, unknown>)['appointments_enabled'] = {
        recommended: true,
        reason: `High booking opportunity loss detected in ${suggestion.vertical_id}`,
      };
    }
    if (tag === 'escalation_when_disabled') {
      (changes.defaultToggles as Record<string, unknown>)['escalation_enabled'] = {
        recommended: false,
        reason: `Escalation being used when disabled - ensure toggle state matches business intent`,
      };
    }
  }

  if (suggestion.suggested_changes?.toggle_name) {
    (changes.defaultToggles as Record<string, unknown>)[suggestion.suggested_changes.toggle_name] = {
      recommended: suggestion.suggested_changes.action === 'Enable',
      reason: suggestion.suggested_changes.description || 'Based on pattern analysis',
    };
  }

  return {
    patch_target: 'default_config',
    vertical_id: suggestion.vertical_id,
    channel: suggestion.channel,
    changes,
  };
}

function generateBusinessFactsPatch(
  suggestion: { vertical_id: string; channel: string | null; issue_tags: string[]; suggested_changes: SuggestedChanges }
): PatchPayload {
  const missingFields: { field: string; onboardingQuestion: string }[] = [];

  for (const tag of suggestion.issue_tags) {
    if (tag === 'missing_hours') {
      missingFields.push({
        field: 'business_hours',
        onboardingQuestion: 'What are your business hours? (e.g., Mon-Fri 9am-5pm)',
      });
    }
    if (tag === 'missing_service_area') {
      missingFields.push({
        field: 'service_area',
        onboardingQuestion: 'What geographic area do you serve?',
      });
    }
    if (tag === 'missing_pricing') {
      missingFields.push({
        field: 'pricing_info',
        onboardingQuestion: 'What are your typical price ranges or how do you quote jobs?',
      });
    }
  }

  if (suggestion.suggested_changes?.missing_field) {
    missingFields.push({
      field: suggestion.suggested_changes.missing_field,
      onboardingQuestion: suggestion.suggested_changes.description || `Please provide ${suggestion.suggested_changes.missing_field}`,
    });
  }

  return {
    patch_target: 'business_facts',
    vertical_id: suggestion.vertical_id,
    channel: suggestion.channel,
    changes: {
      missingFields,
      note: 'DO NOT auto-modify onboarding. Present these as recommendations to the customer.',
    },
  };
}

function determinePatchTarget(issueTags: string[], suggestedLayer?: string): string {
  // If suggested layer is provided, use it
  if (suggestedLayer && ['base_prompt', 'vertical_mapping', 'workflow_policy', 'default_config', 'business_facts'].includes(suggestedLayer)) {
    return suggestedLayer;
  }

  // Otherwise, determine from issue tags
  for (const tag of issueTags) {
    const mapping = ISSUE_TO_PATCH_MAP[tag];
    if (mapping) {
      return mapping.layer;
    }
  }

  // Default to vertical_mapping
  return 'vertical_mapping';
}

function generatePatchText(payload: PatchPayload): string {
  const lines: string[] = [
    '// ============================================',
    '// REMEDIATION PATCH - DO NOT AUTO-APPLY',
    '// ============================================',
    '',
    `// Target: ${payload.patch_target}`,
    `// Vertical: ${payload.vertical_id}`,
    `// Channel: ${payload.channel || 'all'}`,
    `// Generated: ${new Date().toISOString()}`,
    '',
  ];

  switch (payload.patch_target) {
    case 'vertical_mapping':
      lines.push('// File: src/lib/verticals/promptMappings.ts');
      lines.push('// Find the mapping for this vertical and apply:');
      lines.push('');
      lines.push(`// verticalId: \\"${payload.vertical_id}\\"`);
      
      const vmChanges = payload.changes as { addModifiers: string[]; removeModifiers: string[]; addAllowedSkills: string[]; addRestrictedSkills: string[] };
      
      if (vmChanges.addModifiers?.length) {
        lines.push('');
        lines.push('// ADD to modifiers array:');
        vmChanges.addModifiers.forEach(m => lines.push(`//   \\"${m}\\",`));
      }
      if (vmChanges.removeModifiers?.length) {
        lines.push('');
        lines.push('// REMOVE from modifiers array:');
        vmChanges.removeModifiers.forEach(m => lines.push(`//   \\"${m}\\",`));
      }
      if (vmChanges.addAllowedSkills?.length) {
        lines.push('');
        lines.push('// ADD to allowedSkills array:');
        vmChanges.addAllowedSkills.forEach(s => lines.push(`//   \\"${s}\\",`));
      }
      if (vmChanges.addRestrictedSkills?.length) {
        lines.push('');
        lines.push('// ADD to restrictedSkills array:');
        vmChanges.addRestrictedSkills.forEach(s => lines.push(`//   \\"${s}\\",`));
      }
      break;

    case 'workflow_policy':
      lines.push('// File: src/lib/verticals/actionPolicy.ts');
      lines.push('// Apply these enforcement rules:');
      lines.push('');
      
      const wpChanges = payload.changes as { toolRules: Record<string, unknown>; branchRules: Record<string, string>; restrictions: string[] };
      
      if (Object.keys(wpChanges.toolRules || {}).length) {
        lines.push('// Tool Rules:');
        for (const [tool, rule] of Object.entries(wpChanges.toolRules)) {
          lines.push(`//   ${tool}: ${JSON.stringify(rule)}`);
        }
      }
      if (Object.keys(wpChanges.branchRules || {}).length) {
        lines.push('');
        lines.push('// Workflow Branch Rules:');
        for (const [branch, rule] of Object.entries(wpChanges.branchRules)) {
          lines.push(`//   ${branch}: \\"${rule}\\"`);
        }
      }
      if (wpChanges.restrictions?.length) {
        lines.push('');
        lines.push('// Add to RESTRICTIONS constant:');
        wpChanges.restrictions.forEach(r => lines.push(`//   - ${r}`));
      }
      break;

    case 'base_prompt':
      lines.push('// File: supabase/functions/_shared/verticalPromptGenerator.ts');
      lines.push('// Apply these prompt modifications:');
      lines.push('');
      
      const bpChanges = payload.changes as { basePromptKey: string; insertions: Array<{ section: string; content: string; position: string }> };
      
      lines.push(`// Base Prompt Key: ${bpChanges.basePromptKey}`);
      if (bpChanges.insertions?.length) {
        lines.push('');
        lines.push('// Insertions:');
        bpChanges.insertions.forEach(ins => {
          lines.push(`//   Section: ${ins.section}`);
          lines.push(`//   Position: ${ins.position}`);
          lines.push(`//   Content: \\"${ins.content}\\"`);
          lines.push('');
        });
      }
      break;

    case 'default_config':
      lines.push('// File: src/lib/verticalConfig.ts (or customer onboarding defaults)');
      lines.push('// Recommended default toggle changes:');
      lines.push('');
      
      const dcChanges = payload.changes as { defaultToggles: Record<string, { recommended: boolean; reason: string }> };
      
      for (const [toggle, config] of Object.entries(dcChanges.defaultToggles || {})) {
        lines.push(`// ${toggle}:`);
        lines.push(`//   Recommended: ${config.recommended}`);
        lines.push(`//   Reason: ${config.reason}`);
        lines.push('');
      }
      break;

    case 'business_facts':
      lines.push('// KNOWLEDGE GAP - Recommend to customer (do NOT auto-modify onboarding)');
      lines.push('');
      
      const bfChanges = payload.changes as { missingFields: Array<{ field: string; onboardingQuestion: string }>; note: string };
      
      lines.push('// Missing fields to collect:');
      bfChanges.missingFields?.forEach(mf => {
        lines.push(`//   Field: ${mf.field}`);
        lines.push(`//   Suggested question: \\"${mf.onboardingQuestion}\\"`);
        lines.push('');
      });
      if (bfChanges.note) {
        lines.push(`// Note: ${bfChanges.note}`);
      }
      break;
  }

  lines.push('');
  lines.push('// ============================================');
  lines.push('// END PATCH');
  lines.push('// ============================================');

  return lines.join('\\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { suggestion_id } = await req.json();

    if (!suggestion_id) {
      return new Response(
        JSON.stringify({ error: 'suggestion_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-remediation-patch] Processing suggestion: ${suggestion_id}`);

    // Fetch the suggestion
    const { data: suggestion, error: fetchError } = await supabaseClient
      .from('remediation_suggestions')
      .select('*')
      .eq('id', suggestion_id)
      .single();

    if (fetchError || !suggestion) {
      console.error('[generate-remediation-patch] Suggestion not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Suggestion not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-remediation-patch] Suggestion data:`, {
      vertical_id: suggestion.vertical_id,
      channel: suggestion.channel,
      issue_tags: suggestion.issue_tags,
      suggested_changes: suggestion.suggested_changes,
    });

    // Determine patch target
    const patchTarget = determinePatchTarget(
      suggestion.issue_tags || [],
      suggestion.suggested_changes?.layer
    );

    console.log(`[generate-remediation-patch] Determined patch target: ${patchTarget}`);

    // Generate patch payload based on target
    let patchPayload: PatchPayload;

    switch (patchTarget) {
      case 'vertical_mapping':
        patchPayload = generateVerticalMappingPatch(suggestion);
        break;
      case 'workflow_policy':
        patchPayload = generateWorkflowPolicyPatch(suggestion);
        break;
      case 'base_prompt':
        patchPayload = generateBasePromptPatch(suggestion);
        break;
      case 'default_config':
        patchPayload = generateDefaultConfigPatch(suggestion);
        break;
      case 'business_facts':
        patchPayload = generateBusinessFactsPatch(suggestion);
        break;
      default:
        patchPayload = generateVerticalMappingPatch(suggestion);
    }

    // Generate human-readable patch text
    const patchText = generatePatchText(patchPayload);

    console.log(`[generate-remediation-patch] Generated patch:`, {
      patch_target: patchTarget,
      payload_keys: Object.keys(patchPayload.changes),
    });

    // Update the suggestion with the patch
    const { error: updateError } = await supabaseClient
      .from('remediation_suggestions')
      .update({
        patch_payload: patchPayload,
        patch_text: patchText,
        patch_target: patchTarget,
        updated_at: new Date().toISOString(),
      })
      .eq('id', suggestion_id);

    if (updateError) {
      console.error('[generate-remediation-patch] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save patch' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-remediation-patch] Patch saved successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        patch_target: patchTarget,
        patch_text: patchText,
        patch_payload: patchPayload,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[generate-remediation-patch] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
