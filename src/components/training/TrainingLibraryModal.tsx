import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrainingVideoPlayer } from './TrainingVideoPlayer';
import { TrainingAccordion } from './TrainingAccordion';
import { AffiliateTrainingEntry } from '@/hooks/useAffiliateTraining';
import { TRAINING_TYPE_LABELS, TRAINING_TYPE_COLORS } from '@/types/trainingLibrary';

interface TrainingLibraryModalProps {
  training: AffiliateTrainingEntry | null;
  isOpen: boolean;
  onClose: () => void;
  getSignedVideoUrl: (videoPath: string | null) => Promise<string | null>;
}

export function TrainingLibraryModal({
  training,
  isOpen,
  onClose,
  getSignedVideoUrl,
}: TrainingLibraryModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);

  const loadVideoUrl = useCallback(async () => {
    if (!training?.latest_video_path) {
      setSignedUrl(null);
      return;
    }

    setIsLoadingVideo(true);
    try {
      const url = await getSignedVideoUrl(training.latest_video_path);
      setSignedUrl(url);
    } catch (error) {
      console.error('Failed to load video URL:', error);
      setSignedUrl(null);
    } finally {
      setIsLoadingVideo(false);
    }
  }, [training?.latest_video_path, getSignedVideoUrl]);

  // Load video URL when modal opens
  useEffect(() => {
    if (isOpen && training) {
      loadVideoUrl();
    } else {
      setSignedUrl(null);
    }
  }, [isOpen, training?.id, loadVideoUrl]);

  if (!training) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">
                {training.title}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={TRAINING_TYPE_COLORS[training.training_type]}>
                  {TRAINING_TYPE_LABELS[training.training_type]}
                </Badge>
                {training.vertical_key && (
                  <Badge variant="outline" className="capitalize">
                    {training.vertical_key.replace(/-/g, ' ')}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  v{training.script_version}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Video Player */}
            <TrainingVideoPlayer
              signedUrl={signedUrl}
              isLoading={isLoadingVideo}
              onRequestNewUrl={loadVideoUrl}
            />

            {/* Accordion Sections */}
            <div className="pt-4">
              <TrainingAccordion
                whyPriority={training.why_priority}
                painPoints={training.pain_points}
                whyPhoneAiFits={training.why_phone_ai_fits}
                whereToFind={training.where_to_find}
              />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
