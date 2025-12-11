import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, CheckCircle2, Clock, ExternalLink, PlayCircle } from 'lucide-react';
import { TrainingModule, TrainingProgress } from '@/hooks/useTraining';

interface TrainingViewerProps {
  module: TrainingModule;
  progress?: TrainingProgress;
  onBack: () => void;
  onProgress: (percent: number, positionSeconds?: number) => void;
  onComplete: () => void;
}

export function TrainingViewer({ module, progress, onBack, onProgress, onComplete }: TrainingViewerProps) {
  const [isCompleted, setIsCompleted] = useState(progress?.status === 'completed');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Resume video from last position
    if (videoRef.current && progress?.last_position_seconds) {
      videoRef.current.currentTime = progress.last_position_seconds;
    }
  }, [progress?.last_position_seconds]);

  const handleVideoProgress = () => {
    if (!videoRef.current) return;
    const { currentTime, duration } = videoRef.current;
    const percent = Math.round((currentTime / duration) * 100);
    onProgress(percent, Math.floor(currentTime));
  };

  const handleVideoEnded = () => {
    setIsCompleted(true);
    onComplete();
  };

  const handleMarkComplete = () => {
    setIsCompleted(true);
    onComplete();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Training
        </Button>
      </div>

      {/* Module Info */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{module.title}</h1>
            {module.description && (
              <p className="text-muted-foreground mt-1">{module.description}</p>
            )}
          </div>
          {isCompleted && (
            <Badge className="bg-green-500 text-white">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 mt-3">
          {module.duration_minutes && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {module.duration_minutes} minutes
            </span>
          )}
          {module.is_required && (
            <Badge variant="secondary">Required</Badge>
          )}
        </div>
      </div>

      {/* Content Area */}
      <Card>
        <CardContent className="p-0">
          {module.content_type === 'video' && module.content_url && (
            <div className="aspect-video bg-black rounded-t-lg overflow-hidden">
              {module.content_url.includes('youtube.com') || module.content_url.includes('youtu.be') ? (
                <iframe
                  src={module.content_url.replace('watch?v=', 'embed/')}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              ) : module.content_url.includes('vimeo.com') ? (
                <iframe
                  src={module.content_url.replace('vimeo.com', 'player.vimeo.com/video')}
                  className="w-full h-full"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={videoRef}
                  src={module.content_url}
                  controls
                  className="w-full h-full"
                  onTimeUpdate={handleVideoProgress}
                  onEnded={handleVideoEnded}
                />
              )}
            </div>
          )}

          {module.content_type === 'article' && module.content_body && (
            <div className="p-6 prose prose-sm max-w-none dark:prose-invert">
              <div dangerouslySetInnerHTML={{ __html: module.content_body }} />
            </div>
          )}

          {module.content_type === 'pdf' && module.content_url && (
            <div className="p-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <ExternalLink className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-medium mb-2">PDF Document</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Click below to view the PDF in a new tab
                </p>
                <Button asChild>
                  <a href={module.content_url} target="_blank" rel="noopener noreferrer">
                    Open PDF
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </div>
            </div>
          )}

          {/* Placeholder for no content */}
          {!module.content_url && !module.content_body && (
            <div className="p-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <PlayCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="font-medium mb-2">Content Coming Soon</h3>
                <p className="text-sm text-muted-foreground">
                  This module's content is being prepared.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress & Complete */}
      {progress && !isCompleted && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Your Progress</span>
                  <span className="text-sm text-muted-foreground">{progress.progress_percent}%</span>
                </div>
                <Progress value={progress.progress_percent} className="h-2" />
              </div>
              <Button onClick={handleMarkComplete}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark Complete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!progress && !isCompleted && (
        <div className="flex justify-end">
          <Button onClick={handleMarkComplete}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark as Complete
          </Button>
        </div>
      )}
    </div>
  );
}
