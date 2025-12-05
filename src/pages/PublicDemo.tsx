import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDemos, Demo } from '@/hooks/useDemos';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink, MessageCircle, Phone, PhoneOff, PhoneCall, Sparkles, Volume2, Mic, Send, ArrowLeft, X, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChat } from '@/utils/RealtimeAudio';
import { ElevenLabsChat } from '@/utils/ElevenLabsChat';
import { supabase } from '@/integrations/supabase/client';

// Chat message type
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

const PublicDemo = () => {
  const { id } = useParams<{ id: string }>();
  const { getDemoById, incrementViewCount, incrementVoiceInteraction, incrementChatInteraction } = useDemos();
  const { toast } = useToast();
  
  const [demo, setDemo] = useState<Demo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewTracked = useRef(false);
  
  // Voice state
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const openaiChatRef = useRef<RealtimeChat | null>(null);
  const elevenLabsChatRef = useRef<ElevenLabsChat | null>(null);
  const voiceInteractionTracked = useRef(false);

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatInteractionTracked = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      openaiChatRef.current?.disconnect();
      elevenLabsChatRef.current?.disconnect();
    };
  }, []);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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

  // Chat functions
  const startChatDemo = () => {
    setIsChatOpen(true);
    // Add initial greeting message
    if (chatMessages.length === 0 && demo) {
      const greeting: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Hi! I'm the AI assistant for ${demo.business_name}. How can I help you today?`,
        createdAt: new Date().toISOString(),
      };
      setChatMessages([greeting]);
    }
  };

  const closeChatDemo = () => {
    setIsChatOpen(false);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading || !demo || !id) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: chatInput.trim(),
      createdAt: new Date().toISOString(),
    };

    // Add user message immediately
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    // Track chat interaction only once per session (on first user message)
    if (!chatInteractionTracked.current) {
      chatInteractionTracked.current = true;
      await incrementChatInteraction(id);
    }

    try {
      // Call the demo-chat edge function
      const { data, error } = await supabase.functions.invoke('demo-chat', {
        body: {
          demoId: id,
          messages: [...chatMessages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply || 'I apologize, I was unable to generate a response.',
        createdAt: new Date().toISOString(),
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending chat message:', error);
      
      // Add error message from assistant
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, something went wrong starting the chat demo. Please try again in a moment, or use the voice demo instead.',
        createdAt: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const voiceProviderLabel = demo?.voice_provider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI';

  // Vapi config check
  const vapiPublicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
  const vapiAssistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID;
  const hasVapiConfig = Boolean(vapiPublicKey && vapiAssistantId);

  const handleVapiCall = () => {
    if (!hasVapiConfig || !id) return;
    
    // TODO: Track phone interaction here when implemented
    // For now, open Vapi's web widget URL or placeholder
    // Once Vapi SDK is integrated, this can trigger an in-browser call
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

          {/* Right Column - Demo Area */}
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
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {isChatOpen ? (
                      /* Chat Interface */
                      <>
                        {/* Chat Header */}
                        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-primary" />
                            <span className="text-xs font-medium">{demo.ai_persona_name || 'AI Assistant'}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={closeChatDemo}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                          {chatMessages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs ${
                                  message.role === 'user'
                                    ? 'bg-primary text-primary-foreground rounded-br-md'
                                    : 'bg-muted text-foreground rounded-bl-md'
                                }`}
                              >
                                {message.content}
                              </div>
                            </div>
                          ))}
                          {isChatLoading && (
                            <div className="flex justify-start">
                              <div className="bg-muted text-foreground px-3 py-2 rounded-2xl rounded-bl-md text-xs">
                                <span className="flex items-center gap-1">
                                  <span className="animate-bounce">•</span>
                                  <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>•</span>
                                  <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>•</span>
                                </span>
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-2 border-t bg-background">
                          <div className="flex gap-2">
                            <Input
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyPress={handleChatKeyPress}
                              placeholder="Type a message..."
                              className="flex-1 h-8 text-xs"
                              disabled={isChatLoading}
                            />
                            <Button
                              size="icon"
                              className="h-8 w-8"
                              onClick={sendChatMessage}
                              disabled={!chatInput.trim() || isChatLoading}
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : isVoiceConnected ? (
                      /* Voice Connected State */
                      <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
                        <div className={`rounded-full p-4 mb-4 transition-all ${
                          isSpeaking 
                            ? 'bg-primary/20 ring-4 ring-primary/30 animate-pulse' 
                            : 'bg-green-500/20'
                        }`}>
                          {isSpeaking ? (
                            <Volume2 className="h-8 w-8 text-primary animate-pulse" />
                          ) : (
                            <Mic className="h-8 w-8 text-green-500" />
                          )}
                        </div>
                        <h3 className="font-semibold text-sm mb-2">
                          {isSpeaking ? 'AI is speaking...' : 'Listening...'}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          {demo.ai_persona_name || 'AI Assistant'}
                        </p>
                        <span className="text-xs text-muted-foreground/60">
                          via {voiceProviderLabel}
                        </span>
                        {transcript && (
                          <div className="mt-4 p-2 bg-muted rounded-lg max-h-24 overflow-y-auto">
                            <p className="text-xs text-foreground">{transcript}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Default State */
                      <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
                        <Sparkles className="h-12 w-12 text-primary mb-4" />
                        <h3 className="font-semibold text-sm mb-2">
                          {demo.chat_title || 'Chat with us'}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-4">
                          Try our AI chat or voice demo
                        </p>
                        <p className="text-xs text-muted-foreground/60">
                          Powered by {voiceProviderLabel}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="grid gap-3">
              {!isChatOpen && (
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full" 
                  onClick={startChatDemo}
                  disabled={isVoiceConnected}
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Start Chat Demo
                </Button>
              )}
              
              {isChatOpen && (
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full" 
                  onClick={closeChatDemo}
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back to Overview
                </Button>
              )}
              
              {!isVoiceConnected ? (
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={startVoiceDemo}
                  disabled={isVoiceConnecting || isChatOpen}
                >
                  {isVoiceConnecting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Phone className="mr-2 h-5 w-5" />
                      Try Voice Demo
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  variant="destructive"
                  className="w-full"
                  onClick={endVoiceDemo}
                >
                  <PhoneOff className="mr-2 h-5 w-5" />
                  End Voice Demo
                </Button>
              )}

              {/* Vapi Phone Call Option */}
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={handleVapiCall}
                disabled={!hasVapiConfig || isVoiceConnected || isChatOpen}
              >
                <PhoneCall className="mr-2 h-5 w-5" />
                {hasVapiConfig ? 'Call This AI Assistant' : 'Phone Demo Coming Soon'}
              </Button>
              {!hasVapiConfig && (
                <p className="text-xs text-muted-foreground text-center -mt-1">
                  We'll enable phone demos once your Vapi account is connected.
                </p>
              )}
            </div>

            {/* Book a Call Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Book a Call
                </CardTitle>
                <CardDescription>
                  Want to learn more? Schedule a quick call with our team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {import.meta.env.VITE_DEFAULT_BOOKING_URL ? (
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      // TODO: Add incrementBookingClick(id) tracking here when implemented
                      window.open(import.meta.env.VITE_DEFAULT_BOOKING_URL, '_blank');
                    }}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Book a Call With Us
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Online scheduling will be added soon. For now, please reply to the email or contact us directly.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Info Note */}
            <p className="text-xs text-center text-muted-foreground">
              Powered by {voiceProviderLabel} • {demo.ai_persona_name || 'AI Assistant'}
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
