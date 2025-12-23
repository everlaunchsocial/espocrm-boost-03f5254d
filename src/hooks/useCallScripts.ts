import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ScriptType = 'cold_call' | 'follow_up' | 'demo_booking' | 'objection_handling' | 'closing';
export type CallOutcome = 'booked' | 'callback' | 'not_interested' | 'no_answer';

export interface ScriptContent {
  opening: string;
  contextReference: string;
  valueProposition: string;
  questions: string[];
  objectionResponses: Record<string, string>;
  closing: string;
  alternativeCloses: string[];
  keyPoints: string[];
}

export interface CallScript {
  id: string;
  lead_id: string;
  script_type: ScriptType;
  script_content: ScriptContent;
  context_used: Record<string, any>;
  generated_at: string;
  used_at: string | null;
  effectiveness_rating: number | null;
  call_outcome: CallOutcome | null;
  created_at: string;
}

export const SCRIPT_TYPE_CONFIG: Record<ScriptType, { label: string; icon: string; description: string }> = {
  cold_call: { label: 'Cold Call', icon: '❄️', description: 'First contact with a new lead' },
  follow_up: { label: 'Follow Up', icon: '🔄', description: 'Continue a previous conversation' },
  demo_booking: { label: 'Demo Booking', icon: '📅', description: 'Schedule a product demo' },
  objection_handling: { label: 'Objection Handling', icon: '🛡️', description: 'Address concerns and objections' },
  closing: { label: 'Closing', icon: '🎯', description: 'Close the deal' },
};

export function useCallScripts(leadId?: string) {
  return useQuery({
    queryKey: ['call-scripts', leadId],
    queryFn: async () => {
      let query = supabase
        .from('call_scripts' as any)
        .select('*')
        .order('generated_at', { ascending: false });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return (data || []) as unknown as CallScript[];
    },
    enabled: true,
  });
}

export function useLatestScript(leadId: string) {
  return useQuery({
    queryKey: ['call-scripts', leadId, 'latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_scripts' as any)
        .select('*')
        .eq('lead_id', leadId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as CallScript | null;
    },
    enabled: !!leadId,
  });
}

export function useGenerateCallScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, scriptType }: { leadId: string; scriptType: ScriptType }) => {
      const { data, error } = await supabase.functions.invoke('generate-call-script', {
        body: { leadId, scriptType },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.script as CallScript;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['call-scripts', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['call-scripts'] });
    },
  });
}

export function useMarkScriptUsed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scriptId: string) => {
      const { error } = await supabase
        .from('call_scripts' as any)
        .update({ used_at: new Date().toISOString() } as any)
        .eq('id', scriptId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-scripts'] });
    },
  });
}

export function useRateScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      scriptId, 
      rating, 
      outcome 
    }: { 
      scriptId: string; 
      rating: number; 
      outcome: CallOutcome;
    }) => {
      const { error } = await supabase
        .from('call_scripts' as any)
        .update({ 
          effectiveness_rating: rating, 
          call_outcome: outcome,
          used_at: new Date().toISOString(),
        } as any)
        .eq('id', scriptId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-scripts'] });
    },
  });
}

export function useRecentScripts(limit = 5) {
  return useQuery({
    queryKey: ['call-scripts', 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_scripts' as any)
        .select(`
          *,
          leads:lead_id (
            first_name,
            last_name,
            company
          )
        `)
        .order('generated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
  });
}
