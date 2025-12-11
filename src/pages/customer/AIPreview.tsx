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
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import Vapi from '@vapi-ai/web';
import { VoiceEmployeeCard } from '@/components/demos/VoiceEmployeeCard';

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
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Voice Web state
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
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

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Add initial greeting
  useEffect(() => {
    if (chatSettings?.greeting_text && messages.length === 0) {
      setMessages([{ role: 'assistant', content: chatSettings.greeting_text }]);
    } else if (customerProfile?.business_name && messages.length === 0) {
      setMessages([{ 
        role: 'assistant', 
        content: `Hi! Welcome to ${customerProfile.business_name}. How can I help you today?` 
      }]);
    }
  }, [chatSettings?.greeting_text, customerProfile?.business_name, messages.length]);

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

      const { data, error } = await supabase.functions.invoke('demo-chat', {
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

  // Voice Web functions
  const startVoiceCall = async () => {
    if (!assistantId) {
      toast.error('No voice assistant available. Please provision a phone number first.');
      return;
    }

    setIsVoiceConnecting(true);
    setCallDuration(0);

    try {
      // Get Vapi public key from edge function
      const { data, error } = await supabase.functions.invoke('vapi-web-session', {
        body: { assistantId }
      });

      if (error || !data?.publicKey) {
        throw new Error('Failed to get voice session');
      }

      // Initialize Vapi client
      const vapi = new Vapi(data.publicKey);
      vapiRef.current = vapi;

      // Set up event handlers
      vapi.on('call-start', () => {
        setIsVoiceConnected(true);
        setIsVoiceConnecting(false);
        
        // Start duration timer
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

      // Start the call
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
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Skeleton className="h-[500px] lg:col-span-2" />
            <Skeleton className="h-[500px] lg:col-span-3" />
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
        
        <div className="relative max-w-6xl mx-auto px-4 py-8 md:py-12">
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
              Preview Your AI Assistant
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              Test how your AI sounds and responds for <span className="font-semibold">{customerProfile?.business_name || 'your business'}</span>
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
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12 -mt-4">
        <div className="grid lg:grid-cols-5 gap-8">
          
          {/* Left Column - Voice Card & Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Voice Employee Card */}
            {assistantId ? (
              <VoiceEmployeeCard
                aiPersonaName={voiceSettings?.voice_style === 'professional' ? 'Professional AI' : 'AI Assistant'}
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

            {/* Info Card */}
            <Card className="shadow-lg border-0">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/20 rounded">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-semibold text-primary">Testing Tips</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</div>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Voice Preview</span> — Talk to your AI (limited to {MAX_VOICE_DURATION_SECONDS}s per call)
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</div>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Chat Preview</span> — Test the text-based experience
                    </p>
                  </div>
                  {twilioNumber && (
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</div>
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Call {twilioNumber}</span> — Full voice test with no time limit
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Chat Preview */}
          <div className="lg:col-span-3">
            <Card className="shadow-xl border-0 h-[600px] flex flex-col">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Chat Preview
                </CardTitle>
                <CardDescription>
                  Test the web chat experience your customers will have
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0 p-4">
                {/* Messages */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2"
                >
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 ${
                        message.role === 'user' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <div className={`p-2 rounded-full shrink-0 ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                      <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}>
                        {message.content}
                      </div>
                    </div>
                  ))}
                  {isSending && (
                    <div className="flex items-start gap-2">
                      <div className="p-2 rounded-full bg-muted">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-muted rounded-xl px-4 py-2.5">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="flex gap-2 pt-2 border-t">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    disabled={isSending}
                    className="flex-1"
                  />
                  <Button 
                    size="icon" 
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isSending}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
