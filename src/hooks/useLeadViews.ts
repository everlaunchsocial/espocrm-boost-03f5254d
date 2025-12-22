import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LeadView {
  viewed_at: string;
  viewer_id: string;
}

export function useLeadViews(leadId: string | undefined) {
  const [lastView, setLastView] = useState<LeadView | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Record view on mount
  useEffect(() => {
    if (!leadId) return;

    const recordView = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('lead_views').insert({
        lead_id: leadId,
        viewer_id: user.id,
      });
    };

    recordView();
  }, [leadId]);

  // Fetch most recent view
  useEffect(() => {
    if (!leadId) {
      setIsLoading(false);
      return;
    }

    const fetchLastView = async () => {
      const { data } = await supabase
        .from('lead_views')
        .select('viewed_at, viewer_id')
        .eq('lead_id', leadId)
        .order('viewed_at', { ascending: false })
        .limit(1)
        .single();

      setLastView(data);
      setIsLoading(false);
    };

    fetchLastView();
  }, [leadId]);

  return { lastView, isLoading };
}
