// Prompt Generation Utilities for EverLaunch AI
// Generates channel-specific prompts from vertical configurations

import { 
  VerticalPromptConfig, 
  PromptContext, 
  Channel, 
  BrainRules, 
  FeatureConfig, 
  WorkflowPermissions,
  ChannelBehavior 
} from './types';
import { getVerticalConfig, getComplianceModifiers, GENERIC_LOCAL_BUSINESS_CONFIG } from './promptMappings';

// ═══════════════════════════════════════════════════════════════════════════
// BRAIN RULES → SYSTEM PROMPT MODIFIERS
// ═══════════════════════════════════════════════════════════════════════════

export function generateBrainRulesPrompt(brainRules: BrainRules): string {
  const sections: string[] = [];

  // Urgency Classification
  const urgencyMap = {
    critical: 'Treat all calls as potentially urgent. Prioritize speed and safety.',
    high: 'Many calls are time-sensitive. Assess urgency quickly and act accordingly.',
    medium: 'Balance efficiency with thoroughness. Some situations require urgency.',
    low: 'Focus on quality over speed. Most inquiries are planning-oriented.'
  };
  sections.push(`## Urgency Level\n${urgencyMap[brainRules.urgencyClassification]}`);

  // Always Collect
  if (brainRules.alwaysCollect.length > 0) {
    sections.push(`## Required Information\nYou MUST collect the following before ending any interaction:\n${brainRules.alwaysCollect.map(item => `- ${formatFieldName(item)}`).join('\n')}`);
  }

  // Never Do
  if (brainRules.neverDo.length > 0) {
    sections.push(`## Strict Prohibitions\nYou must NEVER do the following:\n${brainRules.neverDo.map(item => `- ${formatProhibition(item)}`).join('\n')}`);
  }

  // Escalation Triggers
  if (brainRules.escalationTriggers.length > 0) {
    sections.push(`## Emergency Escalation\nImmediately escalate or dispatch for:\n${brainRules.escalationTriggers.map(trigger => `- ${formatTrigger(trigger)}`).join('\n')}`);
  }

  // Tone Guidance
  sections.push(`## Communication Style\n${brainRules.toneGuidance}`);

  // Compliance Notes
  if (brainRules.complianceNotes && brainRules.complianceNotes.length > 0) {
    sections.push(`## Compliance Requirements\n${brainRules.complianceNotes.map(note => `- ${note}`).join('\n')}`);
  }

  return sections.join('\n\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION → RUNTIME FEATURE FLAGS
// ═══════════════════════════════════════════════════════════════════════════

export function generateFeatureFlagsObject(
  config: FeatureConfig, 
  overrides?: Partial<FeatureConfig>
): Record<string, boolean> {
  const merged = { ...config, ...overrides };
  
  return {
    canBookAppointments: merged.appointmentBooking === 'ON',
    canEscalateEmergencies: merged.emergencyEscalation !== 'OFF',
    handlesAfterHours: merged.afterHoursHandling !== 'OFF',
    capturesLeads: merged.leadCapture === 'ON',
    schedulesCallbacks: merged.callbackScheduling === 'ON',
    collectsInsurance: merged.insuranceInfoCollection !== 'OFF',
    canQuotePrices: merged.priceQuoting === 'ON',
    verifiesLocation: merged.locationVerification === 'ON',
    sendsSmsFollowUp: merged.smsFollowUp !== 'OFF',
    canTransferToHuman: merged.transferToHuman === 'ON',
    
    // Optional features (ON or OPTIONAL)
    mayQuotePrices: merged.priceQuoting !== 'OFF',
    mayCollectInsurance: merged.insuranceInfoCollection !== 'OFF',
    mayEscalateEmergencies: merged.emergencyEscalation !== 'OFF',
    mayHandleAfterHours: merged.afterHoursHandling !== 'OFF'
  };
}

export function generateFeatureFlagsPrompt(config: FeatureConfig): string {
  const capabilities: string[] = [];
  const restrictions: string[] = [];

  // Appointment Booking
  if (config.appointmentBooking === 'ON') {
    capabilities.push('Schedule appointments directly');
  } else if (config.appointmentBooking === 'OPTIONAL') {
    capabilities.push('Schedule appointments when appropriate');
  } else {
    restrictions.push('Do NOT attempt to book appointments');
  }

  // Emergency Escalation
  if (config.emergencyEscalation === 'ON') {
    capabilities.push('Escalate emergencies immediately to dispatch');
  } else if (config.emergencyEscalation === 'OFF') {
    restrictions.push('Route emergencies to callback, not immediate dispatch');
  }

  // After Hours
  if (config.afterHoursHandling === 'ON') {
    capabilities.push('Handle after-hours calls with full capabilities');
  } else if (config.afterHoursHandling === 'OFF') {
    restrictions.push('After hours: capture callback only, no dispatch');
  }

  // Lead Capture
  if (config.leadCapture === 'ON') {
    capabilities.push('Always capture contact information for follow-up');
  }

  // Insurance Collection
  if (config.insuranceInfoCollection === 'ON') {
    capabilities.push('Collect insurance information proactively');
  } else if (config.insuranceInfoCollection === 'OPTIONAL') {
    capabilities.push('Ask about insurance when relevant');
  }

  // Price Quoting
  if (config.priceQuoting === 'ON') {
    capabilities.push('Provide price information when asked');
  } else if (config.priceQuoting === 'OFF') {
    restrictions.push('Do NOT quote specific prices');
  }

  // Location Verification
  if (config.locationVerification === 'ON') {
    capabilities.push('Verify exact location/address before dispatch');
  }

  // Transfer to Human
  if (config.transferToHuman === 'ON') {
    capabilities.push('Transfer to a human when requested or necessary');
  }

  let prompt = '';
  if (capabilities.length > 0) {
    prompt += `## Capabilities\n${capabilities.map(c => `- ${c}`).join('\n')}\n\n`;
  }
  if (restrictions.length > 0) {
    prompt += `## Restrictions\n${restrictions.map(r => `- ${r}`).join('\n')}`;
  }

  return prompt;
}

// ═══════════════════════════════════════════════════════════════════════════
// SKILLS & ACTIONS → WORKFLOW PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

export function generateWorkflowPermissionsPrompt(permissions: WorkflowPermissions): string {
  const sections: string[] = [];

  if (permissions.allowed.length > 0) {
    sections.push(`## Allowed Actions\nYou CAN:\n${permissions.allowed.map(a => `- ${formatAction(a)}`).join('\n')}`);
  }

  if (permissions.forbidden.length > 0) {
    sections.push(`## Forbidden Actions\nYou CANNOT:\n${permissions.forbidden.map(f => `- ${formatAction(f)}`).join('\n')}`);
  }

  if (permissions.requiresConfirmation.length > 0) {
    sections.push(`## Requires Confirmation\nConfirm with caller before:\n${permissions.requiresConfirmation.map(c => `- ${formatAction(c)}`).join('\n')}`);
  }

  return sections.join('\n\n');
}

export function getWorkflowPermissionsList(permissions: WorkflowPermissions): {
  allowed: string[];
  forbidden: string[];
  requiresConfirmation: string[];
} {
  return {
    allowed: permissions.allowed,
    forbidden: permissions.forbidden,
    requiresConfirmation: permissions.requiresConfirmation
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CHANNEL BEHAVIOR → CHANNEL-SPECIFIC PROMPT MODIFIERS
// ═══════════════════════════════════════════════════════════════════════════

export function generateChannelBehaviorPrompt(channel: Channel, behavior: ChannelBehavior): string {
  const channelNames: Record<Channel, string> = {
    phone: 'Phone Call',
    web_chat: 'Web Chat',
    web_voice: 'Web Voice',
    sms: 'SMS'
  };

  const greetingStyles: Record<string, string> = {
    urgent: 'Get to the point quickly. The caller may be stressed.',
    professional: 'Be polite and efficient. Maintain business tone.',
    warm: 'Be friendly and personable. Build rapport naturally.',
    empathetic: 'Show understanding and compassion. Acknowledge their situation.'
  };

  const responseLengths: Record<string, string> = {
    brief: 'Keep responses short and action-oriented.',
    moderate: 'Provide helpful context but stay focused.',
    detailed: 'Offer thorough explanations when helpful.'
  };

  const sections: string[] = [];

  sections.push(`## ${channelNames[channel]} Channel Behavior`);
  sections.push(`**Primary Goal:** ${behavior.primaryAction}`);
  sections.push(`**Tone:** ${greetingStyles[behavior.greetingStyle]}`);
  sections.push(`**Response Style:** ${responseLengths[behavior.responseLength]}`);

  if (behavior.canShowVisuals) {
    sections.push('**Visual Support:** You can display calendars, forms, and images.');
  }

  if (behavior.canSendLinks) {
    sections.push('**Links:** You can send clickable links and buttons.');
  }

  sections.push(`**Interruptions:** ${behavior.interruptionHandling}`);
  sections.push(`**Fallback:** ${behavior.fallbackBehavior}`);

  return sections.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE PROMPT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

export function generateCompletePrompt(context: PromptContext): string {
  // Safe fallback - getVerticalConfig always returns a valid config
  const config = context.verticalId != null 
    ? getVerticalConfig(context.verticalId)
    : GENERIC_LOCAL_BUSINESS_CONFIG;

  const channelBehavior = config.channelOverrides[context.channel];

  const sections: string[] = [];

  // Header
  sections.push(`# ${context.businessName} AI Assistant`);
  sections.push(`*${config.verticalName} Specialist*\n`);

  // Channel-specific behavior
  sections.push(generateChannelBehaviorPrompt(context.channel, channelBehavior));

  // Brain rules
  sections.push('\n' + generateBrainRulesPrompt(config.brainRules));

  // Compliance safety modifiers (always added for medical/legal verticals)
  const complianceModifiers = context.verticalId != null 
    ? getComplianceModifiers(context.verticalId) 
    : [];
  
  if (complianceModifiers.length > 0) {
    sections.push(`\n## Compliance & Safety Requirements\n${complianceModifiers.map(m => `- ${m}`).join('\n')}`);
  }

  // Feature flags as prompt
  sections.push('\n' + generateFeatureFlagsPrompt(config.featureConfig));

  // Workflow permissions
  sections.push('\n' + generateWorkflowPermissionsPrompt(config.workflowPermissions));

  // Additional instructions
  if (context.additionalInstructions) {
    sections.push(`\n## Business-Specific Instructions\n${context.additionalInstructions}`);
  }

  return sections.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FORMATTERS
// ═══════════════════════════════════════════════════════════════════════════

function formatFieldName(field: string): string {
  return field.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function formatProhibition(prohibition: string): string {
  return prohibition.split('_').join(' ');
}

function formatTrigger(trigger: string): string {
  return trigger.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function formatAction(action: string): string {
  return action.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

export function getChannelDifferences(verticalId: number): Record<Channel, ChannelBehavior> | null {
  const config = getVerticalConfig(verticalId);
  if (!config) return null;
  return config.channelOverrides;
}

export function getAllChannelPrompts(
  verticalId: number, 
  businessName: string
): Record<Channel, string> {
  const channels: Channel[] = ['phone', 'web_chat', 'web_voice', 'sms'];
  const prompts: Record<string, string> = {};

  for (const channel of channels) {
    prompts[channel] = generateCompletePrompt({ 
      channel, 
      businessName, 
      verticalId 
    });
  }

  return prompts as Record<Channel, string>;
}
