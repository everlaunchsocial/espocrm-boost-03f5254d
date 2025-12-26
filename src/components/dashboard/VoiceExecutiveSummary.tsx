import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Volume2, VolumeX, Loader2, UserPlus, ListTodo, Eye, Calendar, Sparkles } from 'lucide-react';
import { useVoiceSummary } from '@/hooks/useVoiceSummary';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Default voice for summary (Cartesia voice ID)
const DEFAULT_VOICE_ID = 'a0e99841-438c-4a64-b679-ae501e7d6091';

export function VoiceExecutiveSummary() {
  const { isEnabled } = useFeatureFlags();
  const phase1Enabled = isEnabled('aiCrmPhase1');

  const { data: summary, isLoading, error } = useVoiceSummary();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playSummary = useCallback(async () => {
    if (!summary?.voiceScript) {
      toast.error('No summary available to play');
      return;
    }

    if (isPlaying) {
      stopAudio();
      return;
    }

    setIsGenerating(true);

    try {
      // Use the OpenAI-based preview voice function to avoid Cartesia key issues.
      const { data, error: fnError } = await supabase.functions.invoke('ai-assistant-preview-voice', {
        body: {
          text: summary.voiceScript,
          voice: 'nova',
        }
      });

      if (fnError || !data?.audioContent) {
        throw new Error(fnError?.message || data?.error || 'Failed to generate audio');
      }

      // Create audio from base64
      const audioUrl = `data:audio/mp3;base64,${data.audioContent}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };

      audio.onerror = () => {
        toast.error('Failed to play audio');
        setIsPlaying(false);
        audioRef.current = null;
      };

      setIsPlaying(true);
      await audio.play();
    } catch (err) {
      console.error('Error playing summary:', err);
      toast.error('Failed to generate voice summary');
    } finally {
      setIsGenerating(false);
    }
  }, [summary, isPlaying, stopAudio]);

  // Feature flag check (must be after hooks to avoid hooks-order errors)
  if (!phase1Enabled) return null;

  if (error) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Voice Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Unable to load summary</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Voice Executive Summary
          </CardTitle>
          <Button
            variant={isPlaying ? "destructive" : "default"}
            size="sm"
            onClick={playSummary}
            disabled={isLoading || isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : isPlaying ? (
              <>
                <VolumeX className="h-4 w-4" />
                Stop
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4" />
                Play Summary
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Text Summary */}
            <p className="text-sm text-muted-foreground">
              {summary?.textSummary}
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                  <UserPlus className="h-4 w-4" />
                  <span className="text-xs font-medium">New Leads</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{summary?.newLeadsToday || 0}</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                  <ListTodo className="h-4 w-4" />
                  <span className="text-xs font-medium">Follow-ups</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{summary?.followUpsDue.length || 0}</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                  <Eye className="h-4 w-4" />
                  <span className="text-xs font-medium">Demo Views</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{summary?.demosViewed || 0}</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-medium">Appointments</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{summary?.appointmentsToday.length || 0}</p>
              </div>
            </div>

            {/* Notable Activity */}
            {summary?.notableActivity && summary.notableActivity.length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">Notable Activity</p>
                <ul className="space-y-1">
                  {summary.notableActivity.slice(0, 3).map((activity, idx) => (
                    <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {activity.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
