// Vertical Prompt Generator for Edge Functions
// Self-contained version for Supabase Edge Functions

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type Channel = 'phone' | 'web_chat' | 'web_voice' | 'sms';
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';
export type FeatureFlag = 'ON' | 'OFF' | 'OPTIONAL';

export interface BrainRules {
  urgencyClassification: UrgencyLevel;
  alwaysCollect: string[];
  neverDo: string[];
  escalationTriggers: string[];
  toneGuidance: string;
  complianceNotes?: string[];
}

export interface FeatureConfig {
  appointmentBooking: FeatureFlag;
  emergencyEscalation: FeatureFlag;
  afterHoursHandling: FeatureFlag;
  leadCapture: FeatureFlag;
  callbackScheduling: FeatureFlag;
  insuranceInfoCollection: FeatureFlag;
  priceQuoting: FeatureFlag;
  locationVerification: FeatureFlag;
  smsFollowUp: FeatureFlag;
  transferToHuman: FeatureFlag;
}

export interface ChannelBehavior {
  primaryAction: string;
  greetingStyle: 'urgent' | 'professional' | 'warm' | 'empathetic';
  responseLength: 'brief' | 'moderate' | 'detailed';
  canShowVisuals: boolean;
  canSendLinks: boolean;
  interruptionHandling: string;
  fallbackBehavior: string;
}

export interface CustomerSettings {
  customerId: string;
  businessName: string;
  businessType: string | null;
  websiteUrl: string | null;
  aiName: string;
  voiceInstructions: string | null;
  greetingText: string | null;
  leadCaptureEnabled: boolean;
  appointmentsEnabled: boolean;
  afterHoursBehavior: 'voicemail' | 'lead_capture' | 'emergency_only' | null;
  businessHours: Record<string, { open: string; close: string }> | null;
  customerTimezone: string | null;
  transferNumber: string | null;
  leadEmail: string | null;
  leadSmsNumber: string | null;
  knowledgeContent: string | null;
  // Config version for cache invalidation
  settingsUpdatedAt: string | null;
  calendarUpdatedAt: string | null;
  voiceUpdatedAt: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// VERTICAL ID MAPPING
// ═══════════════════════════════════════════════════════════════════════════

const VERTICAL_ID_MAP: Record<string, number> = {
  'plumbing': 1, 'plumber': 1,
  'hvac': 2, 'heating': 2, 'cooling': 2, 'air_conditioning': 2,
  'electrician': 3, 'electrical': 3,
  'roofing': 4, 'roofer': 4,
  'water_damage': 5, 'restoration': 5,
  'locksmith': 6,
  'towing': 7, 'tow_truck': 7,
  'auto_repair': 8, 'mechanic': 8,
  'tree_service': 9, 'tree_removal': 9,
  'garage_door': 10,
  'appliance_repair': 11,
  'pest_control': 12, 'exterminator': 12,
  'junk_removal': 13,
  'bail_bonds': 14,
  'criminal_defense': 15,
  'personal_injury': 16, 'pi_attorney': 16,
  'dentist': 17, 'dental': 17,
  'property_management': 18,
  'moving': 19, 'movers': 19,
  'concrete': 20, 'masonry': 20,
};

// Fallback to Generic Local Business (0) instead of Plumbing
const DEFAULT_VERTICAL_ID = 0;

// Compliance-aware verticals
const MEDICAL_VERTICAL_IDS = [17, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92];
const LEGAL_VERTICAL_IDS = [14, 15, 16, 66, 67, 68, 69, 70];

const COMPLIANCE_MODIFIERS = {
  medical: [
    'NEVER provide medical diagnosis, treatment recommendations, or health advice',
    'ALWAYS recommend consulting with a licensed healthcare professional',
    'Do NOT interpret symptoms or suggest conditions',
    'Capture intake information only and schedule appointments',
    'For emergencies, advise calling 911 immediately'
  ],
  legal: [
    'NEVER provide legal advice or interpret laws',
    'ALWAYS recommend consulting with a licensed attorney',
    'Do NOT guarantee case outcomes or settlement amounts',
    'Capture case details for attorney review only',
    'Maintain strict confidentiality in all communications'
  ]
};

function getComplianceModifiers(verticalId: number): string[] {
  const modifiers: string[] = [];
  if (MEDICAL_VERTICAL_IDS.includes(verticalId)) modifiers.push(...COMPLIANCE_MODIFIERS.medical);
  if (LEGAL_VERTICAL_IDS.includes(verticalId)) modifiers.push(...COMPLIANCE_MODIFIERS.legal);
  return modifiers;
}

export function resolveVerticalId(businessType: string | null): number {
  if (!businessType) {
    console.warn('[VerticalResolver] No business type provided, using Generic Local Business fallback');
    return DEFAULT_VERTICAL_ID;
  }
  const normalized = businessType.toLowerCase().replace(/[\s-]+/g, '_');
  if (VERTICAL_ID_MAP[normalized]) return VERTICAL_ID_MAP[normalized];
  for (const [key, id] of Object.entries(VERTICAL_ID_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return id;
  }
  console.warn(`[VerticalResolver] Unknown business type "${businessType}", using Generic Local Business fallback`);
  return DEFAULT_VERTICAL_ID;
}

// ═══════════════════════════════════════════════════════════════════════════
// VERTICAL CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

interface VerticalConfig {
  name: string;
  brainRules: BrainRules;
  featureConfig: FeatureConfig;
  channelBehavior: Record<Channel, ChannelBehavior>;
}

// Generic Local Business fallback configuration
const GENERIC_LOCAL_BUSINESS_CONFIG: VerticalConfig = {
  name: 'Generic Local Business',
  brainRules: {
    urgencyClassification: 'medium',
    alwaysCollect: ['callback_number', 'name', 'reason_for_contact'],
    neverDo: [
      'provide_medical_diagnosis_or_advice',
      'provide_legal_advice',
      'guarantee_outcomes_or_pricing',
      'make_commitments_on_behalf_of_owner'
    ],
    escalationTriggers: ['request_for_human', 'complaint', 'emergency_mentioned'],
    toneGuidance: 'Calm, concise, and professional. Be helpful without overcommitting.',
    complianceNotes: [
      'Never provide medical diagnosis or health advice',
      'Never provide legal advice',
      'Never guarantee pricing',
      'Encourage professional consultation for specialized questions'
    ]
  },
  featureConfig: {
    appointmentBooking: 'OPTIONAL', emergencyEscalation: 'OFF', afterHoursHandling: 'ON',
    leadCapture: 'ON', callbackScheduling: 'ON', insuranceInfoCollection: 'OFF',
    priceQuoting: 'OFF', locationVerification: 'OPTIONAL', smsFollowUp: 'OPTIONAL', transferToHuman: 'ON'
  },
  channelBehavior: {
    phone: { primaryAction: 'Capture caller intent and contact info, offer callback', greetingStyle: 'professional', responseLength: 'brief', canShowVisuals: false, canSendLinks: false, interruptionHandling: 'Allow natural conversation flow', fallbackBehavior: 'Capture callback number and promise follow-up' },
    web_chat: { primaryAction: 'Qualify inquiry and capture lead information', greetingStyle: 'warm', responseLength: 'moderate', canShowVisuals: true, canSendLinks: true, interruptionHandling: 'Queue and respond in order', fallbackBehavior: 'Offer contact form or callback request' },
    web_voice: { primaryAction: 'Conversational intake with visual support', greetingStyle: 'professional', responseLength: 'brief', canShowVisuals: true, canSendLinks: true, interruptionHandling: 'Natural conversation flow', fallbackBehavior: 'Switch to chat or capture callback' },
    sms: { primaryAction: 'Brief responses, direct to call for complex inquiries', greetingStyle: 'professional', responseLength: 'brief', canShowVisuals: false, canSendLinks: true, interruptionHandling: 'Async processing', fallbackBehavior: 'Suggest calling for detailed assistance' }
  }
};

const VERTICAL_CONFIGS: Record<number, VerticalConfig> = {
  0: GENERIC_LOCAL_BUSINESS_CONFIG,
  1: {
    name: 'Plumbing',
    brainRules: {
      urgencyClassification: 'critical',
      alwaysCollect: ['issue_type', 'address', 'callback_number', 'water_shutoff_status'],
      neverDo: ['provide_diy_instructions_for_gas_lines', 'quote_prices_without_inspection', 'diagnose_over_phone'],
      escalationTriggers: ['gas_smell', 'sewage_backup', 'flooding', 'no_water'],
      toneGuidance: 'Calm and reassuring during emergencies. Efficient and professional for routine calls.',
      complianceNotes: ['Never advise on gas line work', 'Always recommend shutting off water for active leaks']
    },
    featureConfig: {
      appointmentBooking: 'ON', emergencyEscalation: 'ON', afterHoursHandling: 'ON',
      leadCapture: 'ON', callbackScheduling: 'ON', insuranceInfoCollection: 'OPTIONAL',
      priceQuoting: 'OFF', locationVerification: 'ON', smsFollowUp: 'ON', transferToHuman: 'ON'
    },
    channelBehavior: {
      phone: { primaryAction: 'Triage urgency and book or dispatch', greetingStyle: 'urgent', responseLength: 'brief', canShowVisuals: false, canSendLinks: false, interruptionHandling: 'Allow interruption for emergency details', fallbackBehavior: 'Capture callback number and promise return call within 15 minutes' },
      web_chat: { primaryAction: 'Qualify issue and capture lead info', greetingStyle: 'professional', responseLength: 'moderate', canShowVisuals: true, canSendLinks: true, interruptionHandling: 'Queue responses', fallbackBehavior: 'Offer callback request form' },
      web_voice: { primaryAction: 'Mirror phone behavior with visual support', greetingStyle: 'urgent', responseLength: 'brief', canShowVisuals: true, canSendLinks: true, interruptionHandling: 'Allow interruption', fallbackBehavior: 'Switch to chat or capture callback' },
      sms: { primaryAction: 'Confirm appointments and send reminders', greetingStyle: 'professional', responseLength: 'brief', canShowVisuals: false, canSendLinks: true, interruptionHandling: 'Async', fallbackBehavior: 'Prompt to call for urgent issues' }
    }
  },
};

function getVerticalConfig(verticalId: number): VerticalConfig {
  const config = VERTICAL_CONFIGS[verticalId];
  if (!config) {
    console.warn(`[VerticalConfig] Unknown verticalId ${verticalId}, using Generic Local Business fallback`);
    return GENERIC_LOCAL_BUSINESS_CONFIG;
  }
  return config;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROMPT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

function formatFieldName(field: string): string {
  return field.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function generateBrainRulesSection(rules: BrainRules): string {
  const sections: string[] = [];
  
  const urgencyMap = {
    critical: 'Treat all calls as potentially urgent. Prioritize speed and safety.',
    high: 'Many calls are time-sensitive. Assess urgency quickly.',
    medium: 'Balance efficiency with thoroughness.',
    low: 'Focus on quality over speed.'
  };
  sections.push(`## Urgency Level\n${urgencyMap[rules.urgencyClassification]}`);
  
  if (rules.alwaysCollect.length > 0) {
    sections.push(`## Required Information\nYou MUST collect:\n${rules.alwaysCollect.map(i => `- ${formatFieldName(i)}`).join('\n')}`);
  }
  
  if (rules.neverDo.length > 0) {
    sections.push(`## Strict Prohibitions\nNEVER:\n${rules.neverDo.map(i => `- ${i.replace(/_/g, ' ')}`).join('\n')}`);
  }
  
  if (rules.escalationTriggers.length > 0) {
    sections.push(`## Emergency Escalation\nImmediately escalate for:\n${rules.escalationTriggers.map(t => `- ${formatFieldName(t)}`).join('\n')}`);
  }
  
  sections.push(`## Communication Style\n${rules.toneGuidance}`);
  
  if (rules.complianceNotes?.length) {
    sections.push(`## Compliance\n${rules.complianceNotes.map(n => `- ${n}`).join('\n')}`);
  }
  
  return sections.join('\n\n');
}

function generateFeatureSection(config: FeatureConfig, overrides?: Partial<FeatureConfig>): string {
  const merged = { ...config, ...overrides };
  const capabilities: string[] = [];
  const restrictions: string[] = [];
  
  if (merged.appointmentBooking === 'ON') capabilities.push('Schedule appointments directly');
  else if (merged.appointmentBooking === 'OFF') restrictions.push('Do NOT book appointments');
  
  if (merged.emergencyEscalation === 'ON') capabilities.push('Escalate emergencies to dispatch');
  if (merged.leadCapture === 'ON') capabilities.push('Capture contact information');
  if (merged.priceQuoting === 'OFF') restrictions.push('Do NOT quote prices');
  if (merged.transferToHuman === 'ON') capabilities.push('Transfer to human when needed');
  
  let prompt = '';
  if (capabilities.length) prompt += `## Capabilities\n${capabilities.map(c => `- ${c}`).join('\n')}\n\n`;
  if (restrictions.length) prompt += `## Restrictions\n${restrictions.map(r => `- ${r}`).join('\n')}`;
  return prompt;
}

function generateChannelSection(channel: Channel, behavior: ChannelBehavior): string {
  const channelNames: Record<Channel, string> = {
    phone: 'Phone Call', web_chat: 'Web Chat', web_voice: 'Web Voice', sms: 'SMS'
  };
  
  const greetingStyles: Record<string, string> = {
    urgent: 'Get to the point quickly. The caller may be stressed.',
    professional: 'Be polite and efficient.',
    warm: 'Be friendly and personable.',
    empathetic: 'Show understanding and compassion.'
  };
  
  const responseLengths: Record<string, string> = {
    brief: 'Keep responses short.', moderate: 'Provide helpful context.', detailed: 'Offer thorough explanations.'
  };
  
  return `## ${channelNames[channel]} Channel
**Goal:** ${behavior.primaryAction}
**Tone:** ${greetingStyles[behavior.greetingStyle]}
**Style:** ${responseLengths[behavior.responseLength]}
**Fallback:** ${behavior.fallbackBehavior}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT: Generate Complete Prompt
// ═══════════════════════════════════════════════════════════════════════════

export interface PromptGenerationOptions {
  channel: Channel;
  businessName: string;
  verticalId: number;
  aiName?: string;
  websiteUrl?: string;
  voiceInstructions?: string;
  knowledgeContent?: string;
  businessHours?: Record<string, { open: string; close: string }>;
  featureOverrides?: Partial<FeatureConfig>;
}

export function generateCompletePrompt(options: PromptGenerationOptions): string {
  const config = getVerticalConfig(options.verticalId);
  const channelBehavior = config.channelBehavior[options.channel];
  
  const sections: string[] = [];
  
  // Header
  sections.push(`# ${options.businessName} AI Assistant`);
  sections.push(`*${config.name} Specialist*\n`);
  
  // AI Identity
  if (options.aiName) {
    sections.push(`Your name is ${options.aiName}.`);
  }
  
  // Channel behavior
  sections.push(generateChannelSection(options.channel, channelBehavior));
  
  // Brain rules
  sections.push('\n' + generateBrainRulesSection(config.brainRules));
  
  // Compliance safety modifiers (always added for medical/legal verticals)
  const complianceModifiers = getComplianceModifiers(options.verticalId);
  if (complianceModifiers.length > 0) {
    sections.push(`\n## Compliance & Safety Requirements\n${complianceModifiers.map(m => `- ${m}`).join('\n')}`);
  }
  
  // Features
  sections.push('\n' + generateFeatureSection(config.featureConfig, options.featureOverrides));
  
  // Website
  if (options.websiteUrl) {
    sections.push(`\n## Business Website\n${options.websiteUrl}`);
  }
  
  // Custom instructions
  if (options.voiceInstructions) {
    sections.push(`\n## Custom Instructions\n${options.voiceInstructions}`);
  }
  
  // Business hours
  if (options.businessHours && Object.keys(options.businessHours).length > 0) {
    const hoursStr = Object.entries(options.businessHours)
      .map(([day, { open, close }]) => `- ${day}: ${open} - ${close}`)
      .join('\n');
    sections.push(`\n## Business Hours\n${hoursStr}`);
  }
  
  // Knowledge base
  if (options.knowledgeContent) {
    const truncated = options.knowledgeContent.length > 6000 
      ? options.knowledgeContent.substring(0, 6000) + '...' 
      : options.knowledgeContent;
    sections.push(`\n=== KNOWLEDGE BASE ===\n${truncated}`);
  }
  
  return sections.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// FETCH CUSTOMER SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchCustomerSettings(
  supabase: SupabaseClient,
  customerId: string
): Promise<CustomerSettings | null> {
  try {
    const { data: profile } = await supabase
      .from('customer_profiles')
      .select(`id, business_name, business_type, website_url, lead_capture_enabled,
               lead_email, lead_sms_number, business_hours, customer_timezone,
               after_hours_behavior, phone, settings_updated_at`)
      .eq('id', customerId)
      .single();
    
    if (!profile) return null;
    
    const { data: voiceSettings } = await supabase
      .from('voice_settings')
      .select('ai_name, greeting_text, updated_at')
      .eq('customer_id', customerId)
      .maybeSingle();
    
    const { data: chatSettings } = await supabase
      .from('chat_settings')
      .select('instructions')
      .eq('customer_id', customerId)
      .maybeSingle();
    
    const { data: calendarSettings } = await supabase
      .from('calendar_integrations')
      .select('appointments_enabled, updated_at')
      .eq('customer_id', customerId)
      .maybeSingle();
    
    const { data: knowledgeSources } = await supabase
      .from('customer_knowledge_sources')
      .select('content_text, file_name')
      .eq('customer_id', customerId)
      .eq('status', 'processed')
      .not('content_text', 'is', null);
    
    let knowledgeContent: string | null = null;
    if (knowledgeSources?.length) {
      knowledgeContent = knowledgeSources
        .map((src: any) => `[${src.file_name}]:\n${src.content_text}`)
        .join('\n\n');
    }
    
    return {
      customerId: profile.id,
      businessName: profile.business_name || 'the business',
      businessType: profile.business_type,
      websiteUrl: profile.website_url,
      aiName: voiceSettings?.ai_name || 'Ashley',
      voiceInstructions: chatSettings?.instructions || null,
      greetingText: voiceSettings?.greeting_text || null,
      leadCaptureEnabled: profile.lead_capture_enabled ?? true,
      appointmentsEnabled: calendarSettings?.appointments_enabled ?? false,
      afterHoursBehavior: profile.after_hours_behavior,
      businessHours: profile.business_hours,
      customerTimezone: profile.customer_timezone,
      transferNumber: profile.phone,
      leadEmail: profile.lead_email,
      leadSmsNumber: profile.lead_sms_number,
      knowledgeContent,
      // Config version timestamps for cache invalidation
      settingsUpdatedAt: profile.settings_updated_at || null,
      calendarUpdatedAt: calendarSettings?.updated_at || null,
      voiceUpdatedAt: voiceSettings?.updated_at || null,
    };
  } catch (error) {
    console.error('Error fetching customer settings:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD PROMPT FROM SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

export function generatePromptFromSettings(
  settings: CustomerSettings,
  channel: Channel
): string {
  const verticalId = resolveVerticalId(settings.businessType);
  
  // Build feature overrides from settings
  const featureOverrides: Partial<FeatureConfig> = {};
  if (!settings.leadCaptureEnabled) featureOverrides.leadCapture = 'OFF';
  if (settings.appointmentsEnabled) featureOverrides.appointmentBooking = 'ON';
  if (settings.afterHoursBehavior === 'voicemail') {
    featureOverrides.afterHoursHandling = 'OFF';
    featureOverrides.emergencyEscalation = 'OFF';
  }
  
  return generateCompletePrompt({
    channel,
    businessName: settings.businessName,
    verticalId,
    aiName: settings.aiName,
    websiteUrl: settings.websiteUrl || undefined,
    voiceInstructions: settings.voiceInstructions || undefined,
    knowledgeContent: settings.knowledgeContent || undefined,
    businessHours: settings.businessHours || undefined,
    featureOverrides,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG VERSION HELPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute a config version hash from settings timestamps
 * Used for cache keying and stale detection
 */
export function computeConfigVersion(settings: CustomerSettings): string {
  const timestamps = [
    settings.settingsUpdatedAt,
    settings.calendarUpdatedAt,
    settings.voiceUpdatedAt,
  ].filter(Boolean).sort();
  
  if (timestamps.length === 0) return 'no-version';
  
  // Return the most recent timestamp as the version
  return timestamps[timestamps.length - 1] || 'no-version';
}

/**
 * Log detailed config resolution info for debugging
 */
export function logConfigResolution(
  context: string,
  settings: CustomerSettings,
  policy: ActionPolicy
): void {
  const configVersion = computeConfigVersion(settings);
  
  console.log(`[${context}] Config Resolution:`);
  console.log(`  - Customer: ${settings.customerId}`);
  console.log(`  - Business: ${settings.businessName} (${settings.businessType || 'generic'})`);
  console.log(`  - Vertical ID: ${policy.verticalId} (${policy.verticalName})`);
  console.log(`  - Config Version: ${configVersion}`);
  console.log(`  - Channel: ${policy.channel}`);
  console.log(`  - Features:`);
  console.log(`    • Booking: ${policy.features.bookingEnabled ? 'ON' : 'OFF'}`);
  console.log(`    • Escalation: ${policy.features.escalationEnabled ? 'ON' : 'OFF'}`);
  console.log(`    • Lead Capture: ${policy.features.leadCaptureEnabled ? 'ON' : 'OFF'}`);
  console.log(`    • Transfer: ${policy.features.transferEnabled ? 'ON' : 'OFF'}`);
  console.log(`    • Pricing: ${policy.features.pricingEnabled ? 'ON' : 'OFF'}`);
  console.log(`  - Compliance: ${policy.requiresComplianceGuardrails ? 'REQUIRED' : 'standard'}`);
  console.log(`  - Allowed Tools: ${policy.allowedTools.length}`);
  console.log(`  - Disabled Tools: ${policy.disabledTools.join(', ') || 'none'}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION POLICY ENFORCEMENT (Edge Function version)
// ═══════════════════════════════════════════════════════════════════════════

export const REFUSAL_TEMPLATES = {
  LEGAL_NO_ADVICE: "I can't provide legal advice, but I can connect you with our attorney who can help. Would you like me to schedule a consultation or have someone call you back?",
  MEDICAL_NO_DIAGNOSIS: "I'm not able to diagnose conditions, but I can help you schedule an appointment with our team who can evaluate your situation properly. What works best for you?",
  PRICING_VARIES: "Pricing depends on the specific situation. I can capture your details and have someone follow up with an accurate quote. Can I get your contact information?",
  DIY_SAFETY_REFUSAL: "For safety reasons, I can't provide instructions for that. Our licensed professionals can handle it safely. Would you like to schedule a service call?",
  NO_GUARANTEES: "I can't guarantee specific outcomes, but I can have our team review your situation and discuss options. Can I schedule that for you?",
  BOOKING_UNAVAILABLE: "I'm not able to schedule appointments directly right now, but I can take your information and have someone call you back to set that up.",
  ESCALATION_UNAVAILABLE: "I can't transfer you to someone right now, but I can make sure your message gets to the right person. Can I get your callback number?",
  GENERIC_INTAKE: "I'd be happy to help. Let me get some information so the right person can assist you. Can I start with your name and callback number?"
} as const;

export interface ActionPolicy {
  verticalId: number;
  verticalName: string;
  channel: Channel;
  allowedTools: string[];
  disabledTools: string[];
  restrictedTopics: string[];
  isLegalVertical: boolean;
  isMedicalVertical: boolean;
  requiresComplianceGuardrails: boolean;
  features: {
    bookingEnabled: boolean;
    escalationEnabled: boolean;
    afterHoursEnabled: boolean;
    leadCaptureEnabled: boolean;
    pricingEnabled: boolean;
    transferEnabled: boolean;
  };
}

// Tool to feature mapping
const TOOL_FEATURE_MAP: Record<string, keyof FeatureConfig> = {
  'create_booking': 'appointmentBooking',
  'schedule_appointment': 'appointmentBooking',
  'book_appointment': 'appointmentBooking',
  'live_transfer': 'emergencyEscalation',
  'transfer_to_human': 'transferToHuman',
  'emergency_dispatch': 'emergencyEscalation',
  'capture_lead': 'leadCapture',
  'quote_estimate': 'priceQuoting',
  'provide_pricing': 'priceQuoting',
};

export function buildActionPolicy(
  verticalId: number,
  channel: Channel,
  featureOverrides?: Partial<FeatureConfig>
): ActionPolicy {
  const config = getVerticalConfig(verticalId);
  const mergedFeatures = { ...config.featureConfig, ...featureOverrides };
  
  const isLegalVertical = LEGAL_VERTICAL_IDS.includes(verticalId);
  const isMedicalVertical = MEDICAL_VERTICAL_IDS.includes(verticalId);
  
  const features = {
    bookingEnabled: mergedFeatures.appointmentBooking !== 'OFF',
    escalationEnabled: mergedFeatures.emergencyEscalation !== 'OFF',
    afterHoursEnabled: mergedFeatures.afterHoursHandling !== 'OFF',
    leadCaptureEnabled: mergedFeatures.leadCapture !== 'OFF',
    pricingEnabled: mergedFeatures.priceQuoting === 'ON',
    transferEnabled: mergedFeatures.transferToHuman !== 'OFF',
  };
  
  const allowedTools: string[] = [];
  const disabledTools: string[] = [];
  
  for (const [tool, featureKey] of Object.entries(TOOL_FEATURE_MAP)) {
    if (mergedFeatures[featureKey] === 'OFF') {
      disabledTools.push(tool);
    } else {
      allowedTools.push(tool);
    }
  }
  
  const restrictedTopics: string[] = ['diy_electrical', 'diy_gas_work', 'unsafe_instructions'];
  if (isMedicalVertical) restrictedTopics.push('medical_diagnosis', 'treatment_recommendation');
  if (isLegalVertical) restrictedTopics.push('legal_advice', 'case_outcome_prediction');
  if (!features.pricingEnabled) restrictedTopics.push('price_guarantee');
  
  return {
    verticalId,
    verticalName: config.name,
    channel,
    allowedTools,
    disabledTools,
    restrictedTopics,
    isLegalVertical,
    isMedicalVertical,
    requiresComplianceGuardrails: isLegalVertical || isMedicalVertical,
    features,
  };
}

export function generateEnforcementPromptSection(policy: ActionPolicy): string {
  const sections: string[] = ['## Action Restrictions'];
  
  if (!policy.features.bookingEnabled) {
    sections.push('- **Booking DISABLED**: Do not schedule appointments. Offer to capture details for callback.');
  }
  if (!policy.features.escalationEnabled) {
    sections.push('- **Escalation DISABLED**: Do not offer to transfer or dispatch. Capture details instead.');
  }
  if (!policy.features.pricingEnabled) {
    sections.push('- **Pricing DISABLED**: Do not quote prices. Explain pricing varies and offer follow-up.');
  }
  if (!policy.features.transferEnabled) {
    sections.push('- **Transfer DISABLED**: Cannot transfer to human. Focus on capturing information.');
  }
  
  if (policy.requiresComplianceGuardrails) {
    sections.push('\n## Compliance Guardrails');
    if (policy.isMedicalVertical) {
      sections.push('- **NEVER diagnose conditions** or recommend treatments');
      sections.push(`- When asked for medical advice: "${REFUSAL_TEMPLATES.MEDICAL_NO_DIAGNOSIS}"`);
    }
    if (policy.isLegalVertical) {
      sections.push('- **NEVER provide legal advice** or predict case outcomes');
      sections.push(`- When asked for legal advice: "${REFUSAL_TEMPLATES.LEGAL_NO_ADVICE}"`);
    }
  }
  
  sections.push('\n## Universal Safety');
  sections.push('- Never provide DIY instructions for electrical, gas, or structural work');
  sections.push('- Never guarantee outcomes or make binding commitments');
  
  return sections.join('\n');
}

export function filterToolSchemas<T extends { name?: string; function?: { name: string } }>(
  tools: T[],
  policy: ActionPolicy
): T[] {
  return tools.filter(tool => {
    const toolName = (tool.name || tool.function?.name || '').toLowerCase().replace(/\s+/g, '_');
    return !policy.disabledTools.some(d => toolName.includes(d) || d.includes(toolName));
  });
}
