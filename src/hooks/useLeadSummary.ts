import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useActivities, useNotes } from '@/hooks/useCRMData';
import { useLeadTeamNotes } from '@/hooks/useLeadTeamNotes';

interface UseLeadSummaryProps {
  leadId: string;
  leadName: string;
}

export function useLeadSummary({ leadId, leadName }: UseLeadSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
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

  const generateSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-lead-summary', {
        body: {
          leadName,
          notes: leadNotes.map(n => ({ content: n.content })),
          activities: leadActivities.map(a => ({
            type: a.type,
            subject: a.subject,
            description: a.description,
          })),
          teamNotes: teamNotes.map(n => ({ note_text: n.note_text })),
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to generate summary');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSummary(data.summary);
      setLastGenerated(new Date());
    } catch (err) {
      console.error('Error generating lead summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setIsLoading(false);
    }
  }, [leadName, leadNotes, leadActivities, teamNotes]);

  return {
    summary,
    isLoading,
    error,
    lastGenerated,
    generateSummary,
    hasData: leadNotes.length > 0 || leadActivities.length > 0 || teamNotes.length > 0,
  };
}
