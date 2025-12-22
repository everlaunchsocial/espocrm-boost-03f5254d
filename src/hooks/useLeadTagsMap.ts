import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeadTag } from '@/hooks/useLeadTags';

// Hook to get tags for multiple leads at once (for list view)
export function useLeadTagsMap(leadIds: string[]) {
  return useQuery({
    queryKey: ['lead-tags-map', leadIds],
    queryFn: async () => {
      if (leadIds.length === 0) return new Map<string, LeadTag[]>();
      
      const { data, error } = await supabase
        .from('lead_tags')
        .select('*')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Group by lead_id
      const tagsMap = new Map<string, LeadTag[]>();
      (data as LeadTag[]).forEach(tag => {
        const existing = tagsMap.get(tag.lead_id) || [];
        existing.push(tag);
        tagsMap.set(tag.lead_id, existing);
      });
      
      return tagsMap;
    },
    enabled: leadIds.length > 0,
  });
}
