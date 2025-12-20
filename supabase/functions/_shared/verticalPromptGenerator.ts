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

const DEFAULT_VERTICAL_ID = 1;

export function resolveVerticalId(businessType: string | null): number {
  if (!businessType) return DEFAULT_VERTICAL_ID;
  const normalized = businessType.toLowerCase().replace(/[\s-]+/g, '_');
  if (VERTICAL_ID_MAP[normalized]) return VERTICAL_ID_MAP[normalized];
  for (const [key, id] of Object.entries(VERTICAL_ID_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return id;
  }
  return DEFAULT_VERTICAL_ID;
}

// ═══════════════════════════════════════════════════════════════════════════
// VERTICAL CONFIGURATIONS (Top 20 inline for Edge Functions)
// ═══════════════════════════════════════════════════════════════════════════

interface VerticalConfig {
  name: string;
  brainRules: BrainRules;
  featureConfig: FeatureConfig;
  channelBehavior: Record<Channel, ChannelBehavior>;
}

const VERTICAL_CONFIGS: Record<number, VerticalConfig> = {
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
  // Add more verticals as needed - for brevity, we'll use a default fallback
};

function getVerticalConfig(verticalId: number): VerticalConfig {
  return VERTICAL_CONFIGS[verticalId] || VERTICAL_CONFIGS[1]; // Default to plumbing
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
               after_hours_behavior, phone`)
      .eq('id', customerId)
      .single();
    
    if (!profile) return null;
    
    const { data: voiceSettings } = await supabase
      .from('voice_settings')
      .select('ai_name, greeting_text')
      .eq('customer_id', customerId)
      .maybeSingle();
    
    const { data: chatSettings } = await supabase
      .from('chat_settings')
      .select('instructions')
      .eq('customer_id', customerId)
      .maybeSingle();
    
    const { data: calendarSettings } = await supabase
      .from('calendar_integrations')
      .select('appointments_enabled')
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
