import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface EnrichmentResult {
  placeId: string;
  businessStatus: string;
  rating: number;
  reviewCount: number;
  address: string;
  phone: string;
  website: string;
  types: string[];
  photosCount: number;
}

export function useLeadEnrichment() {
  const [isEnriching, setIsEnriching] = useState(false);
  const queryClient = useQueryClient();

  const enrichLead = async (leadId: string): Promise<EnrichmentResult | null> => {
    setIsEnriching(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('enrich-lead-google', {
        body: { leadId }
      });

      if (error) {
        console.error('Enrichment error:', error);
        toast.error('Failed to enrich lead: ' + error.message);
        return null;
      }

      if (data.error) {
        console.error('Enrichment error:', data.error);
        toast.error(data.error);
        return null;
      }

      // Invalidate leads query to refresh data
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-leads'] });
      
      toast.success('Lead enriched with Google Places data');
      return data.enrichedData;
    } catch (err) {
      console.error('Enrichment error:', err);
      toast.error('Failed to enrich lead');
      return null;
    } finally {
      setIsEnriching(false);
    }
  };

  return { enrichLead, isEnriching };
}
