import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDemos, Demo } from '@/hooks/useDemos';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, MessageCircle, Phone, Sparkles } from 'lucide-react';

const PublicDemo = () => {
  const { id } = useParams<{ id: string }>();
  const { getDemoById, incrementViewCount } = useDemos();
  const [demo, setDemo] = useState<Demo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewTracked = useRef(false);

  useEffect(() => {
    const loadDemo = async () => {
      if (!id) {
        setError('Demo ID is missing');
        setLoading(false);
        return;
      }

      const result = await getDemoById(id);
      
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setDemo(result.data);
      setLoading(false);

      // Track view only once per page load
      if (!viewTracked.current && result.data) {
        viewTracked.current = true;
        await incrementViewCount(id);
      }
    };

    loadDemo();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your personalized demo...</p>
        </div>
      </div>
    );
  }

  if (error || !demo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Demo Not Found</CardTitle>
            <CardDescription>
              {error || 'This demo link may be invalid or has been removed.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact the person who sent you this link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">EverLaunch</span>
          </div>
          <span className="text-sm text-muted-foreground">AI Demo Experience</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Left Column - Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {demo.business_name}
              </h1>
              {demo.website_url && (
                <a
                  href={demo.website_url.startsWith('http') ? demo.website_url : `https://${demo.website_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  {demo.website_url}
                </a>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Your Personalized AI Demo</CardTitle>
                <CardDescription>
                  This is a custom AI voice and chat demo built specifically for{' '}
                  <strong>{demo.business_name}</strong>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Imagine having an AI assistant that works on your website 24/7, answering customer
                  questions, booking appointments, and capturing leads — even when you're busy or
                  it's after hours.
                </p>
                <p className="text-muted-foreground">
                  Click below to start talking to the AI assistant that could work for{' '}
                  <strong>{demo.business_name}</strong>.
                </p>
              </CardContent>
            </Card>

            {/* Features List */}
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="rounded-full bg-primary/10 p-2">
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">AI Chat Widget</p>
                  <p className="text-xs text-muted-foreground">
                    Engage visitors instantly with intelligent chat
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="rounded-full bg-primary/10 p-2">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">AI Voice Agent</p>
                  <p className="text-xs text-muted-foreground">
                    Answer calls and handle inquiries 24/7
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Demo Placeholder */}
          <div className="space-y-6">
            {/* Phone Mockup Area */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-muted to-muted/50 p-8 text-center">
                <div className="mx-auto w-64 h-[400px] bg-background rounded-3xl border-4 border-foreground/20 shadow-xl flex flex-col overflow-hidden">
                  {/* Phone Notch */}
                  <div className="bg-foreground/20 h-6 flex items-center justify-center">
                    <div className="w-20 h-3 bg-foreground/30 rounded-full"></div>
                  </div>
                  
                  {/* Phone Screen Content */}
                  <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
                    <Sparkles className="h-12 w-12 text-primary mb-4" />
                    <h3 className="font-semibold text-sm mb-2">
                      {demo.chat_title || 'Chat with us'}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Interactive AI demo coming up next
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      (Phase 3H)
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="grid gap-3">
              <Button size="lg" className="w-full" disabled>
                <MessageCircle className="mr-2 h-5 w-5" />
                Start Chat Demo
              </Button>
              <Button size="lg" variant="outline" className="w-full" disabled>
                <Phone className="mr-2 h-5 w-5" />
                Try Voice Demo
              </Button>
            </div>

            {/* Info Note */}
            <p className="text-xs text-center text-muted-foreground">
              Powered by {demo.voice_provider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI'} •{' '}
              {demo.ai_persona_name || 'AI Assistant'}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by <span className="font-semibold text-foreground">EverLaunch</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicDemo;
