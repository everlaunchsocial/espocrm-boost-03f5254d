import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Mail, Phone, RefreshCw, ChevronDown, ChevronUp, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

interface RecentAction {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  relatedToName: string | null;
  relatedToId: string | null;
  createdAt: string;
}

const actionTypeConfig: Record<string, { label: string; icon: typeof Mail }> = {
  'Demo resent': { label: 'Demo resent', icon: RefreshCw },
  'Follow-up email sent': { label: 'Follow-up sent', icon: Mail },
  'Schedule call': { label: 'Call scheduled', icon: Phone },
};

function getActionConfig(subject: string) {
  if (subject.toLowerCase().includes('demo resent')) {
    return { label: 'Demo resent', icon: RefreshCw, channel: 'email' as const };
  }
  if (subject.toLowerCase().includes('follow-up')) {
    return { label: 'Follow-up sent', icon: Mail, channel: 'email' as const };
  }
  if (subject.toLowerCase().includes('schedule call') || subject.toLowerCase().includes('call')) {
    return { label: 'Call scheduled', icon: Phone, channel: 'phone' as const };
  }
  return { label: 'Action taken', icon: Mail, channel: 'email' as const };
}

export function RecentFollowUpActions() {
  const { isEnabled } = useFeatureFlags();
  const [isOpen, setIsOpen] = useState(true);

  // Feature flag check
  if (!isEnabled('aiCrmPhase1')) return null;

  const { data: recentActions, isLoading } = useQuery({
    queryKey: ['recent-followup-actions'],
    queryFn: async () => {
      // Fetch user-initiated follow-up actions from activities
      // Filter by is_system_generated: false and matching action patterns
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('is_system_generated', false)
        .or('subject.ilike.%demo resent%,subject.ilike.%follow-up%,subject.ilike.%schedule call%')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      return (data || []).map((activity): RecentAction => ({
        id: activity.id,
        type: activity.type,
        subject: activity.subject,
        description: activity.description,
        relatedToName: activity.related_to_name,
        relatedToId: activity.related_to_id,
        createdAt: activity.created_at,
      }));
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <History className="h-4 w-4" />
            Recent Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recentActions || recentActions.length === 0) {
    return null; // Don't show the panel if there are no recent actions
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-card border-border">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <CardTitle className="text-sm flex items-center justify-between text-muted-foreground">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Recent Actions
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {recentActions.length}
                </span>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {recentActions.map((action) => {
                const config = getActionConfig(action.subject);
                const Icon = config.icon;

                return (
                  <li
                    key={action.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-1.5 rounded-full ${
                      config.channel === 'phone' 
                        ? 'bg-success/10 text-success' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          {config.label}
                        </span>
                        {action.relatedToName && (
                          <span className="text-sm text-muted-foreground truncate">
                            — {action.relatedToName}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 pt-3 border-t border-border">
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" asChild>
                <Link to="/leads">
                  View All Activity
                </Link>
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
