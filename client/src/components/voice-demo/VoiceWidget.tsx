import { useState, useRef, useEffect } from "react";
import { Mic, Phone, PhoneOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RealtimeChat } from "@/utils/RealtimeAudio";
import { ElevenLabsChat } from "@/utils/ElevenLabsChat";
import { supabase } from "@/integrations/supabase/client";

interface BusinessInfo {
  businessName: string;
  services: string[];
  description: string;
  phones: string[];
  emails: string[];
}

export type VoiceProvider = 'openai' | 'elevenlabs';

interface VoiceWidgetProps {
  businessInfo: BusinessInfo | null;
  disabled?: boolean;
  provider?: VoiceProvider;
}

export const VoiceWidget = ({ businessInfo, disabled, provider = 'openai' }: VoiceWidgetProps) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const openaiChatRef = useRef<RealtimeChat | null>(null);
  const elevenLabsChatRef = useRef<ElevenLabsChat | null>(null);

  const handleMessage = (event: any) => {
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
    try {
      // Get ephemeral token from edge function
      const { data, error } = await supabase.functions.invoke('realtime-session', {
        body: { businessInfo }
      });

      if (error) throw error;

      if (!data?.client_secret?.value) {
        throw new Error("Failed to get session token");
      }

      // Initialize WebRTC connection with business info for tool execution
      openaiChatRef.current = new RealtimeChat(
        handleMessage,
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
    try {
      // Get signed URL from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-session', {
        body: { businessInfo }
      });

      if (error) throw error;

      // Check for signed_url in response (from existing agent)
      // or conversation_id (from dynamic agent)
      const signedUrl = data?.signed_url || data?.conversation_id;
      
      if (!signedUrl && !data?.signed_url) {
        // If no signed URL, the API might require an agent ID
        throw new Error("ElevenLabs requires an agent ID. Create one in the ElevenLabs dashboard or use OpenAI instead.");
      }

      // Initialize WebSocket connection
      elevenLabsChatRef.current = new ElevenLabsChat(
        handleMessage,
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

  const startConversation = async () => {
    if (!businessInfo) {
      toast({
        title: "No business loaded",
        description: "Please analyze a website first",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);

    try {
      if (provider === 'elevenlabs') {
        await startElevenLabsConversation();
      } else {
        await startOpenAIConversation();
      }

      setIsConnected(true);

      toast({
        title: "Connected",
        description: `Now talking to ${businessInfo.businessName}'s AI receptionist (${provider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI'})`,
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const endConversation = () => {
    openaiChatRef.current?.disconnect();
    openaiChatRef.current = null;
    elevenLabsChatRef.current?.disconnect();
    elevenLabsChatRef.current = null;
    setIsConnected(false);
    setIsSpeaking(false);
    setTranscript("");

    toast({
      title: "Disconnected",
      description: "Call ended",
    });
  };

  useEffect(() => {
    return () => {
      openaiChatRef.current?.disconnect();
      elevenLabsChatRef.current?.disconnect();
    };
  }, []);

  // Disconnect if provider changes while connected
  useEffect(() => {
    if (isConnected) {
      endConversation();
    }
  }, [provider]);

  const providerLabel = provider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI';
  const providerColor = provider === 'elevenlabs' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-primary hover:bg-primary/90';

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
      {/* Transcript bubble */}
      {isConnected && transcript && (
        <div className="max-w-sm bg-card border border-border rounded-lg p-3 shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <p className="text-sm text-foreground">{transcript}</p>
        </div>
      )}

      {/* Status indicator */}
      {isConnected && (
        <div className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 shadow-lg">
          {isSpeaking ? (
            <>
              <Volume2 className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm text-foreground">AI is speaking...</span>
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 text-green-500" />
              <span className="text-sm text-foreground">Listening...</span>
            </>
          )}
          <span className="text-xs text-muted-foreground ml-2">({providerLabel})</span>
        </div>
      )}

      {/* Main button */}
      {!isConnected ? (
        <Button
          size="lg"
          className={`h-16 w-16 rounded-full shadow-xl hover:shadow-2xl transition-all ${providerColor}`}
          onClick={startConversation}
          disabled={disabled || isConnecting || !businessInfo}
        >
          {isConnecting ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-foreground" />
          ) : (
            <Phone className="h-6 w-6" />
          )}
        </Button>
      ) : (
        <Button
          size="lg"
          variant="destructive"
          className={`h-16 w-16 rounded-full shadow-xl hover:shadow-2xl transition-all ${
            isSpeaking ? 'ring-4 ring-primary/50 ring-offset-2' : ''
          }`}
          onClick={endConversation}
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      )}

      {/* Helper text */}
      {!isConnected && !disabled && businessInfo && (
        <p className="text-xs text-muted-foreground text-right">
          Click to start voice demo ({providerLabel})
        </p>
      )}
    </div>
  );
};
