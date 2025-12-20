// Action Policy Enforcement Layer for EverLaunch AI
// Filters tools/actions based on vertical permissions + feature flags

import { Channel, FeatureConfig, WorkflowPermissions } from './types';
import { 
  getVerticalConfig, 
  MEDICAL_VERTICAL_IDS, 
  LEGAL_VERTICAL_IDS,
  GENERIC_LOCAL_BUSINESS_CONFIG 
} from './promptMappings';

// ═══════════════════════════════════════════════════════════════════════════
// REFUSAL TEMPLATES (Short, professional, action-oriented)
// ═══════════════════════════════════════════════════════════════════════════

export const REFUSAL_TEMPLATES = {
  LEGAL_NO_ADVICE: "I can't provide legal advice, but I can connect you with our attorney who can help. Would you like me to schedule a consultation or have someone call you back?",
  
  MEDICAL_NO_DIAGNOSIS: "I'm not able to diagnose conditions, but I can help you schedule an appointment with our team who can evaluate your situation properly. What works best for you?",
  
  PRICING_VARIES: "Pricing depends on the specific situation. I can capture your details and have someone follow up with an accurate quote. Can I get your contact information?",
  
  DIY_SAFETY_REFUSAL: "For safety reasons, I can't provide instructions for that. Our licensed professionals can handle it safely. Would you like to schedule a service call?",
  
  NO_GUARANTEES: "I can't guarantee specific outcomes, but I can have our team review your situation and discuss options. Can I schedule that for you?",
  
  BOOKING_UNAVAILABLE: "I'm not able to schedule appointments directly right now, but I can take your information and have someone call you back to set that up.",
  
  ESCALATION_UNAVAILABLE: "I can't transfer you to someone right now, but I can make sure your message gets to the right person. Can I get your callback number?",
  
  AFTER_HOURS_CAPTURE: "We're currently outside business hours. I can take your information and ensure someone contacts you first thing. What's the best number to reach you?",
  
  GENERIC_INTAKE: "I'd be happy to help. Let me get some information so the right person can assist you. Can I start with your name and callback number?"
} as const;

export type RefusalType = keyof typeof REFUSAL_TEMPLATES;

// ═══════════════════════════════════════════════════════════════════════════
// TOOL-TO-FEATURE MAPPING
// ═══════════════════════════════════════════════════════════════════════════

// Maps tool names to the feature flags that control them
const TOOL_FEATURE_MAP: Record<string, keyof FeatureConfig> = {
  // Booking tools
  'create_booking': 'appointmentBooking',
  'schedule_appointment': 'appointmentBooking',
  'book_appointment': 'appointmentBooking',
  'check_availability': 'appointmentBooking',
  
  // Escalation tools
  'live_transfer': 'emergencyEscalation',
  'transfer_to_human': 'transferToHuman',
  'emergency_dispatch': 'emergencyEscalation',
  'escalate_urgent': 'emergencyEscalation',
  
  // Lead capture tools
  'capture_lead': 'leadCapture',
  'save_contact': 'leadCapture',
  'create_lead': 'leadCapture',
  
  // Callback tools
  'schedule_callback': 'callbackScheduling',
  'request_callback': 'callbackScheduling',
  
  // Pricing tools
  'quote_estimate': 'priceQuoting',
  'provide_pricing': 'priceQuoting',
  'get_quote': 'priceQuoting',
  
  // Insurance tools
  'collect_insurance': 'insuranceInfoCollection',
  'insurance_intake': 'insuranceInfoCollection',
  
  // Location tools
  'verify_location': 'locationVerification',
  'confirm_address': 'locationVerification',
  
  // SMS tools
  'send_sms': 'smsFollowUp',
  'sms_confirmation': 'smsFollowUp',
};

// ═══════════════════════════════════════════════════════════════════════════
// RESTRICTED TOPIC CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

export const RESTRICTED_TOPICS = {
  medical: [
    'medical_diagnosis',
    'treatment_recommendation', 
    'medication_advice',
    'symptom_interpretation',
    'health_advice'
  ],
  legal: [
    'legal_advice',
    'case_outcome_prediction',
    'legal_interpretation',
    'settlement_guarantee',
    'legal_strategy'
  ],
  safety: [
    'diy_electrical',
    'diy_gas_work',
    'diy_structural',
    'unsafe_instructions'
  ],
  financial: [
    'price_guarantee',
    'binding_quote',
    'insurance_promise'
  ]
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// ACTION POLICY INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

export interface ActionPolicy {
  // Vertical context
  verticalId: number;
  verticalName: string;
  channel: Channel;
  
  // Tool filtering
  allowedTools: string[];
  disabledTools: string[];
  
  // Content restrictions
  restrictedTopics: string[];
  refusalTemplates: Record<string, string>;
  
  // Compliance flags
  isLegalVertical: boolean;
  isMedicalVertical: boolean;
  requiresComplianceGuardrails: boolean;
  
  // Feature states (for reference)
  features: {
    bookingEnabled: boolean;
    escalationEnabled: boolean;
    afterHoursEnabled: boolean;
    leadCaptureEnabled: boolean;
    pricingEnabled: boolean;
    transferEnabled: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD ACTION POLICY
// ═══════════════════════════════════════════════════════════════════════════

export interface ActionPolicyInput {
  verticalId: number | null;
  channel: Channel;
  featureOverrides?: Partial<FeatureConfig>;
}

export function buildActionPolicy(input: ActionPolicyInput): ActionPolicy {
  const verticalId = input.verticalId ?? 0;
  const config = getVerticalConfig(verticalId);
  
  // Merge feature config with overrides
  const mergedFeatures = { ...config.featureConfig, ...input.featureOverrides };
  
  // Determine compliance categories
  const isLegalVertical = LEGAL_VERTICAL_IDS.includes(verticalId);
  const isMedicalVertical = MEDICAL_VERTICAL_IDS.includes(verticalId);
  const requiresComplianceGuardrails = isLegalVertical || isMedicalVertical;
  
  // Build feature states
  const features = {
    bookingEnabled: mergedFeatures.appointmentBooking !== 'OFF',
    escalationEnabled: mergedFeatures.emergencyEscalation !== 'OFF',
    afterHoursEnabled: mergedFeatures.afterHoursHandling !== 'OFF',
    leadCaptureEnabled: mergedFeatures.leadCapture !== 'OFF',
    pricingEnabled: mergedFeatures.priceQuoting === 'ON',
    transferEnabled: mergedFeatures.transferToHuman !== 'OFF',
  };
  
  // Build allowed/disabled tool lists
  const allTools = Object.keys(TOOL_FEATURE_MAP);
  const allowedTools: string[] = [];
  const disabledTools: string[] = [];
  
  for (const tool of allTools) {
    const featureKey = TOOL_FEATURE_MAP[tool];
    const featureValue = mergedFeatures[featureKey];
    
    if (featureValue === 'OFF') {
      disabledTools.push(tool);
    } else {
      allowedTools.push(tool);
    }
  }
  
  // Add workflow-based restrictions
  const workflowForbidden = config.workflowPermissions.forbidden;
  for (const forbidden of workflowForbidden) {
    const normalized = forbidden.toLowerCase().replace(/\s+/g, '_');
    if (!disabledTools.includes(normalized)) {
      disabledTools.push(normalized);
    }
  }
  
  // Build restricted topics
  const restrictedTopics: string[] = [];
  
  // Always restrict safety topics
  restrictedTopics.push(...RESTRICTED_TOPICS.safety);
  
  // Add vertical-specific restrictions
  if (isMedicalVertical) {
    restrictedTopics.push(...RESTRICTED_TOPICS.medical);
  }
  if (isLegalVertical) {
    restrictedTopics.push(...RESTRICTED_TOPICS.legal);
  }
  if (!features.pricingEnabled) {
    restrictedTopics.push(...RESTRICTED_TOPICS.financial);
  }
  
  // Build refusal templates
  const refusalTemplates: Record<string, string> = { ...REFUSAL_TEMPLATES };
  
  // Add vertical-specific primary refusals
  if (isMedicalVertical) {
    refusalTemplates.PRIMARY_REFUSAL = REFUSAL_TEMPLATES.MEDICAL_NO_DIAGNOSIS;
  } else if (isLegalVertical) {
    refusalTemplates.PRIMARY_REFUSAL = REFUSAL_TEMPLATES.LEGAL_NO_ADVICE;
  } else {
    refusalTemplates.PRIMARY_REFUSAL = REFUSAL_TEMPLATES.GENERIC_INTAKE;
  }
  
  return {
    verticalId,
    verticalName: config.verticalName,
    channel: input.channel,
    allowedTools,
    disabledTools,
    restrictedTopics,
    refusalTemplates,
    isLegalVertical,
    isMedicalVertical,
    requiresComplianceGuardrails,
    features,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL FILTERING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Filters a tool schema array based on the ActionPolicy
 * Use this to remove disabled tools from function calling schemas
 */
export function filterToolSchemas<T extends { name?: string; function?: { name: string } }>(
  tools: T[],
  policy: ActionPolicy
): T[] {
  return tools.filter(tool => {
    const toolName = tool.name || tool.function?.name || '';
    const normalizedName = toolName.toLowerCase().replace(/\s+/g, '_');
    
    // Check if explicitly disabled
    if (policy.disabledTools.some(disabled => 
      normalizedName.includes(disabled) || disabled.includes(normalizedName)
    )) {
      return false;
    }
    
    return true;
  });
}

/**
 * Checks if a specific tool is allowed
 */
export function isToolAllowed(toolName: string, policy: ActionPolicy): boolean {
  const normalized = toolName.toLowerCase().replace(/\s+/g, '_');
  return !policy.disabledTools.some(disabled => 
    normalized.includes(disabled) || disabled.includes(normalized)
  );
}

/**
 * Gets the appropriate refusal message for a disabled tool
 */
export function getToolRefusal(toolName: string, policy: ActionPolicy): string {
  const normalized = toolName.toLowerCase();
  
  if (normalized.includes('book') || normalized.includes('schedule') || normalized.includes('appointment')) {
    return REFUSAL_TEMPLATES.BOOKING_UNAVAILABLE;
  }
  if (normalized.includes('transfer') || normalized.includes('escalat')) {
    return REFUSAL_TEMPLATES.ESCALATION_UNAVAILABLE;
  }
  if (normalized.includes('quote') || normalized.includes('pric')) {
    return REFUSAL_TEMPLATES.PRICING_VARIES;
  }
  
  return REFUSAL_TEMPLATES.GENERIC_INTAKE;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT GUARDRAIL UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Checks if a topic/intent is restricted for this policy
 */
export function isTopicRestricted(topic: string, policy: ActionPolicy): boolean {
  const normalized = topic.toLowerCase().replace(/\s+/g, '_');
  return policy.restrictedTopics.some(restricted => 
    normalized.includes(restricted) || restricted.includes(normalized)
  );
}

/**
 * Gets the appropriate refusal for a restricted topic
 */
export function getTopicRefusal(topic: string, policy: ActionPolicy): string {
  const normalized = topic.toLowerCase();
  
  // Medical topics
  if (normalized.includes('diagnos') || normalized.includes('symptom') || 
      normalized.includes('treatment') || normalized.includes('medication')) {
    return REFUSAL_TEMPLATES.MEDICAL_NO_DIAGNOSIS;
  }
  
  // Legal topics
  if (normalized.includes('legal') || normalized.includes('advice') || 
      normalized.includes('case') || normalized.includes('settlement')) {
    return REFUSAL_TEMPLATES.LEGAL_NO_ADVICE;
  }
  
  // Safety topics
  if (normalized.includes('diy') || normalized.includes('self') || 
      normalized.includes('fix') || normalized.includes('repair')) {
    return REFUSAL_TEMPLATES.DIY_SAFETY_REFUSAL;
  }
  
  // Financial topics
  if (normalized.includes('price') || normalized.includes('cost') || 
      normalized.includes('quote') || normalized.includes('estimate')) {
    return REFUSAL_TEMPLATES.PRICING_VARIES;
  }
  
  // Default
  return policy.refusalTemplates.PRIMARY_REFUSAL || REFUSAL_TEMPLATES.GENERIC_INTAKE;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROMPT ENFORCEMENT SECTION GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates a prompt section that instructs the AI about restrictions
 * Include this in the system prompt for additional enforcement
 */
export function generateEnforcementPromptSection(policy: ActionPolicy): string {
  const sections: string[] = [];
  
  sections.push('## Action Restrictions');
  
  // Disabled capabilities
  if (!policy.features.bookingEnabled) {
    sections.push('- **Booking DISABLED**: Do not attempt to schedule appointments. Offer to capture details for callback.');
  }
  if (!policy.features.escalationEnabled) {
    sections.push('- **Escalation DISABLED**: Do not offer to transfer calls or dispatch immediately. Capture details instead.');
  }
  if (!policy.features.pricingEnabled) {
    sections.push('- **Pricing DISABLED**: Do not quote specific prices. Explain that pricing varies and offer follow-up.');
  }
  if (!policy.features.transferEnabled) {
    sections.push('- **Transfer DISABLED**: Cannot transfer to a human. Focus on capturing information.');
  }
  
  // Content guardrails
  if (policy.requiresComplianceGuardrails) {
    sections.push('\n## Compliance Guardrails');
    
    if (policy.isMedicalVertical) {
      sections.push('- **NEVER diagnose conditions** or recommend treatments');
      sections.push('- **NEVER interpret symptoms** or suggest what might be wrong');
      sections.push('- When asked for medical advice, respond: "' + REFUSAL_TEMPLATES.MEDICAL_NO_DIAGNOSIS + '"');
    }
    
    if (policy.isLegalVertical) {
      sections.push('- **NEVER provide legal advice** or interpret laws');
      sections.push('- **NEVER predict case outcomes** or guarantee settlements');
      sections.push('- When asked for legal advice, respond: "' + REFUSAL_TEMPLATES.LEGAL_NO_ADVICE + '"');
    }
  }
  
  // Universal safety
  sections.push('\n## Universal Safety Rules');
  sections.push('- Never provide DIY instructions for electrical, gas, or structural work');
  sections.push('- Never guarantee specific outcomes or timelines');
  sections.push('- Never make commitments on behalf of the business owner');
  
  return sections.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// EDGE FUNCTION HELPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Builds ActionPolicy from customer settings (for edge functions)
 * Lightweight version without importing heavy frontend code
 */
export function buildActionPolicyFromSettings(settings: {
  businessType: string | null;
  appointmentsEnabled: boolean;
  leadCaptureEnabled: boolean;
  afterHoursBehavior: string | null;
  transferNumber: string | null;
}, channel: Channel): ActionPolicy {
  // Resolve vertical ID from business type
  let verticalId = 0;
  if (settings.businessType) {
    // Simple mapping for common types
    const typeMap: Record<string, number> = {
      'plumbing': 1, 'hvac': 2, 'electrician': 3, 'roofing': 4,
      'water_damage': 5, 'locksmith': 6, 'towing': 7, 'auto_repair': 8,
      'tree_service': 9, 'garage_door': 10, 'appliance_repair': 11,
      'pest_control': 12, 'junk_removal': 13, 'bail_bonds': 14,
      'criminal_defense': 15, 'personal_injury': 16, 'dentist': 17,
      'property_management': 18, 'moving': 19, 'concrete': 20
    };
    const normalized = settings.businessType.toLowerCase().replace(/[\s-]+/g, '_');
    for (const [key, id] of Object.entries(typeMap)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        verticalId = id;
        break;
      }
    }
  }
  
  // Build feature overrides from settings
  const featureOverrides: Partial<FeatureConfig> = {};
  
  if (!settings.appointmentsEnabled) {
    featureOverrides.appointmentBooking = 'OFF';
  }
  if (!settings.leadCaptureEnabled) {
    featureOverrides.leadCapture = 'OFF';
  }
  if (settings.afterHoursBehavior === 'voicemail') {
    featureOverrides.afterHoursHandling = 'OFF';
    featureOverrides.emergencyEscalation = 'OFF';
  }
  if (!settings.transferNumber) {
    featureOverrides.transferToHuman = 'OFF';
  }
  
  return buildActionPolicy({
    verticalId,
    channel,
    featureOverrides
  });
}
