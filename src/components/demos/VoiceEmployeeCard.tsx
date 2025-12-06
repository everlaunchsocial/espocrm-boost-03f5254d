import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, PhoneOff, Mic, Volume2, X } from 'lucide-react';

interface VoiceEmployeeCardProps {
  aiPersonaName: string;
  avatarUrl?: string;
  isConnected: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  onStartCall: () => void;
  onEndCall: () => void;
  callDuration?: number;
}

export const VoiceEmployeeCard = ({
  aiPersonaName,
  avatarUrl,
  isConnected,
  isConnecting,
  isSpeaking,
  onStartCall,
  onEndCall,
  callDuration = 0,
}: VoiceEmployeeCardProps) => {
  const [duration, setDuration] = useState(0);

  // Timer for call duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      setDuration(0);
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get initials for fallback avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card className="bg-background border shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-primary/10 border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Talk to me... Just click below</span>
          <span className="text-lg">👋</span>
        </div>
      </div>

      <CardContent className="p-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={aiPersonaName}
                className={`w-28 h-28 rounded-full object-cover transition-all ${
                  isConnected
                    ? isSpeaking
                      ? 'ring-4 ring-primary ring-offset-2 ring-offset-background animate-pulse'
                      : 'ring-4 ring-green-500/50 ring-offset-2 ring-offset-background'
                    : 'ring-2 ring-border'
                }`}
              />
            ) : (
              <div
                className={`w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-2xl font-semibold text-primary transition-all ${
                  isConnected
                    ? isSpeaking
                      ? 'ring-4 ring-primary ring-offset-2 ring-offset-background animate-pulse'
                      : 'ring-4 ring-green-500/50 ring-offset-2 ring-offset-background'
                    : 'ring-2 ring-border'
                }`}
              >
                {getInitials(aiPersonaName)}
              </div>
            )}
          </div>

          {/* Name & Status */}
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">AI</p>
          <p className="text-xl font-semibold mb-2">{aiPersonaName}</p>

          {isConnected ? (
            <>
              {/* Call Status */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">
                  {isSpeaking ? 'Talking' : 'Listening'}
                </span>
                <span className="text-sm font-mono text-primary">{formatDuration(duration)}</span>
              </div>

              {/* Call Controls */}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full w-12 h-12"
                >
                  <Mic className="h-5 w-5" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="rounded-full w-12 h-12"
                  onClick={onEndCall}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex items-center gap-8 mt-2 text-xs text-muted-foreground">
                <span>Mute</span>
                <span>End Call</span>
              </div>
            </>
          ) : (
            <>
              {/* Start Call Button */}
              <Button
                className="w-full mt-2"
                onClick={onStartCall}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Phone className="mr-2 h-4 w-4" />
                    Try Voice Chat
                  </>
                )}
              </Button>

              {/* Volume reminder */}
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <Volume2 className="h-3 w-3" />
                <span>Make sure your volume is up</span>
              </div>
            </>
          )}
        </div>
      </CardContent>

      {/* Footer */}
      <div className="border-t px-4 py-2 text-center">
        <span className="text-xs text-muted-foreground">
          Powered by <span className="text-primary font-medium">EverLaunch AI</span>
        </span>
      </div>
    </Card>
  );
};
