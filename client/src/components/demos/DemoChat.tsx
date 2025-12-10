import { useState, useRef, useEffect } from 'react';
import { X, Send, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

interface DemoChatProps {
  isOpen: boolean;
  onClose: () => void;
  demoId: string;
  businessName?: string;
  aiPersonaName?: string;
  onFirstMessage?: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const DemoChat = ({ 
  isOpen, 
  onClose, 
  demoId, 
  businessName,
  aiPersonaName,
  onFirstMessage 
}: DemoChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: `Hi! I'm ${aiPersonaName || 'Jenna'}, the friendly AI assistant at EverLaunch AI. Today I want to show you how I can act as a custom voice AI agent for your business. Can I show you a quick demo?` }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasTrackedInteraction = useRef(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const windowWithSpeech = window as any;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionClass = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionClass();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => prev + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Track first interaction
    if (!hasTrackedInteraction.current) {
      hasTrackedInteraction.current = true;
      onFirstMessage?.();
    }

    try {
      const { data, error } = await supabase.functions.invoke('demo-chat', {
        body: { 
          demoId, 
          messages: [...messages, { role: 'user', content: userMessage }] 
        }
      });

      if (error) throw error;

      const assistantMessage = data?.reply || "I'm sorry, I couldn't process that request.";
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm having trouble connecting right now. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSend();
    }
  };

  if (!isOpen) return null;

  const personaInitials = aiPersonaName 
    ? aiPersonaName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'AI';

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-background rounded-[2rem] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs font-semibold">
            {personaInitials}
          </div>
          <div>
            <span className="font-semibold text-sm">{aiPersonaName || 'AI Assistant'}</span>
            <p className="text-xs opacity-80">{businessName}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted text-foreground rounded-bl-md'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted text-foreground rounded-2xl rounded-bl-md px-4 py-2 text-sm">
              <span className="animate-pulse">Typing...</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Input */}
      <div className="p-3 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleListening}
            className={isListening ? 'text-destructive' : ''}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button size="icon" onClick={handleSend} disabled={isLoading || !inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {isListening && (
          <p className="text-xs text-muted-foreground mt-1 text-center">Listening...</p>
        )}
      </div>
    </div>
  );
};
