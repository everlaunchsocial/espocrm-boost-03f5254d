import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  channel: string;
  steps_count: number;
  is_active: boolean;
  created_at: string;
}

interface AddLeadToSequenceParams {
  leadId: string;
  sequenceId: string;
  scheduledStartAt: Date;
}

export function useSequences() {
  return useQuery({
    queryKey: ['sequences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sequences')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Sequence[];
    },
  });
}

export function useAddLeadToSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, sequenceId, scheduledStartAt }: AddLeadToSequenceParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('lead_sequences')
        .insert({
          lead_id: leadId,
          sequence_id: sequenceId,
          scheduled_start_at: scheduledStartAt.toISOString(),
          added_by: user?.id || null,
          status: 'scheduled',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-sequences', variables.leadId] });
    },
  });
}

export function useLeadSequences(leadId: string) {
  return useQuery({
    queryKey: ['lead-sequences', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_sequences')
        .select(`
          *,
          sequence:sequences(*)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
  });
}
