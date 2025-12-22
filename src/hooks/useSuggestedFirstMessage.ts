import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useActivities, useNotes } from '@/hooks/useCRMData';
import { useQuery } from '@tanstack/react-query';

interface FirstMessageRequest {
  leadName: string;
  leadCompany?: string;
  leadTitle?: string;
  leadIndustry?: string;
  demoViews?: number;
  recentNotes?: string[];
  recentActivities?: string[];
  hasDemoEngagement?: boolean;
}

interface UseSuggestedFirstMessageResult {
  message: string | null;
  isLoading: boolean;
  error: string | null;
  generate: () => Promise<void>;
  dismiss: () => void;
  isDismissed: boolean;
}

// Fetch demos for lead to get engagement data
function useLeadDemos(leadId: string) {
  return useQuery({
    queryKey: ['lead-demos-engagement', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demos')
        .select('id, view_count, chat_interaction_count, voice_interaction_count')
        .eq('lead_id', leadId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!leadId,
  });
}

export function useSuggestedFirstMessage(
  leadId: string,
  leadName: string,
  leadCompany?: string,
  leadTitle?: string,
  leadIndustry?: string
): UseSuggestedFirstMessageResult {
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const { data: activities = [] } = useActivities();
  const { data: notes = [] } = useNotes();
  const { data: demos } = useLeadDemos(leadId);

  const generate = useCallback(async () => {
    if (isDismissed) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Get lead-specific activities and notes
      const leadActivities = activities
        .filter(a => a.relatedTo?.type === 'lead' && a.relatedTo.id === leadId)
        .slice(0, 3)
        .map(a => a.subject);

      const leadNotes = notes
        .filter(n => n.relatedTo.type === 'lead' && n.relatedTo.id === leadId)
        .slice(0, 3)
        .map(n => n.content.substring(0, 100));

      // Calculate demo engagement from demos table
      const totalDemoViews = demos?.reduce((sum, d) => sum + (d.view_count || 0), 0) || 0;
      const hasDemoEngagement = demos?.some(d => 
        (d.chat_interaction_count || 0) > 0 || (d.voice_interaction_count || 0) > 0
      ) || false;

      const requestBody: FirstMessageRequest = {
        leadName,
        leadCompany,
        leadTitle,
        leadIndustry,
        demoViews: totalDemoViews,
        recentNotes: leadNotes,
        recentActivities: leadActivities,
        hasDemoEngagement,
      };

      const { data, error: fnError } = await supabase.functions.invoke('generate-first-message', {
        body: requestBody,
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setMessage(data?.message || null);
    } catch (err: any) {
      console.error('Failed to generate first message:', err);
      setError(err.message || 'Failed to generate message');
    } finally {
      setIsLoading(false);
    }
  }, [leadId, leadName, leadCompany, leadTitle, leadIndustry, activities, notes, demos, isDismissed]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    setMessage(null);
  }, []);

  return {
    message,
    isLoading,
    error,
    generate,
    dismiss,
    isDismissed,
  };
}
