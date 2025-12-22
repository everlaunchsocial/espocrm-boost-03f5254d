import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Filter, TrendingDown, ArrowDown } from 'lucide-react';
import { useFeedbackFunnel } from '@/hooks/useFeedbackFunnel';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';

export function FeedbackFunnel() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [daysBack, setDaysBack] = useState(30);

  const { data: stages = [], isLoading } = useFeedbackFunnel({ daysBack });

  // Only show to admins
  if (roleLoading) return null;
  if (!isAdmin) return null;

  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Response Funnel
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Last</span>
            <Select value={daysBack.toString()} onValueChange={(v) => setDaysBack(Number(v))}>
              <SelectTrigger className="h-7 w-[90px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : stages.every(s => s.count === 0) ? (
          <div className="text-center py-8">
            <TrendingDown className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No funnel data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Data will appear as users interact with suggestions
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {stages.map((stage, index) => {
              const widthPercent = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
              const isLast = index === stages.length - 1;

              return (
                <div key={stage.name} className="relative">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          {/* Funnel bar */}
                          <div
                            className="h-12 rounded-lg flex items-center justify-between px-4 cursor-help transition-all hover:opacity-90"
                            style={{
                              width: `${Math.max(widthPercent, 20)}%`,
                              backgroundColor: stage.fill,
                              marginLeft: `${(100 - Math.max(widthPercent, 20)) / 2}%`,
                            }}
                          >
                            <span className="text-sm font-medium text-white truncate">
                              {stage.name}
                            </span>
                            <span className="text-sm font-bold text-white">
                              {stage.count}
                            </span>
                          </div>

                          {/* Percentage badge */}
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-2">
                            <span
                              className={cn(
                                'text-xs font-medium px-2 py-0.5 rounded-full',
                                stage.percentage >= 70 ? 'bg-success/20 text-success' :
                                stage.percentage >= 40 ? 'bg-warning/20 text-warning' :
                                'bg-destructive/20 text-destructive'
                              )}
                            >
                              {stage.percentage}%
                            </span>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium">{stage.name}</p>
                          <p className="text-sm">Count: {stage.count}</p>
                          {index > 0 && (
                            <p className="text-sm text-muted-foreground">
                              {stage.dropOff}% drop-off from previous stage
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Drop-off arrow between stages */}
                  {!isLast && stages[index + 1] && (
                    <div className="flex items-center justify-center py-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ArrowDown className="h-3 w-3" />
                        <span>
                          {stages[index + 1].dropOff > 0 
                            ? `${stages[index + 1].dropOff}% drop-off`
                            : 'No drop-off'
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Summary stats */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Conversion</span>
                <span className={cn(
                  'font-medium',
                  stages[stages.length - 1]?.percentage >= 50 ? 'text-success' :
                  stages[stages.length - 1]?.percentage >= 25 ? 'text-warning' :
                  'text-destructive'
                )}>
                  {stages[0]?.count > 0 
                    ? `${Math.round((stages[stages.length - 1]?.count / stages[0]?.count) * 100)}%`
                    : '0%'
                  }
                  <span className="text-muted-foreground font-normal ml-1">
                    ({stages[stages.length - 1]?.count} of {stages[0]?.count})
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
