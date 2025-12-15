import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAffiliateVideos, VideoType } from '@/hooks/useAffiliateVideos';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Video,
  Loader2,
  Check,
  FileText,
  Clock,
  AlertCircle,
} from 'lucide-react';

const videoTypeLabels: Record<VideoType, string> = {
  recruitment: 'Recruitment',
  product_sales: 'Product Sales',
  testimonial: 'Testimonial',
};

const videoTypeDescriptions: Record<VideoType, string> = {
  recruitment: 'Attract new affiliates to join your team',
  product_sales: 'Promote the AI receptionist product to businesses',
  testimonial: 'Share your success story with the platform',
};

export default function CreateVideo() {
  const navigate = useNavigate();
  const { profile, templates, profileReady, generateVideo } = useAffiliateVideos();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [viewingScript, setViewingScript] = useState<{ name: string; script: string } | null>(null);

  // Redirect if no profile ready
  if (!profileReady) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Button variant="ghost" onClick={() => navigate('/affiliate/videos')} className="mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Videos
        </Button>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-col items-center py-12">
            <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Avatar Profile Required</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              You need to create your AI avatar profile before generating videos.
            </p>
            <Button onClick={() => navigate('/affiliate/videos/create-profile')}>
              Create Avatar Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleViewScript = (template: typeof templates[0]) => {
    setViewingScript({ name: template.name, script: template.script_text });
    setShowScriptModal(true);
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    setIsGenerating(true);
    const result = await generateVideo(selectedTemplate);
    setIsGenerating(false);

    if (result) {
      navigate('/affiliate/videos');
    }
  };

  // Group templates by video type
  const templatesByType = templates.reduce((acc, t) => {
    if (!acc[t.video_type]) acc[t.video_type] = [];
    acc[t.video_type].push(t);
    return acc;
  }, {} as Record<VideoType, typeof templates>);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => navigate('/affiliate/videos')} className="mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Videos
        </Button>
        <h1 className="text-2xl font-bold">Create New Video</h1>
        <p className="text-muted-foreground">Select a script template to generate your personalized video</p>
      </div>

      {/* Template Selection */}
      {Object.entries(templatesByType).map(([type, typeTemplates]) => (
        <div key={type} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{videoTypeLabels[type as VideoType]}</h2>
            <p className="text-sm text-muted-foreground">{videoTypeDescriptions[type as VideoType]}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {typeTemplates.map(template => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all ${
                  selectedTemplate === template.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {selectedTemplate === template.id && (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {template.script_text.substring(0, 150)}...
                  </p>
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewScript(template);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      View Full Script
                    </Button>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      ~2 min
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {templates.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates available</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Video templates are being set up. Please check back later.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Generate Button */}
      {templates.length > 0 && (
        <div className="flex flex-col items-center gap-4 pt-4">
          <div className="p-4 rounded-lg bg-muted text-sm text-center max-w-md">
            <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">
              Video generation typically takes 5-10 minutes. You'll receive a notification when it's ready.
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={!selectedTemplate || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Video...
              </>
            ) : (
              <>
                <Video className="h-4 w-4 mr-2" />
                Generate Video
              </>
            )}
          </Button>
        </div>
      )}

      {/* Script Modal */}
      <Dialog open={showScriptModal} onOpenChange={setShowScriptModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{viewingScript?.name}</DialogTitle>
            <DialogDescription>Full script preview</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="whitespace-pre-wrap text-sm">
              {viewingScript?.script}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
