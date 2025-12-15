import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, MessageSquare, Mic, Play, Loader2 } from 'lucide-react';

interface VideoData {
  id: string;
  video_name: string;
  video_type: string;
  heygen_video_url: string | null;
  affiliate_id: string;
  affiliate_username: string;
}

export default function VideoLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!slug) {
        setError('Invalid link');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('affiliate_videos')
          .select(`
            id,
            video_name,
            video_type,
            heygen_video_url,
            affiliate_id,
            affiliates!inner(username)
          `)
          .eq('landing_page_slug', slug)
          .eq('status', 'ready')
          .eq('is_active', true)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Video not found');
          setIsLoading(false);
          return;
        }

        setVideo({
          id: data.id,
          video_name: data.video_name,
          video_type: data.video_type,
          heygen_video_url: data.heygen_video_url,
          affiliate_id: data.affiliate_id,
          affiliate_username: (data.affiliates as any)?.username || '',
        });
      } catch (err: any) {
        console.error('Error fetching video:', err);
        setError('Failed to load video');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideo();
  }, [slug]);

  // Track view
  useEffect(() => {
    const trackView = async () => {
      if (!video || hasTrackedView) return;

      try {
        await supabase.functions.invoke('track-video-analytics', {
          body: {
            video_id: video.id,
            event_type: 'view',
          },
        });
        setHasTrackedView(true);
      } catch (err) {
        console.error('Failed to track view:', err);
      }
    };

    trackView();
  }, [video, hasTrackedView]);

  const trackCtaClick = async (ctaType: string) => {
    if (!video) return;

    try {
      await supabase.functions.invoke('track-video-analytics', {
        body: {
          video_id: video.id,
          event_type: 'cta_click',
          cta_type: ctaType,
        },
      });
    } catch (err) {
      console.error('Failed to track CTA click:', err);
    }
  };

  const handlePhoneCta = () => {
    trackCtaClick('phone');
    // Navigate to demo request with affiliate attribution
    navigate(`/${video?.affiliate_username}?source=video&type=${video?.video_type}`);
  };

  const handleChatCta = () => {
    trackCtaClick('chat');
    navigate(`/${video?.affiliate_username}?source=video&type=${video?.video_type}&mode=chat`);
  };

  const handleVoiceCta = () => {
    trackCtaClick('voice');
    navigate(`/${video?.affiliate_username}?source=video&type=${video?.video_type}&mode=voice`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-6">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <div className="flex gap-4 justify-center">
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Play className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Video Not Found</h2>
            <p className="text-muted-foreground text-center mb-4">
              {error || 'This video is no longer available.'}
            </p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-16">
        <div className="space-y-8">
          {/* Video Player */}
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl">
            {video.heygen_video_url ? (
              <video
                src={video.heygen_video_url}
                className="w-full h-full object-contain"
                controls
                autoPlay
                muted
                playsInline
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Video Title */}
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{video.video_name}</h1>
            <p className="text-muted-foreground">
              See how AI can transform your business communications
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="gap-2"
              onClick={handlePhoneCta}
            >
              <Phone className="h-5 w-5" />
              Try Phone Demo
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              onClick={handleChatCta}
            >
              <MessageSquare className="h-5 w-5" />
              Try Chat Demo
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              onClick={handleVoiceCta}
            >
              <Mic className="h-5 w-5" />
              Try Voice Demo
            </Button>
          </div>

          {/* Trust Elements */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground pt-8">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              2-minute setup
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              24/7 AI receptionist
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Powered by EverLaunch AI</p>
        </div>
      </footer>
    </div>
  );
}
