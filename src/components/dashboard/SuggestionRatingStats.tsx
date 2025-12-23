import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, Filter } from 'lucide-react';
import { useFollowUpSuggestions } from '@/hooks/useFollowUpSuggestions';
import { useFollowUpFeedback } from '@/hooks/useFollowUpFeedback';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

interface SuggestionRatingStatsProps {
  onViewUnrated?: () => void;
}

export function SuggestionRatingStats({ onViewUnrated }: SuggestionRatingStatsProps) {
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');
  const { data: suggestions = [] } = useFollowUpSuggestions();
  const { hasFeedback, feedbackEntries } = useFollowUpFeedback();

  // Calculate stats for suggestions shown (last 7 days are already filtered in useFollowUpSuggestions)
  // useMemo must be called unconditionally to avoid hooks-order errors
  const stats = useMemo(() => {
    if (!phase2Enabled) {
      return { total: 0, rated: 0, unrated: 0, percentRated: 0, helpfulCount: 0, notHelpfulCount: 0 };
    }
    
    const total = suggestions.length;
    const rated = suggestions.filter(s => hasFeedback(s.id)).length;
    const unrated = total - rated;
    const percentRated = total > 0 ? Math.round((rated / total) * 100) : 0;

    // Get feedback from this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyFeedback = feedbackEntries.filter(
      f => new Date(f.created_at) >= weekAgo
    );
    const helpfulCount = weeklyFeedback.filter(f => f.feedback === 'helpful').length;
    const notHelpfulCount = weeklyFeedback.filter(f => f.feedback === 'not_helpful').length;

    return {
      total,
      rated,
      unrated,
      percentRated,
      helpfulCount,
      notHelpfulCount,
    };
  }, [phase2Enabled, suggestions, hasFeedback, feedbackEntries]);

  // Feature flag check (must be after hooks to avoid hooks-order errors)
  if (!phase2Enabled) return null;

  // Don't show if no suggestions
  if (stats.total === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Suggestion Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            You've reviewed <span className="font-medium text-foreground">{stats.rated}</span> of{' '}
            <span className="font-medium text-foreground">{stats.total}</span> suggestions this week
          </span>
        </div>

        <div className="space-y-1.5">
          <Progress value={stats.percentRated} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{stats.percentRated}% rated</span>
            <span>{stats.unrated} remaining</span>
          </div>
        </div>

        {stats.rated > 0 && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              👍 {stats.helpfulCount} helpful
            </span>
            <span className="flex items-center gap-1">
              👎 {stats.notHelpfulCount} not helpful
            </span>
          </div>
        )}

        {stats.unrated > 0 && onViewUnrated && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2 gap-1.5"
            onClick={onViewUnrated}
          >
            <Filter className="h-3.5 w-3.5" />
            View {stats.unrated} Unrated Suggestion{stats.unrated !== 1 ? 's' : ''}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
