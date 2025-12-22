import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DemoView {
  id: string;
  demo_id: string;
  lead_id: string;
  progress_percent: number | null;
  watch_duration_seconds: number | null;
  created_at: string;
  updated_at: string;
  demo?: {
    id: string;
    business_name: string;
  };
}

export function useLeadDemoViews(leadId: string) {
  return useQuery({
    queryKey: ['lead-demo-views', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demo_views')
        .select(`
          id,
          demo_id,
          lead_id,
          progress_percent,
          watch_duration_seconds,
          created_at,
          updated_at,
          demos:demo_id (
            id,
            business_name
          )
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DemoView[];
    },
    enabled: !!leadId,
  });
}
