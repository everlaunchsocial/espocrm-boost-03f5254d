import { useState, useEffect, useRef } from 'react';
import { Loader2, VideoOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrainingVideoPlayerProps {
  signedUrl: string | null;
  isLoading: boolean;
  onRequestNewUrl?: () => void;
}

export function TrainingVideoPlayer({ signedUrl, isLoading, onRequestNewUrl }: TrainingVideoPlayerProps) {
  const [hasError, setHasError] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset error state when URL changes
  useEffect(() => {
    setHasError(false);
    setIsExpired(false);
  }, [signedUrl]);

  const handleError = () => {
    // Check if it's likely an expiration issue
    setHasError(true);
    setIsExpired(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading video...</p>
        </div>
      </div>
    );
  }

  // No video available
  if (!signedUrl) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <VideoOff className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">Video coming soon</p>
          <p className="text-sm text-muted-foreground">
            Training video for this industry is currently being produced.
          </p>
        </div>
      </div>
    );
  }

  // Error/Expired state
  if (hasError || isExpired) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <RefreshCw className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">
            {isExpired ? 'Video session expired' : 'Unable to load video'}
          </p>
          <p className="text-sm text-muted-foreground mb-2">
            {isExpired 
              ? 'Your viewing session has expired. Request a new link to continue watching.'
              : 'There was an error loading the video. Please try again.'}
          </p>
          {onRequestNewUrl && (
            <Button variant="outline" onClick={onRequestNewUrl}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Request New Link
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Video player
  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        src={signedUrl}
        controls
        preload="metadata"
        className="w-full h-full"
        onError={handleError}
      >
        Your browser does not support video playback.
      </video>
    </div>
  );
}
