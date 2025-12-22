import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ManualFollowUp {
  id: string;
  lead_id: string;
  type: string;
  summary: string;
  notes: string | null;
  source: string;
  status: string;
  triggered_at: string;
  resolved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateManualFollowUpInput {
  lead_id: string;
  type: string;
  summary: string;
  notes?: string;
}

/**
 * Hook to manage manual follow-up entries for a lead.
 */
export function useManualFollowUps(leadId?: string) {
  const queryClient = useQueryClient();

  // Fetch manual follow-ups for a specific lead
  const { data: manualFollowUps = [], isLoading } = useQuery({
    queryKey: ['manual-follow-ups', leadId],
    queryFn: async (): Promise<ManualFollowUp[]> => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('manual_follow_ups')
        .select('*')
        .eq('lead_id', leadId)
        .order('triggered_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!leadId,
  });

  // Create a new manual follow-up
  const createFollowUp = useMutation({
    mutationFn: async (input: CreateManualFollowUpInput) => {
      const { data, error } = await supabase
        .from('manual_follow_ups')
        .insert({
          lead_id: input.lead_id,
          type: input.type,
          summary: input.summary,
          notes: input.notes || null,
          source: 'manual',
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-follow-ups', leadId] });
      toast.success('Manual follow-up added');
    },
    onError: (error) => {
      console.error('Error creating manual follow-up:', error);
      toast.error('Failed to add follow-up');
    },
  });

  // Mark a manual follow-up as resolved
  const resolveFollowUp = useMutation({
    mutationFn: async (followUpId: string) => {
      const { error } = await supabase
        .from('manual_follow_ups')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', followUpId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-follow-ups', leadId] });
      toast.success('Follow-up marked as resolved');
    },
    onError: (error) => {
      console.error('Error resolving follow-up:', error);
      toast.error('Failed to resolve follow-up');
    },
  });

  return {
    manualFollowUps,
    isLoading,
    createFollowUp,
    resolveFollowUp,
  };
}
