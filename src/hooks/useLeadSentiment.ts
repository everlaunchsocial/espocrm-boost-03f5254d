import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useActivities, useNotes } from '@/hooks/useCRMData';
import { useLeadTeamNotes } from '@/hooks/useLeadTeamNotes';

export type Sentiment = 'positive' | 'neutral' | 'negative';
export type Urgency = 'high' | 'medium' | 'low';

interface SentimentAnalysis {
  sentiment: Sentiment;
  sentimentReason: string;
  urgency: Urgency;
  urgencyReason: string;
}

interface UseLeadSentimentProps {
  leadId: string;
  leadName: string;
}

export function useLeadSentiment({ leadId, leadName }: UseLeadSentimentProps) {
  const [analysis, setAnalysis] = useState<SentimentAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);

  const { data: allActivities = [] } = useActivities();
  const { data: allNotes = [] } = useNotes();
  const { notes: teamNotes } = useLeadTeamNotes(leadId);

  const leadActivities = allActivities.filter(
    a => a.relatedTo?.id === leadId && a.relatedTo?.type === 'lead'
  );
  const leadNotes = allNotes.filter(
    n => n.relatedTo?.id === leadId && n.relatedTo?.type === 'lead'
  );

  const analyzeSentiment = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-lead-sentiment', {
        body: {
          leadName,
          notes: leadNotes.map(n => ({ content: n.content })),
          activities: leadActivities.map(a => ({
            type: a.type,
            subject: a.subject,
            description: a.description,
          })),
          teamNotes: teamNotes.map(n => ({ note_text: n.note_text })),
          demoViews: [], // Could be extended to include demo view data
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to analyze sentiment');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setAnalysis({
        sentiment: data.sentiment || 'neutral',
        sentimentReason: data.sentimentReason || '',
        urgency: data.urgency || 'low',
        urgencyReason: data.urgencyReason || '',
      });
      setLastGenerated(new Date());
    } catch (err) {
      console.error('Error analyzing lead sentiment:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze sentiment');
    } finally {
      setIsLoading(false);
    }
  }, [leadName, leadNotes, leadActivities, teamNotes]);

  return {
    analysis,
    isLoading,
    error,
    lastGenerated,
    analyzeSentiment,
    hasData: leadNotes.length > 0 || leadActivities.length > 0 || teamNotes.length > 0,
  };
}
