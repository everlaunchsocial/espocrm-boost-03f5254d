/**
 * PublicDemo.tsx - Public demo page for prospects
 * 
 * IMPLEMENTATION NOTES:
 * - Microphone in chat: Uses Web Speech API (Option 1 - simpler approach)
 *   Clicking mic starts/stops recording, recognized text is inserted into chat input
 * - Screenshot: Added loading skeleton and onError fallback
 * - Phone mockup: Increased to w-80 h-[500px] for better readability
 * - Enter key: Fixed scroll bug with onKeyDown and proper preventDefault
 */

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDemos, Demo } from '@/hooks/useDemos';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, MessageCircle, Phone, PhoneOff, PhoneCall, Sparkles, Volume2, Mic, MicOff, Send, ArrowLeft, X, Calendar, User } from 'lucide-react';
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
  
  // Screenshot state - start as not loading since we show skeleton when needed
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [screenshotError, setScreenshotError] = useState(false);
  
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
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Speech-to-text state (Web Speech API)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

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
      
      // Reset screenshot states when demo loads
      if (result.data?.screenshot_url) {
        setScreenshotLoading(true);
        setScreenshotError(false);
      }

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
      recognitionRef.current?.abort();
    };
  }, []);

  // Scroll to bottom of chat when new messages arrive (only scroll chat container, not page)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Initialize Web Speech API
  useEffect(() => {
    const windowWithSpeech = window as any;
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognitionClass = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionClass();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setChatInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast({
            title: 'Microphone access denied',
            description: 'Please allow microphone access to use voice input.',
            variant: 'destructive',
          });
        }
      };
    }
  }, [toast]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: 'Not supported',
        description: 'Speech recognition is not supported in your browser.',
        variant: 'destructive',
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

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
      const personaName = demo.ai_persona_name || 'AI Assistant';
      const greeting: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Hi! I'm ${personaName} from ${demo.business_name}. How can I help you today?`,
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

    // Stop any ongoing speech recognition
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

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

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
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
    const vapiWidgetUrl = `https://vapi.ai/call/${vapiAssistantId}`;
    window.open(vapiWidgetUrl, '_blank');
  };

  // Get initials for avatar
  const getPersonaInitials = () => {
    const name = demo?.ai_persona_name || 'AI';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
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
            {/* Website Screenshot Preview */}
            {demo.screenshot_url && !screenshotError && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Website Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <a
                    href={demo.website_url?.startsWith('http') ? demo.website_url : `https://${demo.website_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative"
                  >
                    {!screenshotError && (
                      <Skeleton className={`w-full h-48 rounded-b-lg ${screenshotLoading ? 'block' : 'hidden'}`} />
                    )}
                    <img
                      src={demo.screenshot_url}
                      alt={`Homepage preview for ${demo.business_name}`}
                      className={`w-full h-auto rounded-b-lg hover:opacity-90 transition-opacity`}
                      style={{ display: screenshotLoading ? 'none' : 'block' }}
                      onLoad={() => {
                        console.log('Screenshot loaded successfully:', demo.screenshot_url);
                        setScreenshotLoading(false);
                      }}
                      onError={(e) => {
                        console.error('Screenshot failed to load:', demo.screenshot_url, e);
                        setScreenshotLoading(false);
                        setScreenshotError(true);
                      }}
                    />
                  </a>
                </CardContent>
              </Card>
            )}
            
            {/* Fallback when screenshot fails or doesn't exist */}
            {(!demo.screenshot_url || screenshotError) && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Website Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Screenshot not available for this demo.
                  </p>
                  {demo.website_url && (
                    <a
                      href={demo.website_url.startsWith('http') ? demo.website_url : `https://${demo.website_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline mt-2 text-sm"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Visit website
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Phone Mockup Area - Increased size */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-muted to-muted/50 p-6 md:p-8 text-center">
                <div className="mx-auto w-80 h-[500px] bg-background rounded-3xl border-4 border-foreground/20 shadow-xl flex flex-col overflow-hidden">
                  {/* Phone Notch */}
                  <div className="bg-foreground/20 h-6 flex items-center justify-center shrink-0">
                    <div className="w-20 h-3 bg-foreground/30 rounded-full"></div>
                  </div>
                  
                  {/* Phone Screen Content */}
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                    {isChatOpen ? (
                      /* Chat Interface */
                      <>
                        {/* Chat Header with Avatar */}
                        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 shrink-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-xs font-semibold text-primary">
                                {getPersonaInitials()}
                              </span>
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium leading-tight">
                                {demo.ai_persona_name || 'AI Assistant'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {demo.business_name}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={closeChatDemo}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Messages Area - scrollable */}
                        <div 
                          ref={chatContainerRef}
                          className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
                        >
                          {chatMessages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              {message.role === 'assistant' && (
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2 shrink-0 mt-1">
                                  <span className="text-[10px] font-semibold text-primary">
                                    {getPersonaInitials()}
                                  </span>
                                </div>
                              )}
                              <div
                                className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
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
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2 shrink-0">
                                <span className="text-[10px] font-semibold text-primary">
                                  {getPersonaInitials()}
                                </span>
                              </div>
                              <div className="bg-muted text-foreground px-3 py-2 rounded-2xl rounded-bl-md text-sm">
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

                        {/* Input Area with Mic button */}
                        <div className="p-3 border-t bg-background shrink-0">
                          <div className="flex gap-2 items-center">
                            <Button
                              type="button"
                              size="icon"
                              variant={isListening ? "default" : "outline"}
                              className={`h-9 w-9 shrink-0 ${isListening ? 'animate-pulse' : ''}`}
                              onClick={toggleListening}
                              disabled={isChatLoading}
                              title={isListening ? 'Stop listening' : 'Start voice input'}
                            >
                              {isListening ? (
                                <MicOff className="h-4 w-4" />
                              ) : (
                                <Mic className="h-4 w-4" />
                              )}
                            </Button>
                            <Input
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyDown={handleChatKeyDown}
                              placeholder={isListening ? 'Listening...' : 'Type a message...'}
                              className="flex-1 h-9 text-sm"
                              disabled={isChatLoading}
                            />
                            <Button
                              type="button"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={sendChatMessage}
                              disabled={!chatInput.trim() || isChatLoading}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                          {isListening && (
                            <p className="text-xs text-muted-foreground text-center mt-2">
                              🎤 Listening... Speak now
                            </p>
                          )}
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
                  disabled={isVoiceConnecting}
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
                disabled={!hasVapiConfig || isVoiceConnected}
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