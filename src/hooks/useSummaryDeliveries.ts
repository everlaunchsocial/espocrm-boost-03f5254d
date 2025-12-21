import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SummaryDelivery {
  id: string;
  user_id: string;
  delivered_at: string;
  delivery_method: string;
  summary_type: string;
  status: string;
  error_message: string | null;
  summary_content: string | null;
  created_at: string;
}

export function useSummaryDeliveries(userId?: string) {
  const queryClient = useQueryClient();

  const { data: deliveries, isLoading, error } = useQuery({
    queryKey: ['summary-deliveries', userId],
    queryFn: async () => {
      let query = supabase
        .from('summary_deliveries')
        .select('*')
        .order('delivered_at', { ascending: false })
        .limit(20);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SummaryDelivery[];
    },
  });

  const retryDelivery = useMutation({
    mutationFn: async (deliveryId: string) => {
      const { data, error } = await supabase.functions.invoke('retry-voice-summary', {
        body: { delivery_id: deliveryId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Summary retry triggered successfully');
      queryClient.invalidateQueries({ queryKey: ['summary-deliveries'] });
    },
    onError: (error) => {
      toast.error(`Retry failed: ${error.message}`);
    },
  });

  return {
    deliveries: deliveries ?? [],
    isLoading,
    error,
    retryDelivery: retryDelivery.mutate,
    isRetrying: retryDelivery.isPending,
  };
}
