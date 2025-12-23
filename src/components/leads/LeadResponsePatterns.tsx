import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, TrendingUp, Mail, MessageSquare, Phone, Clock, Calendar } from 'lucide-react';
import { formatLearnedPatterns, LearnedPatterns } from '@/lib/scheduleOptimalTime';
import { cn } from '@/lib/utils';

interface LeadResponsePatternsProps {
  patterns: LearnedPatterns | null;
  isLoading?: boolean;
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (!confidence) return null;

  let variant: 'default' | 'secondary' | 'outline' = 'outline';
  let colorClass = 'text-muted-foreground';

  if (confidence >= 80) {
    variant = 'default';
    colorClass = 'bg-success text-success-foreground';
  } else if (confidence >= 60) {
    variant = 'secondary';
    colorClass = 'bg-warning/20 text-warning';
  }

  return (
    <Badge variant={variant} className={cn('text-xs', colorClass)}>
      {confidence}% confident
    </Badge>
  );
}

function getChannelIcon(channel: string | null) {
  switch (channel) {
    case 'email':
      return <Mail className="h-4 w-4" />;
    case 'sms':
      return <MessageSquare className="h-4 w-4" />;
    case 'phone':
      return <Phone className="h-4 w-4" />;
    default:
      return null;
  }
}

function DayChart({ bestDays }: { bestDays: string[] | null }) {
  if (!bestDays?.length) return null;

  return (
    <div className="flex gap-1 items-end h-8">
      {DAY_SHORT.map((day, index) => {
        const fullDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index];
        const isBest = bestDays.includes(fullDay);
        const isTop = bestDays[0] === fullDay;

        return (
          <div
            key={day}
            className="flex flex-col items-center gap-0.5"
            title={`${fullDay}: ${isBest ? 'High response' : 'Normal'}`}
          >
            <div
              className={cn(
                'w-4 rounded-sm transition-all',
                isTop ? 'bg-success h-8' : isBest ? 'bg-success/60 h-6' : 'bg-muted h-3'
              )}
            />
            <span className={cn(
              'text-[10px]',
              isBest ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}>
              {day}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function LeadResponsePatterns({ patterns, isLoading }: LeadResponsePatternsProps) {
  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Response Patterns
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  const hasData = patterns && patterns.learning_confidence && patterns.learning_confidence >= 50;

  if (!hasData) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-muted-foreground" />
            Response Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <TrendingUp className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Not enough data yet
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Patterns emerge after 5+ interactions
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const patternSummary = formatLearnedPatterns(patterns);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Response Patterns
          </CardTitle>
          <ConfidenceBadge confidence={patterns.learning_confidence} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main insight */}
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-sm font-medium text-foreground">
            {patternSummary}
          </p>
        </div>

        {/* Day chart */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Response by day</p>
          <DayChart bestDays={patterns.learned_best_days} />
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Best times */}
          {patterns.learned_best_times?.length ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Best time
              </div>
              <p className="text-sm font-medium">
                {patterns.learned_best_times[0]}
              </p>
            </div>
          ) : null}

          {/* Optimal gap */}
          {patterns.learned_optimal_gap_hours ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Follow-up gap
              </div>
              <p className="text-sm font-medium">
                {patterns.learned_optimal_gap_hours < 24 
                  ? `${patterns.learned_optimal_gap_hours}h`
                  : `${Math.round(patterns.learned_optimal_gap_hours / 24)}d`
                }
              </p>
            </div>
          ) : null}

          {/* Channel preference */}
          {patterns.learned_channel_preference && patterns.learned_channel_preference !== 'mixed' ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {getChannelIcon(patterns.learned_channel_preference)}
                Preferred channel
              </div>
              <p className="text-sm font-medium capitalize">
                {patterns.learned_channel_preference}
              </p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
