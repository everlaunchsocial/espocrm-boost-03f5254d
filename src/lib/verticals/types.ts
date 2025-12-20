// Prompt Mapping Layer Types for EverLaunch AI Verticals

export type Channel = 'phone' | 'web_chat' | 'web_voice' | 'sms';

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export type FeatureFlag = 'ON' | 'OFF' | 'OPTIONAL';

// Brain Rules → System Prompt Modifiers
export interface BrainRules {
  urgencyClassification: UrgencyLevel;
  alwaysCollect: string[];
  neverDo: string[];
  escalationTriggers: string[];
  toneGuidance: string;
  complianceNotes?: string[];
}

// Default Configuration → Runtime Feature Flags
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

// Skills & Actions → Workflow Permissions
export interface WorkflowPermissions {
  allowed: string[];
  forbidden: string[];
  requiresConfirmation: string[];
}

// Channel-Specific Behavior Modifiers
export interface ChannelBehavior {
  primaryAction: string;
  greetingStyle: 'urgent' | 'professional' | 'warm' | 'empathetic';
  responseLength: 'brief' | 'moderate' | 'detailed';
  canShowVisuals: boolean;
  canSendLinks: boolean;
  interruptionHandling: string;
  fallbackBehavior: string;
}

export interface ChannelOverrides {
  phone: ChannelBehavior;
  web_chat: ChannelBehavior;
  web_voice: ChannelBehavior;
  sms: ChannelBehavior;
}

// Complete Vertical Prompt Configuration
export interface VerticalPromptConfig {
  verticalId: number;
  verticalName: string;
  brainRules: BrainRules;
  featureConfig: FeatureConfig;
  workflowPermissions: WorkflowPermissions;
  channelOverrides: ChannelOverrides;
}

// Prompt Generation Context
export interface PromptContext {
  channel: Channel;
  businessName: string;
  verticalId: number;
  customOverrides?: Partial<FeatureConfig>;
  additionalInstructions?: string;
  // Optional runtime context
  isAfterHours?: boolean;
  currentTime?: string;
  callerInfo?: {
    name?: string;
    phone?: string;
  };
}
