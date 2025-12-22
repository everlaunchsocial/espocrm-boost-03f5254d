import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TimelineSummaryResult {
  summary: string;
  generatedAt: string;
  cached: boolean;
}

interface UseLeadTimelineSummaryProps {
  leadId: string;
  leadName: string;
}

export function useLeadTimelineSummary({ leadId, leadName }: UseLeadTimelineSummaryProps) {
  const [data, setData] = useState<TimelineSummaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('generate-timeline-summary', {
        body: { leadId, leadName, forceRefresh },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to generate summary');
      }

      if (result?.error) {
        // Not an error state, just no data
        if (result.error === 'No recent activity to summarize') {
          setData(null);
          return;
        }
        throw new Error(result.error);
      }

      setData(result);
    } catch (err) {
      console.error('Error generating timeline summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setIsLoading(false);
    }
  }, [leadId, leadName]);

  const refresh = useCallback(() => {
    generateSummary(true);
  }, [generateSummary]);

  return {
    summary: data?.summary || null,
    generatedAt: data?.generatedAt ? new Date(data.generatedAt) : null,
    cached: data?.cached || false,
    isLoading,
    error,
    generateSummary,
    refresh,
  };
}
