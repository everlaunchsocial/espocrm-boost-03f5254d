import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLeadSummary } from '@/hooks/useLeadSummary';
import { toast } from 'sonner';

// Default voice for summary (Cartesia voice ID)
const DEFAULT_VOICE_ID = 'a0e99841-438c-4a64-b679-ae501e7d6091';

interface UseLeadVoiceSummaryProps {
  leadId: string;
  leadName: string;
}

export function useLeadVoiceSummary({ leadId, leadName }: UseLeadVoiceSummaryProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { summary, generateSummary, hasData, isLoading: isSummaryLoading } = useLeadSummary({
    leadId,
    leadName,
  });

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playVoiceSummary = useCallback(async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }

    // If no summary yet, generate one first
    let textToSpeak = summary;
    if (!textToSpeak) {
      if (!hasData) {
        toast.info('No summary available', {
          description: 'This lead has no activity to summarize yet.',
        });
        return;
      }

      setIsGenerating(true);
      try {
        await generateSummary();
        // Wait a moment for state to update
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch {
        toast.error('Failed to generate summary');
        setIsGenerating(false);
        return;
      }
    }

    // Get the latest summary after generation
    textToSpeak = summary || `Summary for ${leadName}. No detailed activity available yet.`;

    setIsGenerating(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('preview-voice', {
        body: {
          voice_id: DEFAULT_VOICE_ID,
          text: textToSpeak,
          speed: 1.0,
        },
      });

      if (fnError || !data?.audio) {
        throw new Error(fnError?.message || 'Failed to generate audio');
      }

      // Create audio from base64
      const audioUrl = `data:audio/mp3;base64,${data.audio}`;
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
      console.error('Error playing voice summary:', err);
      toast.error('Failed to play voice summary');
    } finally {
      setIsGenerating(false);
    }
  }, [summary, isPlaying, stopAudio, generateSummary, hasData, leadName]);

  return {
    isPlaying,
    isGenerating,
    hasData,
    isSummaryLoading,
    playVoiceSummary,
    stopAudio,
  };
}
