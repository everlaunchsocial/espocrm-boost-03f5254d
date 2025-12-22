import { useLeadPresence } from '@/hooks/useLeadPresence';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

interface LeadPresenceIndicatorProps {
  leadId: string;
}

export function LeadPresenceIndicator({ leadId }: LeadPresenceIndicatorProps) {
  const { isEnabled } = useFeatureFlags();
  const { isActive, isLoading } = useLeadPresence(leadId);

  // Gate behind feature flag
  if (!isEnabled('aiCrmPhase2')) {
    return null;
  }

  // Don't show anything while loading or if not active
  if (isLoading || !isActive) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      <span className="font-medium">Active now</span>
    </div>
  );
}
