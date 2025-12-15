/**
 * PublicDemo.tsx - Public demo page for prospects
 * 
 * Modern redesign with colorful hero, improved calendar layout
 */

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDemos, Demo } from '@/hooks/useDemos';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, MessageCircle, Phone, Sparkles, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChat, ContactInfoRequest } from '@/utils/RealtimeAudio';
import { ElevenLabsChat } from '@/utils/ElevenLabsChat';
import { supabase } from '@/integrations/supabase/client';
import { CalendarBooking } from '@/components/demos/CalendarBooking';
import { PagePreview } from '@/components/demos/PagePreview';
import { VoiceEmployeeCard } from '@/components/demos/VoiceEmployeeCard';
import { ContactInfoModal } from '@/components/demos/ContactInfoModal';
import { VapiPhoneCard } from '@/components/demos/VapiPhoneCard';

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

  // Contact info modal state
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactInfoRequest, setContactInfoRequest] = useState<ContactInfoRequest | null>(null);
  const pendingContactRequest = useRef<ContactInfoRequest | null>(null);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
        
        // Update lead pipeline_status to 'demo_engaged' if applicable
        if (result.data.lead_id) {
          updateLeadPipelineOnEngagement(result.data.lead_id);
        }
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

  const handleContactInfoRequest = (request: ContactInfoRequest) => {
    console.log('Contact info requested, waiting for AI to finish speaking...');
    setContactInfoRequest(request);
    pendingContactRequest.current = request;
  };

  useEffect(() => {
    if (!isSpeaking && pendingContactRequest.current) {
      console.log('AI finished speaking, showing contact modal now');
      setShowContactModal(true);
      pendingContactRequest.current = null;
    }
  }, [isSpeaking]);

  const handleContactInfoSubmit = (email: string, phone: string) => {
    if (contactInfoRequest && openaiChatRef.current) {
      openaiChatRef.current.submitContactInfo(contactInfoRequest.callId, { email, phone });
      console.log('Contact info submitted:', { email, phone });
      
      toast({
        title: 'Info Received',
        description: 'Thanks! Someone will be in touch soon.',
      });
    }
    setShowContactModal(false);
    setContactInfoRequest(null);
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
        handleTranscript,
        handleContactInfoRequest
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

      if (!voiceInteractionTracked.current && id) {
        voiceInteractionTracked.current = true;
        await incrementVoiceInteraction(id);
        
        // Also update lead pipeline status on voice engagement
        if (demo?.lead_id) {
          updateLeadPipelineOnEngagement(demo.lead_id);
        }
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

  // Helper to update lead pipeline status on engagement
  const updateLeadPipelineOnEngagement = async (leadId: string) => {
    try {
      const { data: leadData } = await supabase
        .from('leads')
        .select('pipeline_status')
        .eq('id', leadId)
        .single();

      if (leadData) {
        const currentStatus = leadData.pipeline_status;
        // Only advance if currently in early stages
        if (['new_lead', 'contact_attempted', 'demo_created', 'demo_sent'].includes(currentStatus)) {
          await supabase
            .from('leads')
            .update({ pipeline_status: 'demo_engaged' })
            .eq('id', leadId);
          console.log('Updated lead pipeline_status to demo_engaged');
        }
      }
    } catch (err) {
      console.error('Error updating lead pipeline status:', err);
    }
  };

  const handleChatInteraction = async () => {
    if (!chatInteractionTracked.current && id) {
      chatInteractionTracked.current = true;
      await incrementChatInteraction(id);
      
      // Also update lead pipeline status on chat engagement
      if (demo?.lead_id) {
        updateLeadPipelineOnEngagement(demo.lead_id);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your personalized demo...</p>
        </div>
      </div>
    );
  }

  if (error || !demo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Hero Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/80"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="relative max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-white">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Sparkles className="h-6 w-6" />
              </div>
              <span className="font-bold text-xl">EverLaunch AI</span>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur-sm">
              Personalized Demo
            </Badge>
          </div>

          <div className="text-center text-white space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              Never miss a call or lead again!
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              See how AI can work 24/7 for <span className="font-semibold">{demo.business_name}</span>
            </p>
            {demo.website_url && (
              <a
                href={demo.website_url.startsWith('http') ? demo.website_url : `https://${demo.website_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm"
              >
                <ExternalLink className="h-4 w-4" />
                {demo.website_url}
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12 -mt-4">
        <div className="grid lg:grid-cols-5 gap-8">
          
          {/* Left Column - Demo Info Card (like reference) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-xl border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/20 rounded">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-semibold text-primary">EverLaunch AI</span>
                </div>
              </div>
              
              <CardContent className="p-6 space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Welcome to Your Personal Demo!</h2>
                </div>

                <p className="text-muted-foreground leading-relaxed">
                  Hi there! We've put together a personalized AI demo just for <span className="font-semibold text-foreground">{demo.business_name}</span>.
                </p>

                <div className="space-y-3">
                  <p className="font-medium text-foreground">Here's how to explore:</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</div>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Try the AI Chat</span> — Click the chat bubble on the phone preview to see how AI engages your website visitors
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</div>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Try Voice Chat</span> — Use the voice card to talk directly with the AI assistant
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</div>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Try the AI Phone Assistant</span> — Call the demo hotline and enter your passcode below to hear exactly how it sounds when customers call your business{demo.passcode ? ` (Passcode: ${demo.passcode})` : ''}.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    This AI is trained specifically for your business. It knows your services, can answer questions, and handles inquiries 24/7.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Voice Employee Card - Below info on mobile/tablet, here on desktop */}
            <div className="hidden lg:block">
              <VoiceEmployeeCard
                aiPersonaName={demo.ai_persona_name || 'Jenna'}
                avatarUrl={demo.avatar_url || undefined}
                isConnected={isVoiceConnected}
                isConnecting={isVoiceConnecting}
                isSpeaking={isSpeaking}
                onStartCall={startVoiceDemo}
                onEndCall={endVoiceDemo}
              />
            </div>
          </div>

          {/* Right Column - Phone Preview FIRST, then Calendar */}
          <div className="lg:col-span-3 space-y-6">
            {/* Phone Preview Section - FIRST */}
            <Card className="shadow-xl border-0">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Try the AI Chat Demo
                </CardTitle>
                <CardDescription>
                  Click the chat bubble to start talking to the AI
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
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
                      avatarUrl={demo.avatar_url || undefined}
                      onChatInteraction={handleChatInteraction}
                    />
                  ) : (
                    <div className="w-full py-12 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <Sparkles className="h-8 w-8 text-primary" />
                      </div>
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
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Voice Card - Visible on mobile/tablet only */}
            <div className="lg:hidden">
              <VoiceEmployeeCard
                aiPersonaName={demo.ai_persona_name || 'Jenna'}
                avatarUrl={demo.avatar_url || undefined}
                isConnected={isVoiceConnected}
                isConnecting={isVoiceConnecting}
                isSpeaking={isSpeaking}
                onStartCall={startVoiceDemo}
                onEndCall={endVoiceDemo}
              />
            </div>

            {/* Vapi Phone Call Card */}
            <VapiPhoneCard
              aiPersonaName={demo.ai_persona_name || 'Jenna'}
              avatarUrl={demo.avatar_url || undefined}
              phoneNumber="+1 (508) 779-9437"
              passcode={demo.passcode || undefined}
            />

            {/* Calendar Section - AFTER the demo */}
            <Card className="shadow-xl border-0">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Ready to Get Started?
                    </CardTitle>
                    <CardDescription>
                      Book a time to discuss how AI can work for your business
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left - Booking Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Schedule a One-on-One</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Ready to see how AI can transform your business? Book a personalized call with our team.
                    </p>
                    
                    <div className="space-y-3 pt-2">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-primary/10 shrink-0">
                          <Calendar className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Pick a Day</p>
                          <p className="text-xs text-muted-foreground">Choose a date that works for you</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-primary/10 shrink-0">
                          <Phone className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Select a Time</p>
                          <p className="text-xs text-muted-foreground">We'll call you at your chosen time</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-primary/10 shrink-0">
                          <MessageCircle className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">30-Minute Demo</p>
                          <p className="text-xs text-muted-foreground">See exactly how AI works for your business</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right - Calendar */}
                  <div>
                    <CalendarBooking demoId={id!} businessName={demo.business_name} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/80 backdrop-blur-sm mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="p-1.5 bg-primary/10 rounded">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">Powered by EverLaunch AI</span>
            </div>
            <p className="text-xs text-muted-foreground">
              AI that works while you sleep
            </p>
          </div>
        </div>
      </footer>

      {/* Contact Info Modal */}
      <ContactInfoModal
        isOpen={showContactModal}
        onClose={() => {
          setShowContactModal(false);
          setContactInfoRequest(null);
        }}
        onSubmit={handleContactInfoSubmit}
        prospectName={contactInfoRequest?.prospect_name}
        phoneNumber={contactInfoRequest?.phone_number}
        emailAddress={contactInfoRequest?.email}
        reason={contactInfoRequest?.reason}
      />
    </div>
  );
};

export default PublicDemo;
