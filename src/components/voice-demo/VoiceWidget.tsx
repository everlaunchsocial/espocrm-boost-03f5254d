import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RealtimeChat } from "@/utils/RealtimeAudio";
import { supabase } from "@/integrations/supabase/client";

interface BusinessInfo {
  businessName: string;
  services: string[];
  description: string;
  phones: string[];
  emails: string[];
}

interface VoiceWidgetProps {
  businessInfo: BusinessInfo | null;
  disabled?: boolean;
}

export const VoiceWidget = ({ businessInfo, disabled }: VoiceWidgetProps) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const chatRef = useRef<RealtimeChat | null>(null);

  const handleMessage = (event: any) => {
    console.log('Voice event:', event.type);
  };

  const handleSpeakingChange = (speaking: boolean) => {
    setIsSpeaking(speaking);
  };

  const handleTranscript = (text: string, isFinal: boolean) => {
    if (isFinal) {
      setTranscript(text);
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
      // Get ephemeral token from edge function
      const { data, error } = await supabase.functions.invoke('realtime-session', {
        body: { businessInfo }
      });

      if (error) throw error;

      if (!data?.client_secret?.value) {
        throw new Error("Failed to get session token");
      }

      // Initialize WebRTC connection
      chatRef.current = new RealtimeChat(
        handleMessage,
        handleSpeakingChange,
        handleTranscript
      );

      await chatRef.current.init(data.client_secret.value);
      setIsConnected(true);

      toast({
        title: "Connected",
        description: `Now talking to ${businessInfo.businessName}'s AI receptionist`,
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
    chatRef.current?.disconnect();
    chatRef.current = null;
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
      chatRef.current?.disconnect();
    };
  }, []);

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
        </div>
      )}

      {/* Main button */}
      {!isConnected ? (
        <Button
          size="lg"
          className="h-16 w-16 rounded-full shadow-xl hover:shadow-2xl transition-all"
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
          Click to start voice demo
        </p>
      )}
    </div>
  );
};
