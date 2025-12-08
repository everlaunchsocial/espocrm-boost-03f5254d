import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/types/crm';
import { useCurrentAffiliate } from './useCurrentAffiliate';
import { useUserRole } from './useUserRole';
import { toast } from 'sonner';

// Helper to convert snake_case DB rows to camelCase
const toLead = (row: any): Lead => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  company: row.company,
  title: row.title,
  source: row.source as Lead['source'],
  status: row.status as Lead['status'],
  address: row.address,
  city: row.city,
  state: row.state,
  zipCode: row.zip_code,
  website: row.website,
  serviceCategory: row.service_category,
  industry: row.industry,
  facebookUrl: row.facebook_url,
  instagramHandle: row.instagram_handle,
  googleRating: row.google_rating ? Number(row.google_rating) : undefined,
  googleReviewCount: row.google_review_count,
  hasWebsite: row.has_website,
  notes: row.notes,
  importBatchId: row.import_batch_id,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

/**
 * Hook to fetch leads filtered by affiliate ownership
 * - Affiliates see only their own leads
 * - Admins see all leads
 */
export function useAffiliateLeads() {
  const { affiliateId, isLoading: affiliateLoading } = useCurrentAffiliate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  return useQuery({
    queryKey: ['affiliate-leads', affiliateId, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      // If user is affiliate (not admin), filter by their affiliate_id
      if (!isAdmin && affiliateId) {
        query = query.eq('affiliate_id', affiliateId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map(toLead);
    },
    enabled: !affiliateLoading && !roleLoading,
  });
}

/**
 * Hook to add a lead with automatic affiliate attribution
 */
export function useAddAffiliatedLead() {
  const queryClient = useQueryClient();
  const { affiliateId } = useCurrentAffiliate();

  return useMutation({
    mutationFn: async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'> & { affiliateId?: string }) => {
      // Use provided affiliateId or fall back to current user's affiliate
      const finalAffiliateId = lead.affiliateId || affiliateId || null;

      const { data, error } = await supabase.from('leads').insert({
        first_name: lead.firstName,
        last_name: lead.lastName,
        email: lead.email || null,
        phone: lead.phone,
        company: lead.company,
        title: lead.title,
        source: lead.source,
        status: lead.status,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        zip_code: lead.zipCode,
        website: lead.website,
        service_category: lead.serviceCategory,
        industry: lead.industry,
        facebook_url: lead.facebookUrl,
        instagram_handle: lead.instagramHandle,
        google_rating: lead.googleRating,
        google_review_count: lead.googleReviewCount,
        has_website: lead.hasWebsite,
        notes: lead.notes,
        import_batch_id: lead.importBatchId,
        affiliate_id: finalAffiliateId,
      }).select().single();

      if (error) throw error;

      // Log activity
      await supabase.from('activities').insert({
        type: 'status-change',
        subject: `Lead created: ${lead.firstName} ${lead.lastName}`,
        related_to_type: 'lead',
        related_to_id: data.id,
        related_to_name: `${lead.firstName} ${lead.lastName}`,
        is_system_generated: true,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

/**
 * Hook to get lead count for current affiliate
 */
export function useAffiliateLeadCount() {
  const { affiliateId, isLoading: affiliateLoading } = useCurrentAffiliate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  return useQuery({
    queryKey: ['affiliate-lead-count', affiliateId, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true });

      if (!isAdmin && affiliateId) {
        query = query.eq('affiliate_id', affiliateId);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !affiliateLoading && !roleLoading,
  });
}
