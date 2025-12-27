// Pipeline status utilities for leads

export type PipelineStatus = 
  | 'new_lead'
  | 'contacted'
  | 'demo_requested'
  | 'demo_completed'
  | 'hot_lead'
  | 'negotiating'
  | 'ready_to_sign'
  | 'closed_won'
  | 'closed_lost';

export interface PipelineStatusConfig {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  icon: string;
}

export const PIPELINE_STATUS_CONFIG: Record<PipelineStatus, PipelineStatusConfig> = {
  new_lead: {
    label: 'New Lead',
    shortLabel: 'New',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: '🆕',
  },
  contacted: {
    label: 'Contacted',
    shortLabel: 'Contacted',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: '📞',
  },
  demo_requested: {
    label: 'Demo Requested',
    shortLabel: 'Demo Req.',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: '🎭',
  },
  demo_completed: {
    label: 'Demo Completed',
    shortLabel: 'Demo Done',
    color: 'text-indigo-700 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    icon: '✅',
  },
  hot_lead: {
    label: 'Hot Lead',
    shortLabel: 'Hot',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: '🔥',
  },
  negotiating: {
    label: 'Negotiating',
    shortLabel: 'Negotiate',
    color: 'text-cyan-700 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    icon: '💬',
  },
  ready_to_sign: {
    label: 'Ready to Sign',
    shortLabel: 'Ready',
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: '📝',
  },
  closed_won: {
    label: 'Closed Won',
    shortLabel: 'Won',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: '🎉',
  },
  closed_lost: {
    label: 'Closed Lost',
    shortLabel: 'Lost',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800/50',
    icon: '❌',
  },
};

// Pipeline stages that show in Kanban (exclude closed states from columns)
export const KANBAN_STAGES: PipelineStatus[] = [
  'new_lead',
  'contacted', 
  'demo_requested',
  'demo_completed',
  'hot_lead',
  'negotiating',
  'ready_to_sign',
];

export const ALL_PIPELINE_STAGES: PipelineStatus[] = [
  ...KANBAN_STAGES,
  'closed_won',
  'closed_lost',
];

export function getPipelineStatusLabel(status: string): string {
  return PIPELINE_STATUS_CONFIG[status as PipelineStatus]?.label || 'Unknown';
}

export function getPipelineStatusConfig(status: string): PipelineStatusConfig {
  return PIPELINE_STATUS_CONFIG[status as PipelineStatus] || {
    label: 'Unknown',
    shortLabel: 'Unknown',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800/50',
    icon: '❓',
  };
}

// Lead source configuration
export type LeadSource = 
  | 'web_form'
  | 'manual'
  | 'affiliate_link'
  | 'direct'
  | 'prospect_search'
  | 'google_ads'
  | 'facebook_ads'
  | 'email_campaign'
  | 'landing_page'
  | 'inbound_call'
  | 'referral'
  | 'partnership'
  | 'trade_show'
  | 'other';

export interface LeadSourceConfig {
  label: string;
  icon: string;
  color: string;
}

export const LEAD_SOURCE_CONFIG: Record<LeadSource, LeadSourceConfig> = {
  web_form: { label: 'Web Form', icon: '🌐', color: 'text-blue-600' },
  manual: { label: 'Manual Entry', icon: '👤', color: 'text-gray-600' },
  affiliate_link: { label: 'Affiliate Link', icon: '🔗', color: 'text-purple-600' },
  direct: { label: 'Direct', icon: '💻', color: 'text-indigo-600' },
  prospect_search: { label: 'Prospect Search', icon: '🔍', color: 'text-amber-600' },
  google_ads: { label: 'Google Ads', icon: '📢', color: 'text-red-600' },
  facebook_ads: { label: 'Facebook Ads', icon: '📱', color: 'text-blue-700' },
  email_campaign: { label: 'Email Campaign', icon: '📧', color: 'text-green-600' },
  landing_page: { label: 'Landing Page', icon: '🎯', color: 'text-pink-600' },
  inbound_call: { label: 'Inbound Call', icon: '📞', color: 'text-teal-600' },
  referral: { label: 'Referral', icon: '🤝', color: 'text-orange-600' },
  partnership: { label: 'Partnership', icon: '🏢', color: 'text-cyan-600' },
  trade_show: { label: 'Trade Show', icon: '🎪', color: 'text-rose-600' },
  other: { label: 'Other', icon: '❓', color: 'text-gray-500' },
};

export function getLeadSourceConfig(source: string): LeadSourceConfig {
  return LEAD_SOURCE_CONFIG[source as LeadSource] || LEAD_SOURCE_CONFIG.other;
}
