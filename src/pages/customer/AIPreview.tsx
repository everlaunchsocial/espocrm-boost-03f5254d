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
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import Vapi from '@vapi-ai/web';
import { VoiceEmployeeCard } from '@/components/demos/VoiceEmployeeCard';
import { MobileDeviceMockup } from '@/components/demos/MobileDeviceMockup';
import { ChatButtonOverlay } from '@/components/demos/ChatButtonOverlay';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_VOICE_DURATION_SECONDS = 20;

export default function AIPreview() {
  const { 
    isLoading, 
    customerProfile, 
    twilioNumber,
    voiceSettings,
    chatSettings
  } = useCustomerOnboarding();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
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

  // Fetch assistant ID for voice calls
  useEffect(() => {
    async function fetchAssistantId() {
      if (!customerProfile?.id) return;
      
      const { data } = await supabase
        .from('customer_phone_numbers')
        .select('vapi_assistant_id')
        .eq('customer_id', customerProfile.id)
        .maybeSingle();
      
      if (data?.vapi_assistant_id) {
        setAssistantId(data.vapi_assistant_id);
      }
    }
    fetchAssistantId();
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
        }
      });

      if (error) throw error;

      const assistantMessage = data?.reply || data?.message || "I'm sorry, I couldn't process that request.";
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
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
    if (twilioNumber) {
      navigator.clipboard.writeText(twilioNumber);
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
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12 -mt-4">
        <div className="grid lg:grid-cols-5 gap-8">
          
          {/* Left Column - Voice Card & Mobile Preview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Voice Employee Card */}
            <div className="hidden lg:block">
              {assistantId ? (
                <VoiceEmployeeCard
                  aiPersonaName={customerProfile?.business_name || 'AI Assistant'}
                  isConnected={isVoiceConnected}
                  isConnecting={isVoiceConnecting}
                  isSpeaking={isSpeaking}
                  onStartCall={startVoiceCall}
                  onEndCall={endVoiceCall}
                  callDuration={callDuration}
                />
              ) : (
                <Card className="shadow-xl">
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-muted mx-auto flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Voice Not Available</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Provision a phone number in Deploy Settings to enable voice preview.
                      </p>
                    </div>
                    <Button variant="outline" asChild>
                      <a href="/customer/settings/deploy">Go to Deploy Settings</a>
                    </Button>
                  </CardContent>
                </Card>
              )}
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
          </div>

          {/* Right Column - Phone Preview with Chat & Test Options */}
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
                              <button 
                                onClick={() => setIsChatOpen(false)}
                                className="text-primary-foreground/80 hover:text-primary-foreground text-lg font-bold"
                              >
                                ×
                              </button>
                            </div>
                            
                            {/* Messages */}
                            <div 
                              ref={chatContainerRef}
                              className="flex-1 overflow-y-auto p-3 space-y-2"
                            >
                              {messages.map((message, index) => (
                                <div
                                  key={index}
                                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                                    message.role === 'user'
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted text-foreground'
                                  }`}>
                                    {message.content}
                                  </div>
                                </div>
                              ))}
                              {isSending && (
                                <div className="flex justify-start">
                                  <div className="bg-muted rounded-xl px-3 py-2">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Input */}
                            <div className="p-2 border-t bg-background flex gap-1">
                              <Input
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type a message..."
                                disabled={isSending}
                                className="flex-1 text-xs h-8"
                              />
                              <Button 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isSending}
                              >
                                {isSending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Send className="h-3 w-3" />
                                )}
                              </Button>
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
              {assistantId ? (
                <VoiceEmployeeCard
                  aiPersonaName={customerProfile?.business_name || 'AI Assistant'}
                  isConnected={isVoiceConnected}
                  isConnecting={isVoiceConnecting}
                  isSpeaking={isSpeaking}
                  onStartCall={startVoiceCall}
                  onEndCall={endVoiceCall}
                  callDuration={callDuration}
                />
              ) : (
                <Card className="shadow-xl">
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-muted mx-auto flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Voice Not Available</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Provision a phone number to enable voice preview.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Test Options Card */}
            <Card className="shadow-xl border-0">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-lg">Three Ways to Test</CardTitle>
                <CardDescription>
                  Try each method to see how your AI performs
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Option 1 - Chat */}
                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                      1
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        <span className="font-semibold">AI Chat</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Click the chat bubble on the phone preview above to test web chat
                      </p>
                      <Button size="sm" variant="outline" onClick={() => setIsChatOpen(true)}>
                        Open Chat
                      </Button>
                    </div>
                  </div>

                  {/* Option 2 - Voice Web */}
                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                      2
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="font-semibold">AI Voice Web</span>
                        <Badge variant="secondary" className="text-xs">
                          {MAX_VOICE_DURATION_SECONDS}s limit
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Talk to your AI directly in the browser
                      </p>
                      <Button 
                        size="sm" 
                        onClick={startVoiceCall}
                        disabled={!assistantId || isVoiceConnecting || isVoiceConnected}
                      >
                        {isVoiceConnecting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : isVoiceConnected ? (
                          'In Call'
                        ) : (
                          'Start Voice Call'
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Option 3 - Phone Call */}
                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                      3
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Phone className="h-4 w-4 text-primary" />
                        <span className="font-semibold">Phone Call</span>
                        <Badge variant="secondary" className="text-xs">No limit</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Call your AI phone number for a full voice test
                      </p>
                      {twilioNumber ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-semibold">{twilioNumber}</span>
                          <Button size="sm" variant="ghost" onClick={copyPhoneNumber}>
                            {copiedPhone ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-amber-600">
                          No phone number provisioned yet.{' '}
                          <a href="/customer/settings/deploy" className="underline">
                            Set up in Deploy Settings
                          </a>
                        </p>
                      )}
                    </div>
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
    </div>
  );
}
