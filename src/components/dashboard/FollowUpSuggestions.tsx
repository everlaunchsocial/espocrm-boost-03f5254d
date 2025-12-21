import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Clock, Eye, UserX, ChevronRight } from 'lucide-react';
import { useFollowUpSuggestions, SuggestionReason } from '@/hooks/useFollowUpSuggestions';
import { Link } from 'react-router-dom';

const reasonConfig: Record<SuggestionReason, { icon: typeof Clock; color: string; badgeVariant: 'destructive' | 'secondary' | 'outline' }> = {
  demo_not_viewed: {
    icon: Eye,
    color: 'text-destructive',
    badgeVariant: 'destructive',
  },
  demo_viewed_no_reply: {
    icon: Clock,
    color: 'text-warning',
    badgeVariant: 'secondary',
  },
  lead_inactive: {
    icon: UserX,
    color: 'text-muted-foreground',
    badgeVariant: 'outline',
  },
};

export function FollowUpSuggestions() {
  const { data: suggestions, isLoading, error } = useFollowUpSuggestions();

  if (error) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            Follow-Up Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Unable to load suggestions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          Follow-Up Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : suggestions && suggestions.length > 0 ? (
          <ul className="space-y-3">
            {suggestions.map((suggestion) => {
              const config = reasonConfig[suggestion.reason];
              const Icon = config.icon;

              return (
                <li key={suggestion.id}>
                  <Link
                    to={`/leads?selected=${suggestion.leadId}`}
                    className="flex items-start gap-3 p-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className={`mt-0.5 ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground truncate">
                          {suggestion.name}
                        </span>
                        {suggestion.company && (
                          <span className="text-sm text-muted-foreground truncate">
                            · {suggestion.company}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant={config.badgeVariant} className="text-xs font-normal">
                          {suggestion.reasonLabel}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {suggestion.suggestionText}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-3">
              <AlertCircle className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm font-medium text-foreground">All caught up!</p>
            <p className="text-sm text-muted-foreground mt-1">
              No urgent follow-ups needed right now.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
