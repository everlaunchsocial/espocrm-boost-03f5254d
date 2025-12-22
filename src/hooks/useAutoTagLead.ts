import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function useAutoTagLead() {
  const queryClient = useQueryClient();
  const pendingLeads = useRef<Set<string>>(new Set());

  const autoTag = useCallback(async (leadId: string) => {
    // Prevent duplicate calls for the same lead
    if (pendingLeads.current.has(leadId)) {
      return;
    }

    pendingLeads.current.add(leadId);

    try {
      const { data, error } = await supabase.functions.invoke('auto-assign-lead-tags', {
        body: { leadId },
      });

      if (error) {
        console.error('Auto-tag error:', error);
        return;
      }

      // Invalidate tags query if tags were changed
      if (data?.tagsAdded?.length > 0 || data?.tagsRemoved > 0) {
        queryClient.invalidateQueries({ queryKey: ['lead-tags', leadId] });
      }

      return data;
    } catch (err) {
      console.error('Failed to auto-tag lead:', err);
    } finally {
      pendingLeads.current.delete(leadId);
    }
  }, [queryClient]);

  return { autoTag };
}
