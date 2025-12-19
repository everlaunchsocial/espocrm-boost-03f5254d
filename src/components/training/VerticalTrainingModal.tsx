import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VerticalTrainingRow } from '@/types/verticalTraining';
import { TrainingVideoPlayer } from './TrainingVideoPlayer';
import { TrainingAccordion } from './TrainingAccordion';

interface VerticalTrainingModalProps {
  vertical: VerticalTrainingRow | null;
  isOpen: boolean;
  onClose: () => void;
  getSignedVideoUrl: (videoPath: string | null) => Promise<string | null>;
}

export function VerticalTrainingModal({
  vertical,
  isOpen,
  onClose,
  getSignedVideoUrl,
}: VerticalTrainingModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);

  const loadVideoUrl = useCallback(async () => {
    if (!vertical?.video_path) {
      setSignedUrl(null);
      return;
    }

    setIsLoadingVideo(true);
    try {
      const url = await getSignedVideoUrl(vertical.video_path);
      setSignedUrl(url);
    } catch (error) {
      console.error('Failed to load video URL:', error);
      setSignedUrl(null);
    } finally {
      setIsLoadingVideo(false);
    }
  }, [vertical?.video_path, getSignedVideoUrl]);

  // Load video URL when modal opens with a new vertical
  useEffect(() => {
    if (isOpen && vertical) {
      loadVideoUrl();
    } else {
      setSignedUrl(null);
    }
  }, [isOpen, vertical?.id, loadVideoUrl]);

  if (!vertical) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">
                Vertical Training: {vertical.industry_name}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Learn how to sell Phone AI to {vertical.industry_name.toLowerCase()} businesses
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              #{vertical.rank}
            </Badge>
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
                whyPriority={vertical.why_priority}
                painPoints={vertical.pain_points}
                whyPhoneAiFits={vertical.why_phone_ai_fits}
                whereToFind={vertical.where_to_find}
              />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
