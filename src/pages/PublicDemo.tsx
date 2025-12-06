/**
 * PublicDemo.tsx - Public demo page for prospects
 * 
 * Uses Firecrawl for mobile screenshots and PagePreview component with chat overlay
 */

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDemos, Demo } from '@/hooks/useDemos';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, MessageCircle, Phone, PhoneOff, PhoneCall, Sparkles, Volume2, Mic, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChat } from '@/utils/RealtimeAudio';
import { ElevenLabsChat } from '@/utils/ElevenLabsChat';
import { supabase } from '@/integrations/supabase/client';
import { CalendarBooking } from '@/components/demos/CalendarBooking';
import { PagePreview } from '@/components/demos/PagePreview';

const PublicDemo = () => {
  const { id } = useParams<{ id: string }>();
  const { getDemoById, incrementViewCount, incrementVoiceInteraction, incrementChatInteraction } = useDemos();
  const { toast } = useToast();
  
  const [demo, setDemo] = useState<Demo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewTracked = useRef(false);
  
  // Screenshot state - for Firecrawl mobile screenshot
  const [mobileScreenshot, setMobileScreenshot] = useState<string | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  
  // Voice state
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const openaiChatRef = useRef<RealtimeChat | null>(null);
  const elevenLabsChatRef = useRef<ElevenLabsChat | null>(null);
  const voiceInteractionTracked = useRef(false);
  const chatInteractionTracked = useRef(false);

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
      
      // Fetch mobile screenshot via Firecrawl if we have a website URL
      if (result.data?.website_url) {
        fetchMobileScreenshot(result.data.website_url);
      }

      // Track view only once per page load
      if (!viewTracked.current && result.data) {
        viewTracked.current = true;
        await incrementViewCount(id);
      }
    };

    loadDemo();
  }, [id]);

  // Fetch mobile screenshot using Firecrawl
  const fetchMobileScreenshot = async (websiteUrl: string) => {
    setScreenshotLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-mobile', {
        body: { url: websiteUrl }
      });

      if (error) {
        console.error('Firecrawl screenshot error:', error);
        return;
      }

      if (data?.success && data?.screenshot) {
        setMobileScreenshot(data.screenshot);
      }
    } catch (err) {
      console.error('Error fetching mobile screenshot:', err);
    } finally {
      setScreenshotLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      openaiChatRef.current?.disconnect();
      elevenLabsChatRef.current?.disconnect();
    };
  }, []);

  // Build businessInfo object from demo data for the voice agents
  const getBusinessInfoFromDemo = (demo: Demo) => ({
    businessName: demo.business_name,
    services: [],
    description: demo.ai_prompt || `AI assistant for ${demo.business_name}`,
    phones: [],
    emails: [],
    url: demo.website_url || '',
    aiPersonaName: demo.ai_persona_name || 'AI Assistant',
  });

  const handleVoiceMessage = (event: any) => {
    console.log('Voice event:', event.type || event);
  };

  const handleSpeakingChange = (speaking: boolean) => {
    setIsSpeaking(speaking);
  };

  const handleTranscript = (text: string, isFinal: boolean) => {
    if (isFinal) {
      setTranscript(text);
    }
  };

  const startOpenAIConversation = async () => {
    if (!demo) return false;

    try {
      const businessInfo = getBusinessInfoFromDemo(demo);
      
      const { data, error } = await supabase.functions.invoke('realtime-session', {
        body: { businessInfo }
      });

      if (error) throw error;

      if (!data?.client_secret?.value) {
        throw new Error('Failed to get session token');
      }

      openaiChatRef.current = new RealtimeChat(
        handleVoiceMessage,
        handleSpeakingChange,
        handleTranscript
      );

      await openaiChatRef.current.init(data.client_secret.value, data.businessInfo || businessInfo);
      return true;
    } catch (error) {
      console.error('Error starting OpenAI conversation:', error);
      throw error;
    }
  };

  const startElevenLabsConversation = async () => {
    if (!demo) return false;

    try {
      const businessInfo = getBusinessInfoFromDemo(demo);
      
      const { data, error } = await supabase.functions.invoke('elevenlabs-session', {
        body: { businessInfo }
      });

      if (error) throw error;

      const signedUrl = data?.signed_url || data?.conversation_id;
      
      if (!signedUrl && !data?.signed_url) {
        throw new Error('ElevenLabs requires an agent ID. The demo may need to be configured with an ElevenLabs agent.');
      }

      elevenLabsChatRef.current = new ElevenLabsChat(
        handleVoiceMessage,
        handleSpeakingChange,
        handleTranscript
      );

      await elevenLabsChatRef.current.init(data.signed_url);
      return true;
    } catch (error) {
      console.error('Error starting ElevenLabs conversation:', error);
      throw error;
    }
  };

  const startVoiceDemo = async () => {
    if (!demo) return;

    setIsVoiceConnecting(true);

    try {
      const provider = demo.voice_provider || 'openai';
      
      if (provider === 'elevenlabs') {
        await startElevenLabsConversation();
      } else {
        await startOpenAIConversation();
      }

      setIsVoiceConnected(true);

      // Track voice interaction only once per session
      if (!voiceInteractionTracked.current && id) {
        voiceInteractionTracked.current = true;
        await incrementVoiceInteraction(id);
      }

      toast({
        title: 'Connected',
        description: `Now talking to ${demo.business_name}'s AI assistant`,
      });
    } catch (error) {
      console.error('Error starting voice demo:', error);
      toast({
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Failed to start voice demo',
        variant: 'destructive',
      });
    } finally {
      setIsVoiceConnecting(false);
    }
  };

  const endVoiceDemo = () => {
    openaiChatRef.current?.disconnect();
    openaiChatRef.current = null;
    elevenLabsChatRef.current?.disconnect();
    elevenLabsChatRef.current = null;
    setIsVoiceConnected(false);
    setIsSpeaking(false);
    setTranscript('');

    toast({
      title: 'Disconnected',
      description: 'Voice demo ended',
    });
  };

  const handleChatInteraction = async () => {
    if (!chatInteractionTracked.current && id) {
      chatInteractionTracked.current = true;
      await incrementChatInteraction(id);
    }
  };

  const voiceProviderLabel = demo?.voice_provider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI';

  // Vapi config check
  const vapiPublicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
  const vapiAssistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID;
  const hasVapiConfig = Boolean(vapiPublicKey && vapiAssistantId);

  const handleVapiCall = () => {
    if (!hasVapiConfig || !id) return;
    const vapiWidgetUrl = `https://vapi.ai/call/${vapiAssistantId}`;
    window.open(vapiWidgetUrl, '_blank');
  };

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
                  <strong>Click the chat bubble</strong> on the phone mockup to start talking to the AI assistant that could work for{' '}
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

            {/* Voice Demo Controls */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Voice Demo
                </CardTitle>
                <CardDescription>
                  Try the voice AI powered by {voiceProviderLabel}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isVoiceConnected ? (
                  <div className="text-center py-4">
                    {/* Avatar display during voice call */}
                    <div className="relative inline-block mb-4">
                      {demo.avatar_url ? (
                        <img 
                          src={demo.avatar_url}
                          alt={demo.ai_persona_name || 'AI Assistant'}
                          className={`w-24 h-24 rounded-full object-cover transition-all ${
                            isSpeaking 
                              ? 'ring-4 ring-primary/50 ring-offset-2 ring-offset-background animate-pulse' 
                              : 'ring-2 ring-green-500/50'
                          }`}
                        />
                      ) : (
                        <div className={`rounded-full p-6 mx-auto w-fit transition-all ${
                          isSpeaking 
                            ? 'bg-primary/20 ring-4 ring-primary/30 animate-pulse' 
                            : 'bg-green-500/20'
                        }`}>
                          {isSpeaking ? (
                            <Volume2 className="h-10 w-10 text-primary animate-pulse" />
                          ) : (
                            <Mic className="h-10 w-10 text-green-500" />
                          )}
                        </div>
                      )}
                      {/* Status indicator overlay */}
                      <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${
                        isSpeaking ? 'bg-primary' : 'bg-green-500'
                      }`}>
                        {isSpeaking ? (
                          <Volume2 className="h-3 w-3 text-primary-foreground" />
                        ) : (
                          <Mic className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                    </div>
                    <p className="font-medium text-lg mb-1">
                      {demo.ai_persona_name || 'AI Assistant'}
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      {isSpeaking ? 'Speaking...' : 'Listening to you...'}
                    </p>
                    {transcript && (
                      <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded max-w-xs mx-auto">
                        {transcript}
                      </p>
                    )}
                    <Button 
                      variant="destructive"
                      className="mt-4"
                      onClick={endVoiceDemo}
                    >
                      <PhoneOff className="mr-2 h-4 w-4" />
                      End Call
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    {/* Show avatar preview when not connected */}
                    {demo.avatar_url && (
                      <div className="mb-4">
                        <img 
                          src={demo.avatar_url}
                          alt={demo.ai_persona_name || 'AI Assistant'}
                          className="w-16 h-16 rounded-full object-cover mx-auto ring-2 ring-border"
                        />
                        <p className="text-sm font-medium mt-2">{demo.ai_persona_name || 'AI Assistant'}</p>
                        <p className="text-xs text-muted-foreground">Ready to help</p>
                      </div>
                    )}
                    <Button 
                      className="w-full"
                      onClick={startVoiceDemo}
                      disabled={isVoiceConnecting}
                    >
                      {isVoiceConnecting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Phone className="mr-2 h-4 w-4" />
                          Start Voice Call
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Vapi Phone Call Option */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleVapiCall}
                  disabled={!hasVapiConfig || isVoiceConnected}
                >
                  <PhoneCall className="mr-2 h-4 w-4" />
                  {hasVapiConfig ? 'Call This AI Assistant' : 'Phone Demo Coming Soon'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Phone Mockup with Firecrawl Screenshot */}
          <div className="space-y-6">
            {screenshotLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
                  <p className="text-sm text-muted-foreground">Loading website preview...</p>
                </div>
              </div>
            ) : mobileScreenshot ? (
              <PagePreview
                screenshot={mobileScreenshot}
                demoId={id!}
                businessName={demo.business_name}
                aiPersonaName={demo.ai_persona_name || undefined}
                onChatInteraction={handleChatInteraction}
              />
            ) : (
              <Card className="overflow-hidden">
                <CardContent className="py-16 text-center">
                  <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">
                    Website preview not available
                  </p>
                  {demo.website_url && (
                    <a
                      href={demo.website_url.startsWith('http') ? demo.website_url : `https://${demo.website_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Visit website
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Book a Call Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Book a Call
                </CardTitle>
                <CardDescription>
                  Ready to learn more? Schedule a call with us.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CalendarBooking demoId={id!} businessName={demo.business_name} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/80 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm">Powered by EverLaunch</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicDemo;
