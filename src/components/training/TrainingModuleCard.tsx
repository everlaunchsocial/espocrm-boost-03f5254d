import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PlayCircle, FileText, Video, HelpCircle, CheckCircle2, Clock, Lock } from 'lucide-react';
import { TrainingModule, TrainingProgress } from '@/hooks/useTraining';
import { cn } from '@/lib/utils';

interface TrainingModuleCardProps {
  module: TrainingModule;
  progress?: TrainingProgress;
  onClick: () => void;
}

const contentTypeIcons = {
  video: Video,
  article: FileText,
  pdf: FileText,
  quiz: HelpCircle,
};

const contentTypeLabels = {
  video: 'Video',
  article: 'Article',
  pdf: 'PDF',
  quiz: 'Quiz',
};

export function TrainingModuleCard({ module, progress, onClick }: TrainingModuleCardProps) {
  const Icon = contentTypeIcons[module.content_type] || PlayCircle;
  const isCompleted = progress?.status === 'completed';
  const isInProgress = progress?.status === 'in_progress';
  const progressPercent = progress?.progress_percent || 0;

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
        isCompleted && "border-green-500/50 bg-green-500/5"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Thumbnail or Icon */}
          <div className={cn(
            "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center",
            isCompleted ? "bg-green-500/20" : "bg-primary/10"
          )}>
            {isCompleted ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <Icon className="h-6 w-6 text-primary" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className={cn(
                "font-medium text-sm line-clamp-2",
                isCompleted && "text-muted-foreground"
              )}>
                {module.title}
              </h4>
              {module.is_required && (
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  Required
                </Badge>
              )}
            </div>

            {module.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {module.description}
              </p>
            )}

            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline" className="text-xs">
                <Icon className="h-3 w-3 mr-1" />
                {contentTypeLabels[module.content_type]}
              </Badge>
              
              {module.duration_minutes && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {module.duration_minutes} min
                </span>
              )}
            </div>

            {/* Progress bar for in-progress modules */}
            {isInProgress && progressPercent > 0 && progressPercent < 100 && (
              <div className="mt-2">
                <Progress value={progressPercent} className="h-1" />
                <span className="text-xs text-muted-foreground">{progressPercent}% complete</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
