import { Eye } from 'lucide-react';
import { useLeadViews } from '@/hooks/useLeadViews';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { formatDistanceToNow } from 'date-fns';

interface LeadViewsIndicatorProps {
  leadId: string;
}

export function LeadViewsIndicator({ leadId }: LeadViewsIndicatorProps) {
  const { isEnabled } = useFeatureFlags();
  const { lastView, isLoading } = useLeadViews(leadId);

  if (!isEnabled('aiCrmPhase2')) return null;
  if (isLoading || !lastView) return null;

  const timeAgo = formatDistanceToNow(new Date(lastView.viewed_at), { addSuffix: true });

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Eye className="h-3 w-3" />
      <span>Last opened {timeAgo}</span>
    </div>
  );
}
