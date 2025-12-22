import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from './useFeatureFlags';

export interface LeadIntent {
  id: string;
  lead_id: string;
  tag: string;
  source: 'ai' | 'manual';
  created_at: string;
  created_by: string | null;
}

export function useLeadIntents(leadId: string | undefined) {
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');

  return useQuery({
    queryKey: ['lead-intents', leadId],
    queryFn: async (): Promise<LeadIntent[]> => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('lead_intents')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as LeadIntent[];
    },
    enabled: !!leadId && phase2Enabled,
    staleTime: 30000,
  });
}

export function useAddLeadIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      leadId, 
      tag, 
      source = 'manual' 
    }: { 
      leadId: string; 
      tag: string; 
      source?: 'ai' | 'manual';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('lead_intents')
        .insert({
          lead_id: leadId,
          tag,
          source,
          created_by: user?.id || null,
        });

      if (error) {
        // Ignore unique constraint violations (tag already exists)
        if (error.code === '23505') return;
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-intents', variables.leadId] });
    },
  });
}

export function useRemoveLeadIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, tag }: { leadId: string; tag: string }) => {
      const { error } = await supabase
        .from('lead_intents')
        .delete()
        .eq('lead_id', leadId)
        .eq('tag', tag);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-intents', variables.leadId] });
    },
  });
}

export function useBulkUpdateLeadIntents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      leadId, 
      tags 
    }: { 
      leadId: string; 
      tags: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // First, get existing intents
      const { data: existingIntents } = await supabase
        .from('lead_intents')
        .select('tag')
        .eq('lead_id', leadId);

      const existingTags = new Set((existingIntents || []).map(i => i.tag));
      const newTags = new Set(tags);

      // Tags to add
      const tagsToAdd = tags.filter(t => !existingTags.has(t));
      // Tags to remove
      const tagsToRemove = Array.from(existingTags).filter(t => !newTags.has(t));

      // Remove old tags
      if (tagsToRemove.length > 0) {
        await supabase
          .from('lead_intents')
          .delete()
          .eq('lead_id', leadId)
          .in('tag', tagsToRemove);
      }

      // Add new tags
      if (tagsToAdd.length > 0) {
        await supabase
          .from('lead_intents')
          .insert(tagsToAdd.map(tag => ({
            lead_id: leadId,
            tag,
            source: 'manual' as const,
            created_by: user?.id || null,
          })));
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-intents', variables.leadId] });
    },
  });
}
