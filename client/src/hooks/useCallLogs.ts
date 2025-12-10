import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CallLog {
  id: string;
  contactId: string | null;
  leadId: string | null;
  entityType: 'contact' | 'lead';
  transcript: string;
  summary: string | null;
  actionItems: ActionItem[];
  suggestedEmail: SuggestedEmail | null;
  suggestedStatus: string | null;
  durationSeconds: number | null;
  createdAt: Date;
}

export interface ActionItem {
  task: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}

export interface SuggestedEmail {
  subject: string;
  body: string;
}

const toCallLog = (row: any): CallLog => ({
  id: row.id,
  contactId: row.contact_id,
  leadId: row.lead_id,
  entityType: row.entity_type,
  transcript: row.transcript,
  summary: row.summary,
  actionItems: row.action_items || [],
  suggestedEmail: row.suggested_email,
  suggestedStatus: row.suggested_status,
  durationSeconds: row.duration_seconds,
  createdAt: new Date(row.created_at),
});

export function useCallLogs(entityId?: string, entityType?: 'contact' | 'lead') {
  return useQuery({
    queryKey: ['call-logs', entityId, entityType],
    queryFn: async () => {
      let query = supabase
        .from('call_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (entityId && entityType) {
        if (entityType === 'contact') {
          query = query.eq('contact_id', entityId);
        } else {
          query = query.eq('lead_id', entityId);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map(toCallLog);
    },
    enabled: !entityId || (!!entityId && !!entityType),
  });
}

export function useAddCallLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (log: Omit<CallLog, 'id' | 'createdAt'>) => {
      const { data, error } = await supabase.from('call_logs').insert([{
        contact_id: log.contactId,
        lead_id: log.leadId,
        entity_type: log.entityType,
        transcript: log.transcript,
        summary: log.summary,
        action_items: log.actionItems as any,
        suggested_email: log.suggestedEmail as any,
        suggested_status: log.suggestedStatus,
        duration_seconds: log.durationSeconds,
      }]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-logs'] });
    },
  });
}

export function useProcessTranscript() {
  return useMutation({
    mutationFn: async (params: {
      transcript: string;
      entityType: 'contact' | 'lead';
      entityId: string;
      entityName: string;
      company?: string;
      currentStatus: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('process-call-transcript', {
        body: params,
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data as {
        summary: string;
        actionItems: ActionItem[];
        email: SuggestedEmail | null;
        suggestedStatus: string | null;
      };
    },
  });
}
