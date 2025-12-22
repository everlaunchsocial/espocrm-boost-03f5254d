import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from './useFeatureFlags';

export interface TimelineHighlight {
  id: string;
  lead_id: string;
  event_id: string;
  event_type: string;
  summary: string;
  created_at: string;
  updated_at: string;
}

export function useTimelineHighlights(leadId: string | undefined) {
  const [highlights, setHighlights] = useState<TimelineHighlight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');

  const fetchHighlights = useCallback(async (regenerate = false) => {
    if (!leadId || !phase2Enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-timeline-highlights', {
        body: { leadId, regenerate }
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.highlights) {
        setHighlights(data.highlights);
      }
    } catch (err) {
      console.error('Error fetching timeline highlights:', err);
      setError(err instanceof Error ? err.message : 'Failed to load highlights');
    } finally {
      setIsLoading(false);
    }
  }, [leadId, phase2Enabled]);

  const regenerateHighlight = useCallback(async (eventId: string) => {
    if (!leadId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-timeline-highlights', {
        body: { leadId, eventIds: [eventId], regenerate: true }
      });

      if (fnError) {
        throw fnError;
      }

      // Refresh all highlights after regeneration
      await fetchHighlights();
    } catch (err) {
      console.error('Error regenerating highlight:', err);
      setError(err instanceof Error ? err.message : 'Failed to regenerate');
    } finally {
      setIsLoading(false);
    }
  }, [leadId, fetchHighlights]);

  const refreshAll = useCallback(() => {
    return fetchHighlights(true);
  }, [fetchHighlights]);

  useEffect(() => {
    if (leadId && phase2Enabled) {
      fetchHighlights();
    }
  }, [leadId, phase2Enabled, fetchHighlights]);

  return {
    highlights,
    isLoading,
    error,
    regenerateHighlight,
    refreshAll,
  };
}
