import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CallOutcomeType = 
  | 'connected' 
  | 'no_answer' 
  | 'voicemail_left' 
  | 'callback_requested' 
  | 'answering_machine' 
  | 'inconclusive';

export interface CallOutcomeResult {
  outcome: CallOutcomeType;
  confidence: number;
  reason: string;
  cached?: boolean;
}

export const CALL_OUTCOME_CONFIG: Record<CallOutcomeType, { label: string; icon: string; color: string }> = {
  connected: { label: 'Connected', icon: '📞', color: 'text-green-600' },
  no_answer: { label: 'No Answer', icon: '🚫', color: 'text-red-500' },
  voicemail_left: { label: 'Voicemail Left', icon: '📩', color: 'text-blue-500' },
  callback_requested: { label: 'Call Back Requested', icon: '🔔', color: 'text-amber-500' },
  answering_machine: { label: 'Answering Machine', icon: '🤖', color: 'text-purple-500' },
  inconclusive: { label: 'Inconclusive', icon: '❓', color: 'text-muted-foreground' },
};

export function useClassifyCallOutcome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { 
      callLogId: string; 
      transcript?: string; 
      durationSeconds?: number;
      forceRefresh?: boolean;
    }): Promise<CallOutcomeResult> => {
      const { data, error } = await supabase.functions.invoke('classify-call-outcome', {
        body: params,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data as CallOutcomeResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-logs'] });
    },
  });
}

export function useCallOutcomeDisplay(outcome?: string | null) {
  if (!outcome) return null;
  
  const config = CALL_OUTCOME_CONFIG[outcome as CallOutcomeType];
  return config || CALL_OUTCOME_CONFIG.inconclusive;
}

export function formatCallOutcome(outcome: CallOutcomeType, durationSeconds?: number | null): string {
  const config = CALL_OUTCOME_CONFIG[outcome];
  const durationStr = durationSeconds 
    ? ` (${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s)`
    : '';
  
  return `${config.icon} ${config.label}${durationStr}`;
}
