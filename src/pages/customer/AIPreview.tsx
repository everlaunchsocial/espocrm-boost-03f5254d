import { useState, useRef, useEffect, useCallback } from 'react';
import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageSquare, 
  Phone, 
  PhoneCall,
  PhoneOff,
  Send, 
  Loader2, 
  Copy, 
  CheckCircle,
  Bot,
  User,
  Mic
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import Vapi from '@vapi-ai/web';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

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
  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const vapiRef = useRef<Vapi | null>(null);

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

  // Cleanup Vapi on unmount
  useEffect(() => {
    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsSending(true);

    try {
      const systemPrompt = `You are an AI assistant for ${customerProfile?.business_name || 'a business'}.
${voiceSettings?.voice_style ? `Speak in a ${voiceSettings.voice_style} style.` : ''}
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

  const copyPhoneNumber = () => {
    if (twilioNumber) {
      navigator.clipboard.writeText(twilioNumber);
      toast.success('Phone number copied!');
    }
  };

  // Voice Web functions
  const startVoiceCall = async () => {
    if (!assistantId) {
      toast.error('No voice assistant available. Please provision a phone number first.');
      return;
    }

    setIsVoiceConnecting(true);
    setVoiceTranscript('');

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
        toast.success('Voice call connected');
      });

      vapi.on('call-end', () => {
        setIsVoiceConnected(false);
        setIsVoiceConnecting(false);
      });

      vapi.on('speech-start', () => {
        // AI is speaking
      });

      vapi.on('speech-end', () => {
        // AI finished speaking
      });

      vapi.on('message', (message: any) => {
        if (message.type === 'transcript' && message.transcriptType === 'final') {
          const role = message.role === 'user' ? 'You' : 'AI';
          setVoiceTranscript(prev => prev + `${role}: ${message.transcript}\n`);
        }
      });

      vapi.on('error', (error: any) => {
        console.error('Vapi error:', error);
        toast.error('Voice call error');
        setIsVoiceConnected(false);
        setIsVoiceConnecting(false);
      });

      // Start the call
      await vapi.start(assistantId);

    } catch (error) {
      console.error('Failed to start voice call:', error);
      toast.error('Failed to start voice call');
      setIsVoiceConnecting(false);
    }
  };

  const endVoiceCall = () => {
    if (vapiRef.current) {
      vapiRef.current.stop();
      vapiRef.current = null;
    }
    setIsVoiceConnected(false);
    setIsVoiceConnecting(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[500px]" />
            <Skeleton className="h-[500px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Preview Your AI</h1>
          <p className="text-muted-foreground">
            Test how your AI assistant responds to customers
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chat Preview */}
          <Card className="flex flex-col h-[500px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
                Chat Preview
              </CardTitle>
              <CardDescription>
                Test the web chat experience
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
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
                    <div className={`p-1.5 rounded-full ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="h-3 w-3" />
                      ) : (
                        <Bot className="h-3 w-3" />
                      )}
                    </div>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
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
                    <div className="p-1.5 rounded-full bg-muted">
                      <Bot className="h-3 w-3" />
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
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

          {/* Voice Preview */}
          <Card className="flex flex-col h-[500px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mic className="h-5 w-5 text-primary" />
                Voice Preview
              </CardTitle>
              <CardDescription>
                Test the voice experience in your browser
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {assistantId ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                  {/* Call Button */}
                  <div className="text-center space-y-4">
                    {isVoiceConnected ? (
                      <div className="p-6 bg-destructive/10 rounded-full inline-block animate-pulse">
                        <PhoneCall className="h-12 w-12 text-destructive" />
                      </div>
                    ) : (
                      <div className="p-6 bg-primary/10 rounded-full inline-block">
                        <Mic className="h-12 w-12 text-primary" />
                      </div>
                    )}

                    <div>
                      <p className="text-lg font-medium text-foreground">
                        {isVoiceConnected ? 'Call in Progress' : 'Browser Voice Call'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isVoiceConnected 
                          ? 'Speak naturally to test your AI' 
                          : 'Click to start a voice conversation'}
                      </p>
                    </div>

                    <Button
                      size="lg"
                      variant={isVoiceConnected ? 'destructive' : 'default'}
                      onClick={isVoiceConnected ? endVoiceCall : startVoiceCall}
                      disabled={isVoiceConnecting}
                      className="gap-2 px-8"
                    >
                      {isVoiceConnecting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Connecting...
                        </>
                      ) : isVoiceConnected ? (
                        <>
                          <PhoneOff className="h-5 w-5" />
                          End Call
                        </>
                      ) : (
                        <>
                          <PhoneCall className="h-5 w-5" />
                          Start Voice Call
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Transcript */}
                  {voiceTranscript && (
                    <div className="w-full mt-4 p-3 bg-muted/50 rounded-lg text-sm max-h-32 overflow-y-auto">
                      <p className="text-xs text-muted-foreground mb-1">Transcript:</p>
                      <pre className="whitespace-pre-wrap text-foreground font-sans">{voiceTranscript}</pre>
                    </div>
                  )}

                  {/* Phone number section */}
                  {twilioNumber && (
                    <div className="w-full pt-4 border-t border-border mt-auto">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Or call directly:</p>
                          <p className="font-mono font-medium text-foreground">{twilioNumber}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={copyPhoneNumber}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-4 bg-muted rounded-full">
                    <Phone className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">No Voice Assistant Yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Provision a phone number in Deploy settings to enable voice testing.
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <a href="/customer/settings/deploy">Go to Deploy Settings</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
