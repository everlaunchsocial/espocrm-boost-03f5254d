import { useState, useRef, useEffect } from 'react';
import { useCustomerOnboarding } from '@/hooks/useCustomerOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageSquare, 
  Phone, 
  Send, 
  Loader2, 
  Copy, 
  CheckCircle,
  Bot,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Add initial greeting when component mounts
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

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsSending(true);

    try {
      // Build system prompt from customer settings
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
      // Add error message to chat
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
              {/* Messages Container */}
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

              {/* Input */}
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
          <Card className="h-[500px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Phone className="h-5 w-5 text-primary" />
                Voice Preview
              </CardTitle>
              <CardDescription>
                Test the phone call experience
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-[calc(100%-5rem)]">
              {twilioNumber ? (
                <div className="text-center space-y-6">
                  <div className="p-4 bg-primary/10 rounded-full inline-block">
                    <Phone className="h-12 w-12 text-primary" />
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Your AI Phone Number</p>
                    <p className="text-3xl font-mono font-bold text-foreground">
                      {twilioNumber}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">Active</span>
                  </div>

                  <Button onClick={copyPhoneNumber} variant="outline" className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copy Number
                  </Button>

                  <div className="bg-muted/50 rounded-lg p-4 text-left max-w-xs">
                    <p className="text-sm font-medium text-foreground mb-2">
                      Test Instructions:
                    </p>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Call the number above</li>
                      <li>Speak naturally as a customer would</li>
                      <li>Test different scenarios</li>
                      <li>Check how the AI handles your questions</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-muted rounded-full inline-block">
                    <Phone className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">No Phone Number Yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Provision a phone number in the Deploy settings to test voice calls.
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