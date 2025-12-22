import { useLeadHealthScore, HealthLevel } from '@/hooks/useLeadHealthScore';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Activity, HelpCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface LeadHealthScoreMeterProps {
  leadId: string;
}

const levelConfig: Record<HealthLevel, {
  label: string;
  color: string;
  bgColor: string;
  progressClass: string;
}> = {
  excellent: {
    label: 'Excellent',
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    progressClass: 'bg-green-500',
  },
  good: {
    label: 'Good',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    progressClass: 'bg-blue-500',
  },
  fair: {
    label: 'Fair',
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    progressClass: 'bg-amber-500',
  },
  poor: {
    label: 'Poor',
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    progressClass: 'bg-red-500',
  },
};

export function LeadHealthScoreMeter({ leadId }: LeadHealthScoreMeterProps) {
  const { data, isLoading } = useLeadHealthScore(leadId);

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const config = levelConfig[data.level];

  const breakdownItems = [
    { label: 'No demo view (7d)', value: data.breakdown.demoViewPenalty, show: data.breakdown.demoViewPenalty !== 0 },
    { label: 'No activity (7d)', value: data.breakdown.activityPenalty, show: data.breakdown.activityPenalty !== 0 },
    { label: 'Stale (>3d)', value: data.breakdown.stalePenalty, show: data.breakdown.stalePenalty !== 0 },
    { label: 'Recent reply (2d)', value: data.breakdown.replyBonus, show: data.breakdown.replyBonus !== 0 },
    { label: 'Demo views', value: data.breakdown.demoViewBonus, show: data.breakdown.demoViewBonus !== 0 },
  ].filter(item => item.show);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Health Score
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="font-medium mb-1">How it's calculated:</p>
                <ul className="text-xs space-y-0.5">
                  <li>Start at 100 points</li>
                  <li>−30 if no demo view in 7d</li>
                  <li>−20 if no activity in 7d</li>
                  <li>−10 if last touch &gt;3d ago</li>
                  <li>+10 for reply in last 2d</li>
                  <li>+5 per demo view (max +15)</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-bold ${config.color}`}>
            {data.score}
          </div>
          <div className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color} font-medium`}>
            {config.label}
          </div>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Progress 
                  value={data.score} 
                  className="h-2"
                  indicatorClassName={config.progressClass}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Score reflects engagement in past 14 days</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {breakdownItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {breakdownItems.map((item, i) => (
              <span
                key={i}
                className={`text-xs px-1.5 py-0.5 rounded ${
                  item.value > 0 
                    ? 'bg-green-500/10 text-green-600' 
                    : 'bg-red-500/10 text-red-600'
                }`}
              >
                {item.value > 0 ? '+' : ''}{item.value} {item.label}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
