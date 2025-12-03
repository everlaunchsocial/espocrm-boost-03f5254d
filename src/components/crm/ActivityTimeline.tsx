import { Activity } from '@/types/crm';
import { Phone, Mail, Calendar, FileText, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ActivityTimelineProps {
  activities: Activity[];
  limit?: number;
}

const activityIcons = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  task: CheckSquare,
};

const activityColors = {
  call: 'bg-success/10 text-success',
  email: 'bg-primary/10 text-primary',
  meeting: 'bg-chart-4/10 text-chart-4',
  note: 'bg-warning/10 text-warning',
  task: 'bg-chart-5/10 text-chart-5',
};

export function ActivityTimeline({ activities, limit }: ActivityTimelineProps) {
  const displayActivities = limit ? activities.slice(0, limit) : activities;

  return (
    <div className="space-y-4">
      {displayActivities.map((activity, index) => {
        const Icon = activityIcons[activity.type];
        return (
          <div key={activity.id} className="flex gap-4 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
            <div className={cn('h-10 w-10 rounded-full flex items-center justify-center shrink-0', activityColors[activity.type])}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-card-foreground truncate">{activity.subject}</p>
                <time className="text-xs text-muted-foreground shrink-0">
                  {format(new Date(activity.createdAt), 'MMM d, h:mm a')}
                </time>
              </div>
              {activity.description && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{activity.description}</p>
              )}
              {activity.relatedTo && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Related to: <span className="font-medium">{activity.relatedTo.name}</span>
                </p>
              )}
            </div>
          </div>
        );
      })}
      {displayActivities.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No activities yet</p>
      )}
    </div>
  );
}
