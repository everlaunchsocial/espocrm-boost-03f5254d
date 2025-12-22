import { useLeadStatusPrediction } from '@/hooks/useLeadStatusPrediction';
import { useLeadHealthScore } from '@/hooks/useLeadHealthScore';
import { useContactWindowSuggestions } from '@/hooks/useContactWindowSuggestions';
import { useLeadSnapshot } from '@/hooks/useLeadSnapshot';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Flame, Activity, Calendar, Eye, 
  MessageCircle, XCircle, Clock, HelpCircle
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface LeadAtAGlanceProps {
  leadId: string;
}

export function LeadAtAGlance({ leadId }: LeadAtAGlanceProps) {
  const { data: prediction, isLoading: predictionLoading } = useLeadStatusPrediction(leadId);
  const { data: healthScore, isLoading: healthLoading } = useLeadHealthScore(leadId);
  const { data: contactWindows, isLoading: windowsLoading } = useContactWindowSuggestions(leadId);
  const { data: snapshot, isLoading: snapshotLoading } = useLeadSnapshot(leadId);

  const isLoading = predictionLoading || healthLoading || windowsLoading || snapshotLoading;

  if (isLoading) {
    return (
      <div className="bg-muted/30 rounded-lg p-3">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
      </div>
    );
  }

  const cards: React.ReactNode[] = [];

  // Status Prediction card
  if (prediction) {
    const predConfig = {
      hot: { icon: Flame, label: 'Likely to Buy', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      warm: { icon: HelpCircle, label: 'Unsure', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      cold: { icon: XCircle, label: 'Unlikely', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
    };
    const config = predConfig[prediction.status];
    const Icon = config.icon;

    cards.push(
      <TooltipProvider key="prediction">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border ${config.className}`}>
              <Icon className="h-3.5 w-3.5" />
              <span>{config.label}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs font-medium">Status Prediction</p>
            <p className="text-xs text-muted-foreground">{prediction.reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Health Score card
  if (healthScore) {
    const healthConfig = {
      excellent: { className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      good: { className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      fair: { className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      poor: { className: 'bg-red-500/10 text-red-600 border-red-500/20' },
    };
    const config = healthConfig[healthScore.level];

    cards.push(
      <TooltipProvider key="health">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border ${config.className}`}>
              <Activity className="h-3.5 w-3.5" />
              <span>{healthScore.score}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs font-medium">Health Score: {healthScore.level}</p>
            <p className="text-xs text-muted-foreground">Based on 14-day engagement</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Suggested Contact Window card
  if (contactWindows?.primary) {
    const best = contactWindows.primary;
    cards.push(
      <TooltipProvider key="window">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-500/10 text-indigo-600 rounded-md text-xs font-medium border border-indigo-500/20">
              <Calendar className="h-3.5 w-3.5" />
              <span>{best.label}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs font-medium">Best Contact Window</p>
            <p className="text-xs text-muted-foreground">Based on {contactWindows.totalDataPoints} data points</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Demo Progress card
  if (snapshot?.demoProgress.hasDemo) {
    const progress = snapshot.demoProgress.progressPercent ?? 0;
    cards.push(
      <TooltipProvider key="demo">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-500/10 text-cyan-600 rounded-md text-xs font-medium border border-cyan-500/20">
              <Eye className="h-3.5 w-3.5" />
              <span>{progress}% watched</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs font-medium">Demo Progress</p>
            <p className="text-xs text-muted-foreground">
              Last viewed {snapshot.demoProgress.lastViewedAt 
                ? formatDistanceToNow(new Date(snapshot.demoProgress.lastViewedAt), { addSuffix: true })
                : 'N/A'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Response History card
  if (snapshot?.responseHistory) {
    const rh = snapshot.responseHistory;
    
    if (rh.hasRecentReply) {
      cards.push(
        <TooltipProvider key="response">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-500/10 text-green-600 rounded-md text-xs font-medium border border-green-500/20">
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Replied</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Lead replied in last 2 days</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else if (rh.hasNoResponse7d) {
      cards.push(
        <TooltipProvider key="response">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/10 text-red-600 rounded-md text-xs font-medium border border-red-500/20">
                <XCircle className="h-3.5 w-3.5" />
                <span>No Response</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">No activity in last 7 days</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else if (rh.lastTouchAt) {
      const daysAgo = formatDistanceToNow(new Date(rh.lastTouchAt), { addSuffix: true });
      cards.push(
        <TooltipProvider key="response">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted text-muted-foreground rounded-md text-xs font-medium border border-border">
                <Clock className="h-3.5 w-3.5" />
                <span>Last: {daysAgo}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Last touch was a {rh.lastTouchType?.replace('_', ' ')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
      <div className="flex flex-wrap gap-2">
        {cards}
      </div>
    </div>
  );
}
