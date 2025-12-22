import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMessagePerformance } from '@/hooks/useMessagePerformance';
import { 
  BarChart3, 
  Mail, 
  MailOpen, 
  MousePointerClick, 
  Presentation,
  Loader2,
  ChevronRight,
  Info
} from 'lucide-react';

interface MessagePerformanceInsightsProps {
  leadId: string;
  onViewDetails?: () => void;
}

export function MessagePerformanceInsights({ leadId, onViewDetails }: MessagePerformanceInsightsProps) {
  const { data: stats, isLoading, error } = useMessagePerformance(leadId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading performance data...</span>
      </div>
    );
  }

  if (error || !stats) {
    return null;
  }

  // Don't show if no messages have been sent
  if (stats.totalSent === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Message Performance</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          No messages sent to this lead in the past 30 days.
        </p>
      </div>
    );
  }

  const getProgressColor = (rate: number): string => {
    if (rate >= 60) return 'bg-green-500';
    if (rate >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-medium">Message Performance</h4>
          <Badge variant="secondary" className="text-xs">
            Last 30 days
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="space-y-3">
        {/* Total Sent */}
        <div className="flex items-center justify-between">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Emails Sent</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total emails sent to this lead</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Badge variant="outline" className="font-mono">
            {stats.emailsSent}
          </Badge>
        </div>

        {/* Open Rate */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <MailOpen className="h-3.5 w-3.5 text-purple-500" />
                    <span className="text-xs text-muted-foreground">Open Rate</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{stats.totalOpens} opens from {stats.emailsSent} emails</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-xs font-medium">{stats.openRate}%</span>
          </div>
          <Progress 
            value={stats.openRate} 
            className="h-1.5"
            indicatorClassName={getProgressColor(stats.openRate)}
          />
        </div>

        {/* Click Rate */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <MousePointerClick className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Click Rate</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{stats.totalClicks} link clicks total</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-xs font-medium">{stats.clickRate}%</span>
          </div>
          <Progress 
            value={stats.clickRate} 
            className="h-1.5"
            indicatorClassName={getProgressColor(stats.clickRate)}
          />
        </div>

        {/* Demo Clicks */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Presentation className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-xs text-muted-foreground">Demo Link Clicks</span>
                    <Info className="h-3 w-3 text-muted-foreground/50" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{stats.totalDemoClicks} demo link clicks from {stats.emailsSent} emails sent</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-xs font-medium">{stats.demoClickRate}%</span>
          </div>
          <Progress 
            value={stats.demoClickRate} 
            className="h-1.5"
            indicatorClassName={getProgressColor(stats.demoClickRate)}
          />
        </div>
      </div>

      {/* View Details Link */}
      {onViewDetails && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-xs text-muted-foreground hover:text-foreground"
          onClick={onViewDetails}
        >
          View message history
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      )}
    </div>
  );
}
