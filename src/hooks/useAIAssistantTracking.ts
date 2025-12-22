import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SessionData {
  id: string;
  startedAt: Date;
}

export function useAIAssistantTracking() {
  const sessionRef = useRef<SessionData | null>(null);
  const actionStartTimeRef = useRef<number | null>(null);

  const startSessionTracking = useCallback(async (
    userRole: string | null,
    pageRoute: string,
    voiceSettings?: Record<string, any>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('ai_assistant_sessions')
        .insert({
          user_id: user.id,
          user_role: userRole,
          page_route: pageRoute,
          voice_settings: voiceSettings || {}
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error starting session tracking:', error);
        return null;
      }

      sessionRef.current = {
        id: data.id,
        startedAt: new Date()
      };

      return data.id;
    } catch (error) {
      console.error('Error in startSessionTracking:', error);
      return null;
    }
  }, []);

  const endSessionTracking = useCallback(async (actionsCount: number, errorsCount: number) => {
    if (!sessionRef.current) return;

    try {
      const durationSeconds = Math.round(
        (Date.now() - sessionRef.current.startedAt.getTime()) / 1000
      );

      await supabase
        .from('ai_assistant_sessions')
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
          actions_count: actionsCount,
          errors_count: errorsCount
        })
        .eq('id', sessionRef.current.id);

      sessionRef.current = null;
    } catch (error) {
      console.error('Error ending session tracking:', error);
    }
  }, []);

  const trackActionStart = useCallback(() => {
    actionStartTimeRef.current = Date.now();
  }, []);

  const trackAction = useCallback(async (
    actionType: string,
    parameters: Record<string, any>,
    success: boolean,
    errorMessage?: string,
    userTranscript?: string,
    aiResponse?: string
  ) => {
    if (!sessionRef.current) return;

    try {
      const responseTimeMs = actionStartTimeRef.current
        ? Date.now() - actionStartTimeRef.current
        : null;

      await supabase
        .from('ai_assistant_actions')
        .insert({
          session_id: sessionRef.current.id,
          action_type: actionType,
          parameters,
          success,
          error_message: errorMessage,
          response_time_ms: responseTimeMs,
          user_transcript: userTranscript,
          ai_response: aiResponse
        });

      actionStartTimeRef.current = null;
    } catch (error) {
      console.error('Error tracking action:', error);
    }
  }, []);

  const getSessionId = useCallback(() => {
    return sessionRef.current?.id || null;
  }, []);

  return {
    startSessionTracking,
    endSessionTracking,
    trackActionStart,
    trackAction,
    getSessionId
  };
}
