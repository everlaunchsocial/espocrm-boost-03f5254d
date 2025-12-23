import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ScheduledFollowUp {
  id: string;
  suggestionId: string;
  leadId: string;
  actionType: 'email' | 'sms' | 'call_reminder';
  scheduledFor: Date;
  sentAt: Date | null;
  cancelledAt: Date | null;
  autoApproved: boolean;
  messageSubject: string | null;
  messageBody: string | null;
  createdBy: string;
  createdAt: Date;
}

interface CreateScheduledFollowUpParams {
  suggestionId: string;
  leadId: string;
  actionType: 'email' | 'sms' | 'call_reminder';
  scheduledFor: Date;
  autoApproved?: boolean;
  messageSubject?: string;
  messageBody?: string;
}

function toScheduledFollowUp(row: any): ScheduledFollowUp {
  return {
    id: row.id,
    suggestionId: row.suggestion_id,
    leadId: row.lead_id,
    actionType: row.action_type,
    scheduledFor: new Date(row.scheduled_for),
    sentAt: row.sent_at ? new Date(row.sent_at) : null,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
    autoApproved: row.auto_approved,
    messageSubject: row.message_subject,
    messageBody: row.message_body,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
  };
}

export function useScheduledFollowUps(leadId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['scheduled-follow-ups', leadId],
    queryFn: async () => {
      let queryBuilder = supabase
        .from('scheduled_follow_ups')
        .select('*')
        .is('cancelled_at', null)
        .order('scheduled_for', { ascending: true });

      if (leadId) {
        queryBuilder = queryBuilder.eq('lead_id', leadId);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      return (data || []).map(toScheduledFollowUp);
    },
    refetchInterval: 30000, // Refetch every 30 seconds to update countdowns
  });

  const scheduleFollowUp = useMutation({
    mutationFn: async (params: CreateScheduledFollowUpParams) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Safety check: Max 3 auto-sends per lead per week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { count } = await supabase
        .from('scheduled_follow_ups')
        .select('*', { count: 'exact', head: true })
        .eq('lead_id', params.leadId)
        .gte('created_at', weekAgo.toISOString())
        .is('cancelled_at', null);

      if (count && count >= 3) {
        throw new Error('Maximum 3 scheduled follow-ups per lead per week');
      }

      // Safety check: 24h gap between auto-sends
      const dayAgo = new Date();
      dayAgo.setHours(dayAgo.getHours() - 24);
      
      const { data: recentSends } = await supabase
        .from('scheduled_follow_ups')
        .select('id')
        .eq('lead_id', params.leadId)
        .is('cancelled_at', null)
        .or(`sent_at.gte.${dayAgo.toISOString()},scheduled_for.gte.${dayAgo.toISOString()}`)
        .limit(1);

      if (recentSends && recentSends.length > 0) {
        throw new Error('Must wait 24 hours between auto-sends to the same lead');
      }

      const { data, error } = await supabase
        .from('scheduled_follow_ups')
        .insert({
          suggestion_id: params.suggestionId,
          lead_id: params.leadId,
          action_type: params.actionType,
          scheduled_for: params.scheduledFor.toISOString(),
          auto_approved: params.autoApproved ?? true,
          message_subject: params.messageSubject,
          message_body: params.messageBody,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return toScheduledFollowUp(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-follow-ups'] });
      toast.success('Follow-up scheduled');
    },
    onError: (error) => {
      toast.error('Failed to schedule', { description: error.message });
    },
  });

  const cancelScheduledFollowUp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_follow_ups')
        .update({ cancelled_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-follow-ups'] });
      toast.success('Scheduled follow-up cancelled');
    },
    onError: (error) => {
      toast.error('Failed to cancel', { description: error.message });
    },
  });

  const cancelAllForLead = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('scheduled_follow_ups')
        .update({ cancelled_at: new Date().toISOString() })
        .eq('lead_id', leadId)
        .is('sent_at', null)
        .is('cancelled_at', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-follow-ups'] });
      toast.success('All scheduled follow-ups cancelled');
    },
  });

  // Helper to check if a suggestion is already scheduled
  const isScheduled = (suggestionId: string): boolean => {
    return (query.data || []).some(
      (s) => s.suggestionId === suggestionId && !s.sentAt && !s.cancelledAt
    );
  };

  // Get scheduled item for a suggestion
  const getScheduledItem = (suggestionId: string): ScheduledFollowUp | undefined => {
    return (query.data || []).find(
      (s) => s.suggestionId === suggestionId && !s.sentAt && !s.cancelledAt
    );
  };

  return {
    scheduledFollowUps: query.data || [],
    isLoading: query.isLoading,
    scheduleFollowUp,
    cancelScheduledFollowUp,
    cancelAllForLead,
    isScheduled,
    getScheduledItem,
  };
}

// Hook for auto-send mode preferences (session-based)
import { create } from 'zustand';

interface AutoSendModeStore {
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  autoApprovedSuggestions: Set<string>;
  toggleAutoApprove: (suggestionId: string) => void;
  isAutoApproved: (suggestionId: string) => boolean;
  pauseAllAutoSends: boolean;
  setPauseAllAutoSends: (paused: boolean) => void;
  hasSeenFirstUseModal: boolean;
  setHasSeenFirstUseModal: (seen: boolean) => void;
}

export const useAutoSendMode = create<AutoSendModeStore>((set, get) => ({
  isEnabled: false,
  setEnabled: (enabled) => set({ isEnabled: enabled }),
  autoApprovedSuggestions: new Set(),
  toggleAutoApprove: (suggestionId) => {
    const current = get().autoApprovedSuggestions;
    const newSet = new Set(current);
    if (newSet.has(suggestionId)) {
      newSet.delete(suggestionId);
    } else {
      newSet.add(suggestionId);
    }
    set({ autoApprovedSuggestions: newSet });
  },
  isAutoApproved: (suggestionId) => get().autoApprovedSuggestions.has(suggestionId),
  pauseAllAutoSends: false,
  setPauseAllAutoSends: (paused) => set({ pauseAllAutoSends: paused }),
  hasSeenFirstUseModal: false,
  setHasSeenFirstUseModal: (seen) => set({ hasSeenFirstUseModal: seen }),
}));