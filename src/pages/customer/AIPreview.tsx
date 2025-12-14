import { useState, useRef, useEffect, useCallback } from 'react';
import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  Bot,
  User,
  Sparkles,
  ExternalLink,
  Phone,
  Copy,
  CheckCircle,
  Lightbulb,
  Mic
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import Vapi from '@vapi-ai/web';
import { VoiceEmployeeCard } from '@/components/demos/VoiceEmployeeCard';
import { MobileDeviceMockup } from '@/components/demos/MobileDeviceMockup';
import { ChatButtonOverlay } from '@/components/demos/ChatButtonOverlay';
import { PreviewUsageWarning } from '@/components/customer/PreviewUsageWarning';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_VOICE_DURATION_SECONDS = 20;

export default function AIPreview() {
  const { 
    isLoading, 
    customerProfile, 
    voiceSettings,
    chatSettings
  } = useCustomerOnboarding();

  // Phone number state - query directly from customer_phone_numbers
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Screenshot state
  const [mobileScreenshot, setMobileScreenshot] = useState<string | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState(false);

  // Voice Web state
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch phone number and assistant ID
  useEffect(() => {
    async function fetchPhoneData() {
      if (!customerProfile?.id) return;
      
      setPhoneLoading(true);
      try {
        const { data, error } = await supabase
          .from('customer_phone_numbers')
          .select('phone_number, vapi_assistant_id')
          .eq('customer_id', customerProfile.id)
          .maybeSingle();
        
        if (data) {
          // Check if it's a real phone number (not SIP-only)
          if (data.phone_number && !data.phone_number.includes('SIP-only')) {
            setPhoneNumber(data.phone_number);
          }
          if (data.vapi_assistant_id) {
            setAssistantId(data.vapi_assistant_id);
          }
        }
      } catch (err) {
        console.error('Error fetching phone data:', err);
      } finally {
        setPhoneLoading(false);
      }
    }
    fetchPhoneData();
  }, [customerProfile?.id]);

  // Fetch mobile screenshot
  useEffect(() => {
    async function fetchScreenshot() {
      if (!customerProfile?.website_url) return;
      
      setScreenshotLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('scrape-mobile', {
          body: { url: customerProfile.website_url }
        });

        if (!error && data?.success && data?.screenshot) {
          setMobileScreenshot(data.screenshot);
        }
      } catch (err) {
        console.error('Error fetching mobile screenshot:', err);
      } finally {
        setScreenshotLoading(false);
      }
    }
    fetchScreenshot();
  }, [customerProfile?.website_url]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Add initial greeting when chat opens
  useEffect(() => {
    if (isChatOpen && messages.length === 0) {
      const greeting = chatSettings?.greeting_text || 
        `Hi! Welcome to ${customerProfile?.business_name || 'our business'}. How can I help you today?`;
      setMessages([{ role: 'assistant', content: greeting }]);
    }
  }, [isChatOpen, chatSettings?.greeting_text, customerProfile?.business_name, messages.length]);

  // Cleanup Vapi and timer on unmount
  useEffect(() => {
    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  // Auto-end call at 20 seconds
  useEffect(() => {
    if (isVoiceConnected && callDuration >= MAX_VOICE_DURATION_SECONDS) {
      toast.info(`Preview limited to ${MAX_VOICE_DURATION_SECONDS} seconds`);
      endVoiceCall();
    }
  }, [callDuration, isVoiceConnected]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsSending(true);

    try {
      const systemPrompt = `You are an AI assistant for ${customerProfile?.business_name || 'a business'}.
${chatSettings?.tone ? `Speak in a ${chatSettings.tone} tone.` : ''}
${chatSettings?.instructions ? `Additional instructions: ${chatSettings.instructions}` : ''}
Keep responses helpful, concise, and professional.`;

      const { data, error } = await supabase.functions.invoke('customer-preview-chat', {
        body: {
          messages: [...messages, { role: 'user', content: userMessage }],
          systemPrompt,
          businessName: customerProfile?.business_name,
          customerId: customerProfile?.id,
        }
      });

      if (error) throw error;

      const assistantMessage = data?.reply || data?.message || "I'm sorry, I couldn't process that request.";
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
      setPreviewCount(prev => prev + 1);
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response. Please try again.');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm sorry, I encountered an error. Please try again." 
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyPhoneNumber = () => {
    if (phoneNumber) {
      navigator.clipboard.writeText(phoneNumber);
      setCopiedPhone(true);
      toast.success('Phone number copied!');
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  // Voice Web functions
  const startVoiceCall = async () => {
    if (!assistantId) {
      toast.error('No voice assistant available. Please provision a phone number first.');
      return;
    }

    setIsVoiceConnecting(true);
    setCallDuration(0);

    try {
      const { data, error } = await supabase.functions.invoke('vapi-web-session', {
        body: { assistantId }
      });

      if (error || !data?.publicKey) {
        throw new Error('Failed to get voice session');
      }

      const vapi = new Vapi(data.publicKey);
      vapiRef.current = vapi;

      vapi.on('call-start', () => {
        setIsVoiceConnected(true);
        setIsVoiceConnecting(false);
        
        durationIntervalRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
        
        toast.success('Voice call connected');
      });

      vapi.on('call-end', () => {
        setIsVoiceConnected(false);
        setIsVoiceConnecting(false);
        setIsSpeaking(false);
        
        // Get the current duration before clearing
        const finalDuration = durationIntervalRef.current ? callDuration : 0;
        
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
        
        // Log voice preview usage to service_usage
        if (customerProfile?.id && finalDuration > 0) {
          const estimatedCost = (finalDuration / 60) * 0.10; // ~$0.10/min Vapi rate
          supabase.functions.invoke('log-web-chat-usage', {
            body: {
              customerId: customerProfile.id,
              usageType: 'customer_voice_preview',
              callType: 'preview',
              durationSeconds: finalDuration,
              costUsd: estimatedCost,
              provider: 'vapi',
              model: 'gpt-4o-mini'
            }
          }).then(() => {
            console.log('Voice preview usage logged:', finalDuration, 'seconds');
          }).catch(err => {
            console.error('Failed to log voice preview usage:', err);
          });
        }
      });

      vapi.on('speech-start', () => {
        setIsSpeaking(true);
      });

      vapi.on('speech-end', () => {
        setIsSpeaking(false);
      });

      vapi.on('error', (error: any) => {
        console.error('Vapi error:', error);
        toast.error('Voice call error');
        setIsVoiceConnected(false);
        setIsVoiceConnecting(false);
        setIsSpeaking(false);
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
      });

      await vapi.start(assistantId);

    } catch (error) {
      console.error('Failed to start voice call:', error);
      toast.error('Failed to start voice call');
      setIsVoiceConnecting(false);
    }
  };

  const endVoiceCall = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.stop();
      vapiRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    setIsVoiceConnected(false);
    setIsVoiceConnecting(false);
    setIsSpeaking(false);
    setCallDuration(0);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Skeleton className="h-[600px] lg:col-span-2" />
            <Skeleton className="h-[600px] lg:col-span-3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Hero Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/80"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-white">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Sparkles className="h-6 w-6" />
              </div>
              <span className="font-bold text-xl">EverLaunch AI</span>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur-sm">
              AI Preview
            </Badge>
          </div>

          <div className="text-center text-white space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              Welcome to Your Preview Page
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              Test your AI assistant before going live for <span className="font-semibold">{customerProfile?.business_name || 'your business'}</span>
            </p>
            {customerProfile?.website_url && (
              <a
                href={customerProfile.website_url.startsWith('http') ? customerProfile.website_url : `https://${customerProfile.website_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm"
              >
                <ExternalLink className="h-4 w-4" />
                {customerProfile.website_url}
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12 -mt-4">
        <div className="grid lg:grid-cols-5 gap-8">
          
          {/* LEFT COLUMN - Three Ways to Test + Voice Card + Tips */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Three Ways to Test Card */}
            <Card className="shadow-xl border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/20 rounded">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-semibold text-primary">Three Ways to Test</span>
                </div>
              </div>
              
              <CardContent className="p-6 space-y-5">
                {/* Option 1: AI Chat */}
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      AI Chat
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click the chat bubble on the phone preview to test your web chat
                    </p>
                  </div>
                </div>

                {/* Option 2: AI Voice Web */}
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground flex items-center gap-2">
                      <Mic className="h-4 w-4 text-primary" />
                      AI Voice Web
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Use the voice card below to talk directly with your AI in the browser
                    </p>
                  </div>
                </div>

                {/* Option 3: Phone Call */}
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      Phone Call
                    </p>
                    {phoneLoading ? (
                      <p className="text-sm text-muted-foreground mt-1">Loading phone number...</p>
                    ) : phoneNumber ? (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-semibold text-foreground">{phoneNumber}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={copyPhoneNumber}
                            className="h-8 px-2"
                          >
                            {copiedPhone ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Call this number to test your AI over the phone</p>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">No phone number provisioned yet</p>
                        <Button variant="link" size="sm" className="h-auto p-0 text-primary" asChild>
                          <a href="/customer/settings/deploy">Get a phone number →</a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Voice Employee Card */}
            <div className="hidden lg:block">
              <VoiceEmployeeCard
                aiPersonaName={customerProfile?.business_name ? `${customerProfile.business_name} AI` : 'AI Assistant'}
                isConnected={isVoiceConnected}
                isConnecting={isVoiceConnecting}
                isSpeaking={isSpeaking}
                onStartCall={startVoiceCall}
                onEndCall={endVoiceCall}
                callDuration={callDuration}
              />
            </div>

            {/* Testing Tips Card */}
            <Card className="shadow-lg border-0">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/20 rounded">
                    <Lightbulb className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-semibold text-primary">Testing Tips</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <p className="text-muted-foreground">Try asking about your services</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <p className="text-muted-foreground">Test if it knows your business hours</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <p className="text-muted-foreground">See how it handles common questions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview Usage Warning */}
            <PreviewUsageWarning
              previewCount={previewCount}
              onContactSupport={() => window.location.href = '/customer/support'}
            />
          </div>

          {/* RIGHT COLUMN - Mobile Preview with Chat */}
          <div className="lg:col-span-3 space-y-6">
            {/* Mobile Phone Preview Section */}
            <Card className="shadow-xl border-0">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Test Your AI Chat
                </CardTitle>
                <CardDescription>
                  Click the chat bubble to start talking to your AI
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
                  ) : (
                    <MobileDeviceMockup>
                      <div className="relative w-full h-full overflow-hidden">
                        {mobileScreenshot ? (
                          <img 
                            src={mobileScreenshot} 
                            alt="Mobile page screenshot" 
                            className="w-full"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-muted/30 to-muted/10 p-8">
                            <Sparkles className="h-12 w-12 text-primary/50 mb-4" />
                            <p className="text-sm text-muted-foreground text-center">
                              {customerProfile?.website_url ? 'Website preview loading...' : 'No website configured'}
                            </p>
                          </div>
                        )}
                        
                        {/* Chat Button Overlay */}
                        {!isChatOpen && (
                          <ChatButtonOverlay onClick={() => setIsChatOpen(true)} />
                        )}
                        
                        {/* Chat Interface */}
                        {isChatOpen && (
                          <div className="absolute inset-0 bg-background flex flex-col">
                            {/* Chat Header */}
                            <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Bot className="h-5 w-5" />
                                <span className="font-medium text-sm">{customerProfile?.business_name || 'AI Assistant'}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsChatOpen(false)}
                                className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8 p-0"
                              >
                                ×
                              </Button>
                            </div>
                            
                            {/* Messages Area */}
                            <div 
                              ref={chatContainerRef}
                              className="flex-1 overflow-y-auto p-4 space-y-3"
                            >
                              {messages.map((message, index) => (
                                <div
                                  key={index}
                                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                                      message.role === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground'
                                    }`}
                                  >
                                    <p className="text-sm">{message.content}</p>
                                  </div>
                                </div>
                              ))}
                              {isSending && (
                                <div className="flex justify-start">
                                  <div className="bg-muted rounded-2xl px-4 py-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Input Area */}
                            <div className="border-t p-3">
                              <div className="flex gap-2">
                                <Input
                                  value={inputValue}
                                  onChange={(e) => setInputValue(e.target.value)}
                                  onKeyDown={handleKeyDown}
                                  placeholder="Type a message..."
                                  className="flex-1 text-sm"
                                  disabled={isSending}
                                />
                                <Button
                                  size="icon"
                                  onClick={handleSendMessage}
                                  disabled={!inputValue.trim() || isSending}
                                  className="shrink-0"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </MobileDeviceMockup>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Voice Card - Visible on mobile/tablet only */}
            <div className="lg:hidden">
              <VoiceEmployeeCard
                aiPersonaName={customerProfile?.business_name ? `${customerProfile.business_name} AI` : 'AI Assistant'}
                isConnected={isVoiceConnected}
                isConnecting={isVoiceConnecting}
                isSpeaking={isSpeaking}
                onStartCall={startVoiceCall}
                onEndCall={endVoiceCall}
                callDuration={callDuration}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm">Powered by EverLaunch AI</span>
        </div>
      </footer>
    </div>
  );
}
