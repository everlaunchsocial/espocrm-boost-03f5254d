import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/types/crm';
import { useCurrentAffiliate } from './useCurrentAffiliate';
import { useUserRole } from './useUserRole';
import { PipelineStatus } from '@/lib/pipelineStatus';

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
  pipelineStatus: (row.pipeline_status || 'new_lead') as Lead['pipelineStatus'],
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
  estimatedValue: row.estimated_value ? Number(row.estimated_value) : undefined,
  probability: row.probability,
  expectedCloseDate: row.expected_close_date ? new Date(row.expected_close_date) : undefined,
  nextAction: row.next_action,
  nextActionDate: row.next_action_date ? new Date(row.next_action_date) : undefined,
  lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at) : undefined,
  lostReason: row.lost_reason,
  sourceDetails: row.source_details,
  stageChangedAt: row.stage_changed_at ? new Date(row.stage_changed_at) : undefined,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

/**
 * Hook to fetch leads for pipeline view
 */
export function usePipelineLeads() {
  const { affiliateId, isLoading: affiliateLoading } = useCurrentAffiliate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  return useQuery({
    queryKey: ['pipeline-leads', affiliateId, isAdmin],
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
 * Hook to update lead pipeline status with history tracking
 */
export function useUpdateLeadPipelineStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      leadId, 
      newStatus, 
      notes,
      lostReason 
    }: { 
      leadId: string; 
      newStatus: PipelineStatus; 
      notes?: string;
      lostReason?: string;
    }) => {
      // Get current lead to track from_stage
      const { data: currentLead, error: fetchError } = await supabase
        .from('leads')
        .select('pipeline_status')
        .eq('id', leadId)
        .single();

      if (fetchError) throw fetchError;

      const fromStage = currentLead?.pipeline_status;

      // Update lead
      const updateData: any = {
        pipeline_status: newStatus,
        stage_changed_at: new Date().toISOString(),
      };

      if (lostReason && newStatus === 'closed_lost') {
        updateData.lost_reason = lostReason;
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId);

      if (updateError) throw updateError;

      // Log stage change in history
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: historyError } = await supabase
        .from('lead_stage_history')
        .insert({
          lead_id: leadId,
          from_stage: fromStage,
          to_stage: newStatus,
          changed_by: user?.id,
          notes: notes || null,
        });

      if (historyError) {
        console.error('Failed to log stage history:', historyError);
        // Don't throw - history is nice to have but not critical
      }

      return { leadId, newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

/**
 * Hook to get pipeline metrics
 */
export function usePipelineMetrics() {
  const { affiliateId, isLoading: affiliateLoading } = useCurrentAffiliate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  return useQuery({
    queryKey: ['pipeline-metrics', affiliateId, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('id, pipeline_status, estimated_value, probability');

      if (!isAdmin && affiliateId) {
        query = query.eq('affiliate_id', affiliateId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calculate metrics
      const totalValue = data.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);
      const weightedValue = data.reduce((sum, lead) => {
        const value = lead.estimated_value || 0;
        const prob = (lead.probability || 0) / 100;
        return sum + (value * prob);
      }, 0);

      const stageCounts: Record<string, number> = {};
      data.forEach(lead => {
        const stage = lead.pipeline_status || 'new_lead';
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      });

      return {
        totalLeads: data.length,
        totalValue,
        weightedValue,
        stageCounts,
      };
    },
    enabled: !affiliateLoading && !roleLoading,
  });
}

/**
 * Hook to get lead stage history
 */
export function useLeadStageHistory(leadId: string | null) {
  return useQuery({
    queryKey: ['lead-stage-history', leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from('lead_stage_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
  });
}
