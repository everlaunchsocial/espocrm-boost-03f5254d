import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LeadTag {
  id: string;
  lead_id: string;
  tag_text: string;
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
    mutationFn: async (tagText: string) => {
      if (!leadId) throw new Error('No lead ID');
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('lead_tags')
        .insert({
          lead_id: leadId,
          tag_text: tagText.trim(),
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-tags', leadId] });
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
    },
  });

  return { tags, isLoading, addTag, removeTag };
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
