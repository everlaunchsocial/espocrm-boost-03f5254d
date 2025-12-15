import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAffiliateVideos, VideoStatus, VideoType } from '@/hooks/useAffiliateVideos';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Video,
  Plus,
  Copy,
  ExternalLink,
  Eye,
  MousePointer,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const statusConfig: Record<VideoStatus, { label: string; color: string; icon: React.ComponentType<any> }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: Clock },
  generating: { label: 'Generating', color: 'bg-amber-500/20 text-amber-400', icon: Loader2 },
  ready: { label: 'Ready', color: 'bg-green-500/20 text-green-400', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'bg-destructive/20 text-destructive', icon: AlertCircle },
};

const videoTypeLabels: Record<VideoType, string> = {
  recruitment: 'Recruitment',
  attorney: 'Attorney/Legal',
  dentist: 'Dental Practice',
  salon: 'Salon/Spa',
  plumber: 'Home Services',
  product_sales: 'Product Sales',
  testimonial: 'Testimonial',
};

export default function AffiliateVideos() {
  const navigate = useNavigate();
  const { profile, videos, templates, isLoading, profileReady, getVideoAnalytics, generateVideo } = useAffiliateVideos();
  const [generating, setGenerating] = useState<string | null>(null);

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/v/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const handleGenerateVideo = async (templateId: string) => {
    setGenerating(templateId);
    await generateVideo(templateId);
    setGenerating(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Videos</h1>
          <p className="text-muted-foreground">Create personalized AI avatar videos</p>
        </div>
        {profileReady && (
          <Button onClick={() => navigate('/affiliate/videos/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Video
          </Button>
        )}
      </div>

      {/* Avatar Profile Status */}
      {!profile ? (
        <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Create Your AI Avatar</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Upload 5 photos and record your voice to create a personalized AI avatar that can star in your marketing videos.
            </p>
            <Button onClick={() => navigate('/affiliate/videos/create-profile')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Avatar Profile
            </Button>
          </CardContent>
        </Card>
      ) : profile.status !== 'ready' ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-4 py-6">
            {profile.status === 'training' ? (
              <>
                <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
                <div>
                  <h3 className="font-semibold">Avatar Processing</h3>
                  <p className="text-sm text-muted-foreground">
                    Your avatar is being created. This may take 10-30 minutes.
                  </p>
                </div>
              </>
            ) : profile.status === 'uploading' || profile.status === 'draft' ? (
              <>
                <Clock className="h-8 w-8 text-amber-500" />
                <div>
                  <h3 className="font-semibold">Avatar Pending</h3>
                  <p className="text-sm text-muted-foreground">
                    Your avatar profile is queued for processing.
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-8 w-8 text-destructive" />
                <div className="flex-1">
                  <h3 className="font-semibold">Avatar Creation Failed</h3>
                  <p className="text-sm text-muted-foreground">
                    {profile.error_message || 'An error occurred. Please try again.'}
                  </p>
                </div>
                <Button variant="outline" onClick={() => navigate('/affiliate/videos/create-profile')}>
                  Try Again
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="flex items-center gap-4 py-6">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div className="flex-1">
              <h3 className="font-semibold">Avatar Ready</h3>
              <p className="text-sm text-muted-foreground">
                Your AI avatar is ready to create videos!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Create Section */}
      {profileReady && templates.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Quick Create</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map(template => (
              <Card key={template.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{videoTypeLabels[template.video_type]}</Badge>
                  </div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {template.script_text.substring(0, 100)}...
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => handleGenerateVideo(template.id)}
                    disabled={generating === template.id}
                  >
                    {generating === template.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4 mr-2" />
                        Generate Video
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Videos List */}
      {videos.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your Videos</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {videos.map(video => {
              const status = statusConfig[video.status];
              const analytics = getVideoAnalytics(video.id);
              const StatusIcon = status.icon;

              return (
                <Card key={video.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge className={status.color}>
                        <StatusIcon className={`h-3 w-3 mr-1 ${video.status === 'generating' ? 'animate-spin' : ''}`} />
                        {status.label}
                      </Badge>
                      <Badge variant="outline">{videoTypeLabels[video.video_type]}</Badge>
                    </div>
                    <CardTitle className="text-base">{video.video_name}</CardTitle>
                    <CardDescription>
                      Created {new Date(video.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {video.status === 'ready' && video.heygen_video_url && (
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                        <video
                          src={video.heygen_video_url}
                          className="w-full h-full object-cover"
                          controls
                        />
                      </div>
                    )}

                    {video.status === 'ready' && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {analytics.views} views
                        </div>
                        <div className="flex items-center gap-1">
                          <MousePointer className="h-4 w-4" />
                          {analytics.cta_clicks} clicks
                        </div>
                      </div>
                    )}

                    {video.status === 'failed' && (
                      <p className="text-sm text-destructive">
                        {video.error_message || 'Generation failed'}
                      </p>
                    )}

                    {video.landing_page_slug && video.status === 'ready' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleCopyLink(video.landing_page_slug!)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/v/${video.landing_page_slug}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {videos.length === 0 && profileReady && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Create your first AI video using one of the templates above.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
