import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeadTag {
  id: string;
  lead_id: string;
  tag_text: string;
  is_ai_generated: boolean;
  created_by: string | null;
  created_at: string;
}

export function useLeadTags(leadId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['lead-tags', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from('lead_tags')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as LeadTag[];
    },
    enabled: !!leadId,
  });

  const addTag = useMutation({
    mutationFn: async (params: { tagText: string; isAiGenerated?: boolean }) => {
      if (!leadId) throw new Error('No lead ID');
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('lead_tags')
        .insert({
          lead_id: leadId,
          tag_text: params.tagText.trim(),
          is_ai_generated: params.isAiGenerated ?? false,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-tags', leadId] });
      queryClient.invalidateQueries({ queryKey: ['all-lead-tags'] });
    },
  });

  const removeTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('lead_tags')
        .delete()
        .eq('id', tagId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-tags', leadId] });
      queryClient.invalidateQueries({ queryKey: ['all-lead-tags'] });
    },
  });

  return { tags, isLoading, addTag, removeTag };
}

// Hook to get all unique tags across all leads for filtering
export function useAllLeadTags() {
  return useQuery({
    queryKey: ['all-lead-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_tags')
        .select('tag_text, is_ai_generated')
        .order('tag_text');
      
      if (error) throw error;
      
      // Get unique tags
      const uniqueTags = new Map<string, { tag_text: string; is_ai_generated: boolean }>();
      data.forEach(tag => {
        if (!uniqueTags.has(tag.tag_text)) {
          uniqueTags.set(tag.tag_text, tag);
        }
      });
      
      return Array.from(uniqueTags.values());
    },
  });
}

// Hook to get leads filtered by tags
export function useLeadsWithTags(selectedTags: string[], filterMode: 'any' | 'all' | 'exclude' = 'any') {
  return useQuery({
    queryKey: ['leads-with-tags', selectedTags, filterMode],
    queryFn: async () => {
      if (selectedTags.length === 0) return [];
      
      const { data, error } = await supabase
        .from('lead_tags')
        .select('lead_id, tag_text')
        .in('tag_text', selectedTags);
      
      if (error) throw error;
      
      // Group by lead_id
      const leadTagMap = new Map<string, string[]>();
      data.forEach(row => {
        const existing = leadTagMap.get(row.lead_id) || [];
        existing.push(row.tag_text);
        leadTagMap.set(row.lead_id, existing);
      });
      
      // Filter based on mode
      const matchingLeadIds: string[] = [];
      leadTagMap.forEach((tags, leadId) => {
        if (filterMode === 'any') {
          matchingLeadIds.push(leadId);
        } else if (filterMode === 'all') {
          if (selectedTags.every(t => tags.includes(t))) {
            matchingLeadIds.push(leadId);
          }
        }
      });
      
      return matchingLeadIds;
    },
    enabled: selectedTags.length > 0,
  });
}

export const SUGGESTED_TAGS = [
  '🟢 Warm Lead',
  '🔴 Not Interested',
  '📞 Call Back',
  '📝 Left Voicemail',
  '✅ Closed',
  '🤝 Met in Person',
  '🔥 Hot Lead',
  '🕓 Follow Up Next Week',
  '❌ Wrong Number',
  '🇪🇸 Spanish Speaker',
];
