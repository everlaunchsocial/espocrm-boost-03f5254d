import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLeadDemoViews } from '@/hooks/useLeadDemoViews';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { Video, Send, BarChart3, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface DemoEngagementHeatmapProps {
  leadId: string;
  onSendFollowUp?: () => void;
}

// Generate engagement segments from progress percent
function generateSegments(progressPercent: number): { percent: number; intensity: number; label: string }[] {
  const segments: { percent: number; intensity: number; label: string }[] = [];
  const totalSegments = 10;
  
  for (let i = 0; i < totalSegments; i++) {
    const segmentStart = i * 10;
    const segmentEnd = (i + 1) * 10;
    
    if (progressPercent >= segmentEnd) {
      // Fully watched segment
      segments.push({ percent: segmentEnd, intensity: 1, label: 'Watched fully' });
    } else if (progressPercent > segmentStart) {
      // Partially watched segment (drop-off point)
      const partialIntensity = (progressPercent - segmentStart) / 10;
      segments.push({ percent: segmentEnd, intensity: partialIntensity, label: 'Partial watch (drop-off)' });
    } else {
      // Not watched
      segments.push({ percent: segmentEnd, intensity: 0, label: 'Not watched' });
    }
  }
  
  return segments;
}

function getIntensityClass(intensity: number): string {
  if (intensity >= 0.9) return 'bg-primary';
  if (intensity >= 0.7) return 'bg-primary/80';
  if (intensity >= 0.5) return 'bg-primary/60';
  if (intensity >= 0.3) return 'bg-primary/40';
  if (intensity > 0) return 'bg-primary/20';
  return 'bg-muted';
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function DemoEngagementHeatmap({ leadId, onSendFollowUp }: DemoEngagementHeatmapProps) {
  const { flags } = useFeatureFlags();
  const { data: demoViews, isLoading } = useLeadDemoViews(leadId);
  const [showDetailModal, setShowDetailModal] = useState(false);

  if (!flags.aiCrmPhase2) return null;

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading demo engagement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!demoViews || demoViews.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Video className="h-4 w-4" />
            <span className="text-sm">No demo views recorded yet</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get the most recent view with highest progress
  const bestView = demoViews.reduce((best, current) => {
    const bestProgress = best.progress_percent || 0;
    const currentProgress = current.progress_percent || 0;
    return currentProgress > bestProgress ? current : best;
  }, demoViews[0]);

  const progressPercent = bestView.progress_percent || 0;
  const watchDuration = bestView.watch_duration_seconds || 0;
  const segments = generateSegments(progressPercent);

  // Generate summary text
  const getSummaryText = () => {
    if (progressPercent >= 100) {
      return `Lead watched the entire demo (${formatDuration(watchDuration)}).`;
    } else if (progressPercent >= 75) {
      return `Lead watched ${progressPercent}% of the demo. Strong engagement!`;
    } else if (progressPercent >= 50) {
      return `Lead watched ${progressPercent}% of the demo. Dropped off around ${Math.floor(progressPercent / 10) * 10}%.`;
    } else if (progressPercent >= 25) {
      return `Lead watched ${progressPercent}% of the demo. Consider a shorter follow-up.`;
    } else if (progressPercent > 0) {
      return `Lead only watched ${progressPercent}% of the demo. Early drop-off detected.`;
    }
    return 'Lead opened demo but did not watch.';
  };

  return (
    <TooltipProvider>
      <Card className="border-border">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Demo Engagement
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowDetailModal(true)}
              className="h-6 px-2 text-xs"
            >
              View Details
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-4 px-4 space-y-3">
          {/* Heatmap Bar */}
          <div className="flex gap-0.5 h-6 rounded overflow-hidden">
            {segments.map((segment, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <div
                    className={`flex-1 ${getIntensityClass(segment.intensity)} transition-colors cursor-pointer hover:opacity-80`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {(index * 10)}% - {segment.percent}%: {segment.label}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Progress Labels */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>

          {/* Summary Text */}
          <p className="text-sm text-muted-foreground">
            {getSummaryText()}
          </p>

          {/* Follow-Up Button */}
          {onSendFollowUp && progressPercent < 100 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onSendFollowUp}
              className="w-full mt-2"
            >
              <Send className="h-3 w-3 mr-2" />
              Send Follow-Up
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Demo Engagement Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Large Heatmap */}
            <div>
              <p className="text-sm font-medium mb-2">Engagement Heatmap</p>
              <div className="flex gap-1 h-10 rounded overflow-hidden">
                {segments.map((segment, index) => (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex-1 ${getIntensityClass(segment.intensity)} transition-colors cursor-pointer hover:opacity-80 flex items-center justify-center`}
                      >
                        <span className="text-xs font-medium text-primary-foreground opacity-70">
                          {segment.percent}%
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{segment.label}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Progress</p>
                <p className="text-lg font-semibold">{progressPercent}%</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Watch Time</p>
                <p className="text-lg font-semibold">{formatDuration(watchDuration)}</p>
              </div>
            </div>

            {/* View History */}
            <div>
              <p className="text-sm font-medium mb-2">View History</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {demoViews.map((view) => (
                  <div key={view.id} className="flex items-center justify-between text-sm bg-muted/30 rounded px-3 py-2">
                    <span className="text-muted-foreground">
                      {format(new Date(view.created_at), 'MMM d, h:mm a')}
                    </span>
                    <span className="font-medium">
                      {view.progress_percent || 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <p className="text-sm text-muted-foreground border-t pt-3">
              {getSummaryText()}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
