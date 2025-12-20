// EverLaunch Vertical Prompt Mapping Layer
// Central export for all vertical configuration and prompt generation utilities

// Types
export type {
  Channel,
  UrgencyLevel,
  FeatureFlag,
  BrainRules,
  FeatureConfig,
  WorkflowPermissions,
  ChannelBehavior,
  ChannelOverrides,
  VerticalPromptConfig,
  PromptContext
} from './types';

// Vertical Configurations
export {
  verticalPromptMappings,
  getVerticalConfig,
  TOP_20_VERTICAL_IDS,
  GENERIC_LOCAL_BUSINESS_CONFIG,
  MEDICAL_VERTICAL_IDS,
  LEGAL_VERTICAL_IDS,
  COMPLIANCE_MODIFIERS,
  isComplianceAwareVertical,
  getComplianceModifiers
} from './promptMappings';

// Prompt Generation Utilities
export {
  // Brain Rules → System Prompt
  generateBrainRulesPrompt,
  
  // Feature Config → Runtime Flags
  generateFeatureFlagsObject,
  generateFeatureFlagsPrompt,
  
  // Workflow Permissions → Action Constraints
  generateWorkflowPermissionsPrompt,
  getWorkflowPermissionsList,
  
  // Channel Behavior → Channel-Specific Prompts
  generateChannelBehaviorPrompt,
  
  // Complete Prompt Generation
  generateCompletePrompt,
  
  // Channel Comparison Utilities
  getChannelDifferences,
  getAllChannelPrompts
} from './promptGenerator';

// Context Resolution Utilities
export {
  resolvePromptContext,
  resolveVerticalId,
  buildFeatureOverrides,
  buildAdditionalInstructions,
  fetchCustomerSettings,
  createInlineSettings,
  type CustomerSettings
} from './promptContextResolver';

// Action Policy Enforcement
export {
  buildActionPolicy,
  buildActionPolicyFromSettings,
  filterToolSchemas,
  isToolAllowed,
  getToolRefusal,
  isTopicRestricted,
  getTopicRefusal,
  generateEnforcementPromptSection,
  REFUSAL_TEMPLATES,
  RESTRICTED_TOPICS,
  type ActionPolicy,
  type ActionPolicyInput,
  type RefusalType
} from './actionPolicy';
