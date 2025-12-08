// Helper to determine if a pipeline status transition is allowed (never downgrade)
import { PipelineStatus } from './pipelineStatus';

const STATUS_ORDER: PipelineStatus[] = [
  'new_lead',
  'contact_attempted',
  'demo_created',
  'demo_sent',
  'demo_engaged',
  'ready_to_buy',
  'customer_won',
  'lost_closed',
];

export function canAdvanceStatus(currentStatus: string, newStatus: PipelineStatus): boolean {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus as PipelineStatus);
  const newIndex = STATUS_ORDER.indexOf(newStatus);
  
  // If current status is unknown, allow the transition
  if (currentIndex === -1) return true;
  
  // Only allow forward progression (or same status)
  return newIndex > currentIndex;
}

export function shouldAutoUpdateStatus(currentStatus: string, newStatus: PipelineStatus): boolean {
  // Don't auto-update if already at ready_to_buy, customer_won, or lost_closed
  const protectedStatuses: PipelineStatus[] = ['ready_to_buy', 'customer_won', 'lost_closed'];
  if (protectedStatuses.includes(currentStatus as PipelineStatus)) {
    return false;
  }
  
  return canAdvanceStatus(currentStatus, newStatus);
}
