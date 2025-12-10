// Pipeline status utilities for leads

export type PipelineStatus = 
  | 'new_lead'
  | 'contact_attempted'
  | 'demo_created'
  | 'demo_sent'
  | 'demo_engaged'
  | 'ready_to_buy'
  | 'customer_won'
  | 'lost_closed';

export interface PipelineStatusConfig {
  label: string;
  color: string;
  bgColor: string;
}

export const PIPELINE_STATUS_CONFIG: Record<PipelineStatus, PipelineStatusConfig> = {
  new_lead: {
    label: 'New',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  contact_attempted: {
    label: 'Contact attempted',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  demo_created: {
    label: 'Demo created',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  demo_sent: {
    label: 'Demo sent',
    color: 'text-indigo-700 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
  demo_engaged: {
    label: 'Demo engaged',
    color: 'text-cyan-700 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
  ready_to_buy: {
    label: 'Ready to buy',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  customer_won: {
    label: 'Customer',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  lost_closed: {
    label: 'Closed – Lost',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800/50',
  },
};

export function getPipelineStatusLabel(status: string): string {
  return PIPELINE_STATUS_CONFIG[status as PipelineStatus]?.label || 'Unknown';
}

export function getPipelineStatusConfig(status: string): PipelineStatusConfig {
  return PIPELINE_STATUS_CONFIG[status as PipelineStatus] || {
    label: 'Unknown',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800/50',
  };
}
