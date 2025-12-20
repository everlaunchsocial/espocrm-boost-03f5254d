// Prompt Context Resolver for EverLaunch AI Runtime Channels
// Resolves customer settings into PromptContext for generateCompletePrompt

import { Channel, PromptContext, FeatureConfig } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER CONTEXT INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

export interface CustomerSettings {
  // Core identity
  customerId: string;
  businessName: string;
  businessType: string | null; // Maps to verticalId
  websiteUrl: string | null;
  
  // Voice/AI settings
  aiName: string;
  voiceInstructions: string | null;
  greetingText: string | null;
  
  // Feature toggles from onboarding/settings
  leadCaptureEnabled: boolean;
  appointmentsEnabled: boolean;
  afterHoursBehavior: 'voicemail' | 'lead_capture' | 'emergency_only' | null;
  
  // Business hours
  businessHours: Record<string, { open: string; close: string }> | null;
  customerTimezone: string | null;
  
  // Contact routing
  transferNumber: string | null;
  leadEmail: string | null;
  leadSmsNumber: string | null;
  
  // Knowledge base content (pre-fetched)
  knowledgeContent: string | null;
  
  // Timestamps for cache invalidation
  settingsUpdatedAt: Date | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// VERTICAL ID MAPPING
// ═══════════════════════════════════════════════════════════════════════════

// Maps business_type strings to verticalId numbers
const VERTICAL_ID_MAP: Record<string, number> = {
  // Top 20 core verticals
  'plumbing': 1,
  'plumber': 1,
  'hvac': 2,
  'heating': 2,
  'cooling': 2,
  'air_conditioning': 2,
  'electrician': 3,
  'electrical': 3,
  'roofing': 4,
  'roofer': 4,
  'water_damage': 5,
  'restoration': 5,
  'locksmith': 6,
  'towing': 7,
  'tow_truck': 7,
  'auto_repair': 8,
  'mechanic': 8,
  'tree_service': 9,
  'tree_removal': 9,
  'garage_door': 10,
  'appliance_repair': 11,
  'pest_control': 12,
  'exterminator': 12,
  'junk_removal': 13,
  'bail_bonds': 14,
  'criminal_defense': 15,
  'personal_injury': 16,
  'pi_attorney': 16,
  'dentist': 17,
  'dental': 17,
  'property_management': 18,
  'moving': 19,
  'movers': 19,
  'concrete': 20,
  'masonry': 20,
};

// Default vertical for unknown business types (Generic Local Business)
const DEFAULT_VERTICAL_ID = 0; // Generic Local Business - neutral, safe fallback

/**
 * Resolves business_type string to verticalId number
 * Falls back to Generic Local Business (0) for unknown types
 */
export function resolveVerticalId(businessType: string | null): number {
  if (!businessType) {
    console.warn('[VerticalResolver] No business type provided, using Generic Local Business fallback');
    return DEFAULT_VERTICAL_ID;
  }
  
  const normalized = businessType.toLowerCase().replace(/[\s-]+/g, '_');
  
  // Direct match
  if (VERTICAL_ID_MAP[normalized]) {
    return VERTICAL_ID_MAP[normalized];
  }
  
  // Partial match (e.g., "plumbing company" should match "plumbing")
  for (const [key, id] of Object.entries(VERTICAL_ID_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return id;
    }
  }
  
  console.warn(`[VerticalResolver] Unknown business type "${businessType}", using Generic Local Business fallback`);
  return DEFAULT_VERTICAL_ID;
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE CONFIG OVERRIDES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Builds feature config overrides based on customer settings
 */
export function buildFeatureOverrides(settings: CustomerSettings): Partial<FeatureConfig> {
  const overrides: Partial<FeatureConfig> = {};
  
  // Lead capture toggle
  if (settings.leadCaptureEnabled === false) {
    overrides.leadCapture = 'OFF';
  }
  
  // Appointment booking toggle
  if (settings.appointmentsEnabled === true) {
    overrides.appointmentBooking = 'ON';
  } else if (settings.appointmentsEnabled === false) {
    overrides.appointmentBooking = 'OFF';
  }
  
  // After hours behavior
  if (settings.afterHoursBehavior) {
    switch (settings.afterHoursBehavior) {
      case 'voicemail':
        overrides.afterHoursHandling = 'OFF';
        overrides.emergencyEscalation = 'OFF';
        break;
      case 'lead_capture':
        overrides.afterHoursHandling = 'ON';
        overrides.emergencyEscalation = 'OFF';
        break;
      case 'emergency_only':
        overrides.afterHoursHandling = 'ON';
        overrides.emergencyEscalation = 'ON';
        break;
    }
  }
  
  // Transfer capability (if no transfer number, disable)
  if (!settings.transferNumber) {
    overrides.transferToHuman = 'OFF';
  }
  
  return overrides;
}

// ═══════════════════════════════════════════════════════════════════════════
// ADDITIONAL INSTRUCTIONS BUILDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Builds additional instructions string from customer settings
 */
export function buildAdditionalInstructions(settings: CustomerSettings): string {
  const sections: string[] = [];
  
  // AI name
  sections.push(`Your name is ${settings.aiName}.`);
  
  // Business website
  if (settings.websiteUrl) {
    sections.push(`The business website is ${settings.websiteUrl}.`);
  }
  
  // Custom voice instructions
  if (settings.voiceInstructions) {
    sections.push(`\nCustom Instructions:\n${settings.voiceInstructions}`);
  }
  
  // Business hours context
  if (settings.businessHours && Object.keys(settings.businessHours).length > 0) {
    const hoursStr = formatBusinessHours(settings.businessHours);
    sections.push(`\nBusiness Hours:\n${hoursStr}`);
  }
  
  // Lead routing info
  if (settings.leadEmail || settings.leadSmsNumber) {
    let routing = '\nLead Routing:';
    if (settings.leadEmail) routing += `\n- Email leads to: ${settings.leadEmail}`;
    if (settings.leadSmsNumber) routing += `\n- SMS notifications to: ${settings.leadSmsNumber}`;
    sections.push(routing);
  }
  
  // Knowledge base content
  if (settings.knowledgeContent && settings.knowledgeContent.length > 0) {
    const truncated = settings.knowledgeContent.length > 6000 
      ? settings.knowledgeContent.substring(0, 6000) + '...' 
      : settings.knowledgeContent;
    sections.push(`\n=== KNOWLEDGE BASE ===\n${truncated}`);
  }
  
  return sections.join('\n');
}

/**
 * Formats business hours for prompt inclusion
 */
function formatBusinessHours(hours: Record<string, { open: string; close: string }>): string {
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const formatted: string[] = [];
  
  for (const day of dayOrder) {
    if (hours[day]) {
      const { open, close } = hours[day];
      const dayName = day.charAt(0).toUpperCase() + day.slice(1);
      formatted.push(`- ${dayName}: ${open} - ${close}`);
    }
  }
  
  return formatted.length > 0 ? formatted.join('\n') : 'Hours not specified';
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN RESOLVER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolves customer settings into a complete PromptContext
 * This is the main entry point for runtime channel prompt generation
 */
export function resolvePromptContext(
  settings: CustomerSettings,
  channel: Channel
): PromptContext {
  const verticalId = resolveVerticalId(settings.businessType);
  const customOverrides = buildFeatureOverrides(settings);
  const additionalInstructions = buildAdditionalInstructions(settings);
  
  return {
    channel,
    businessName: settings.businessName || 'the business',
    verticalId,
    customOverrides,
    additionalInstructions,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE FETCH HELPER (for Edge Functions)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetches customer settings from Supabase
 * Use this in Edge Functions to load settings before generating prompts
 */
export async function fetchCustomerSettings(
  supabase: any,
  customerId: string
): Promise<CustomerSettings | null> {
  try {
    // Fetch customer profile
    const { data: profile, error: profileError } = await supabase
      .from('customer_profiles')
      .select(`
        id,
        business_name,
        business_type,
        website_url,
        lead_capture_enabled,
        lead_email,
        lead_sms_number,
        business_hours,
        customer_timezone,
        after_hours_behavior,
        phone
      `)
      .eq('id', customerId)
      .single();
    
    if (profileError || !profile) {
      console.error('Error fetching customer profile:', profileError);
      return null;
    }
    
    // Fetch voice settings
    const { data: voiceSettings } = await supabase
      .from('voice_settings')
      .select('ai_name, greeting_text, voice_id, voice_speed')
      .eq('customer_id', customerId)
      .maybeSingle();
    
    // Fetch chat settings for instructions
    const { data: chatSettings } = await supabase
      .from('chat_settings')
      .select('instructions, tone')
      .eq('customer_id', customerId)
      .maybeSingle();
    
    // Fetch calendar integration for appointments
    const { data: calendarSettings } = await supabase
      .from('calendar_integrations')
      .select('appointments_enabled')
      .eq('customer_id', customerId)
      .maybeSingle();
    
    // Fetch knowledge sources content
    const { data: knowledgeSources } = await supabase
      .from('customer_knowledge_sources')
      .select('content_text, file_name')
      .eq('customer_id', customerId)
      .eq('status', 'processed')
      .not('content_text', 'is', null);
    
    let knowledgeContent: string | null = null;
    if (knowledgeSources && knowledgeSources.length > 0) {
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
      afterHoursBehavior: profile.after_hours_behavior as any || null,
      businessHours: profile.business_hours || null,
      customerTimezone: profile.customer_timezone || null,
      transferNumber: profile.phone || null,
      leadEmail: profile.lead_email || null,
      leadSmsNumber: profile.lead_sms_number || null,
      knowledgeContent,
      settingsUpdatedAt: new Date(),
    };
  } catch (error) {
    console.error('Error in fetchCustomerSettings:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INLINE SETTINGS BUILDER (for non-DB scenarios)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates CustomerSettings from inline parameters
 * Useful for demos or when settings aren't in DB
 */
export function createInlineSettings(params: {
  businessName: string;
  businessType?: string;
  websiteUrl?: string;
  aiName?: string;
  voiceInstructions?: string;
  knowledgeContent?: string;
}): CustomerSettings {
  return {
    customerId: 'inline',
    businessName: params.businessName,
    businessType: params.businessType || null,
    websiteUrl: params.websiteUrl || null,
    aiName: params.aiName || 'Ashley',
    voiceInstructions: params.voiceInstructions || null,
    greetingText: null,
    leadCaptureEnabled: true,
    appointmentsEnabled: false,
    afterHoursBehavior: null,
    businessHours: null,
    customerTimezone: null,
    transferNumber: null,
    leadEmail: null,
    leadSmsNumber: null,
    knowledgeContent: params.knowledgeContent || null,
    settingsUpdatedAt: null,
  };
}
