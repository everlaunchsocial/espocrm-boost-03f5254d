import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  Flame, CheckSquare, TrendingUp, Users, 
  ChevronRight, Bell, RefreshCw 
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLeads, useTasks, useActivities } from '@/hooks/useCRMData';
import { usePullToRefresh, useDeviceType } from '@/hooks/useMobileOptimization';
import { MentionsNotificationBell } from '@/components/crm/MentionsNotificationBell';
import { SyncStatusBadge } from './OfflineIndicator';
import { cn } from '@/lib/utils';

export function MobileDashboard() {
  const navigate = useNavigate();
  const { isMobile } = useDeviceType();
  const { data: leads = [] } = useLeads();
  const { data: tasks = [] } = useTasks();
  const { data: activities = [] } = useActivities();

  const [lastRefresh, setLastRefresh] = useState(new Date());

  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastRefresh(new Date());
  };

  const { isRefreshing, pullDistance, threshold } = usePullToRefresh(handleRefresh);

  // Calculate dashboard stats
  const hotLeads = leads.filter(l => (l.googleRating || 0) >= 4 || l.priority).slice(0, 3);
  const dueTasks = tasks.filter(t => t.status !== 'completed').slice(0, 5);
  const recentActivities = activities.slice(0, 5);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (!isMobile) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 flex justify-center items-center z-50 transition-transform"
          style={{ transform: `translateY(${Math.min(pullDistance, threshold)}px)` }}
        >
          <RefreshCw 
            className={cn(
              "h-6 w-6 text-primary transition-transform",
              pullDistance >= threshold && "animate-spin"
            )}
            style={{ 
              transform: `rotate(${(pullDistance / threshold) * 180}deg)`,
              opacity: pullDistance / threshold,
            }}
          />
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{getGreeting()} 👋</h1>
            <p className="text-xs text-muted-foreground">
              Last updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SyncStatusBadge />
            <MentionsNotificationBell />
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Today's Summary */}
          <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5">
            <h2 className="font-semibold text-sm mb-3">Today's Summary</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {dueTasks.length}
                </div>
                <div className="text-[10px] text-muted-foreground">Tasks due</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {hotLeads.length}
                </div>
                <div className="text-[10px] text-muted-foreground">Hot leads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {leads.filter(l => l.status === 'contacted').length}
                </div>
                <div className="text-[10px] text-muted-foreground">Follow-ups</div>
              </div>
            </div>
          </Card>

          {/* Priority Leads */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between p-4 pb-2">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <h2 className="font-semibold text-sm">Priority Leads</h2>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/leads')}>
                View All
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
            <div className="divide-y divide-border">
              {hotLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No hot leads at the moment
                </p>
              ) : (
                hotLeads.map((lead) => (
                  <button
                    key={lead.id}
                    className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/leads/${lead.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {lead.firstName} {lead.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{lead.company}</p>
                      </div>
                      <Badge variant="destructive" className="text-[10px]">
                        {lead.priority ? 'Priority' : 'Hot'}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>

          {/* Tasks Due Today */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between p-4 pb-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm">Tasks Due Today</h2>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/tasks')}>
                View All
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
            <div className="divide-y divide-border">
              {dueTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No tasks due today
                </p>
              ) : (
                dueTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 flex items-center gap-3"
                  >
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      className="h-5 w-5 rounded border-input"
                      readOnly
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{task.name}</p>
                      {task.dueDate && (
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between p-4 pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <h2 className="font-semibold text-sm">Recent Activity</h2>
              </div>
            </div>
            <div className="divide-y divide-border">
              {recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No recent activity
                </p>
              ) : (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="p-4">
                    <p className="text-sm">{activity.subject}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
