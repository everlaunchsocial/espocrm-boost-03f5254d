import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface CallRecording {
  id: string;
  lead_id: string | null;
  caller_id: string | null;
  call_direction: string;
  duration_seconds: number;
  recording_url: string | null;
  transcription_text: string | null;
  transcription_completed_at: string | null;
  ai_analysis: AIAnalysis | null;
  call_quality_score: number | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  lead?: {
    first_name: string;
    last_name: string;
    company: string | null;
  };
}

export interface AIAnalysis {
  summary: string;
  key_topics: string[];
  objections_raised: Array<{
    objection: string;
    timestamp: number;
    how_handled: string;
    recommended_response: string;
  }>;
  buying_signals: Array<{
    signal: string;
    timestamp: number;
    strength: string;
  }>;
  competitor_mentions: string[];
  next_steps_discussed: string[];
  call_outcome: string;
  talk_ratio: {
    rep: number;
    prospect: number;
    ideal: string;
  };
  questions_asked: {
    rep: number;
    prospect: number;
    quality_score: number;
  };
  sentiment_progression: Array<{
    time: number;
    sentiment: number;
  }>;
  strengths: string[];
  weaknesses: string[];
  overall_quality_score: number;
}

export interface CallMoment {
  id: string;
  recording_id: string;
  moment_type: string;
  timestamp_seconds: number;
  transcript_excerpt: string;
  ai_commentary: string | null;
  importance_level: string;
  created_at: string;
}

export interface CoachingInsight {
  id: string;
  recording_id: string;
  affiliate_id: string | null;
  insight_category: string;
  strength_or_weakness: string;
  insight_text: string;
  specific_example: string | null;
  recommendation: string | null;
  created_at: string;
}

// Helper to safely parse ai_analysis from Json
function parseAIAnalysis(json: Json | null): AIAnalysis | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  return json as unknown as AIAnalysis;
}

// Fetch all call recordings
export function useCallRecordings(leadId?: string) {
  return useQuery({
    queryKey: ['call-recordings', leadId],
    queryFn: async () => {
      let query = supabase
        .from('call_recordings')
        .select(`
          *,
          lead:leads(first_name, last_name, company)
        `)
        .order('started_at', { ascending: false });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(row => ({
        ...row,
        ai_analysis: parseAIAnalysis(row.ai_analysis),
      })) as CallRecording[];
    },
  });
}

// Fetch single recording with moments and insights
export function useCallRecordingDetail(recordingId: string | null) {
  return useQuery({
    queryKey: ['call-recording-detail', recordingId],
    queryFn: async () => {
      if (!recordingId) return null;

      const [recordingRes, momentsRes, insightsRes] = await Promise.all([
        supabase
          .from('call_recordings')
          .select(`
            *,
            lead:leads(first_name, last_name, company)
          `)
          .eq('id', recordingId)
          .single(),
        supabase
          .from('call_moments')
          .select('*')
          .eq('recording_id', recordingId)
          .order('timestamp_seconds', { ascending: true }),
        supabase
          .from('coaching_insights')
          .select('*')
          .eq('recording_id', recordingId),
      ]);

      if (recordingRes.error) throw recordingRes.error;

      return {
        recording: {
          ...recordingRes.data,
          ai_analysis: parseAIAnalysis(recordingRes.data.ai_analysis),
        } as CallRecording,
        moments: (momentsRes.data || []) as CallMoment[],
        insights: (insightsRes.data || []) as CoachingInsight[],
      };
    },
    enabled: !!recordingId,
  });
}

// Create a new recording
export function useCreateRecording() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (recording: {
      lead_id?: string;
      caller_id?: string;
      call_direction: string;
      recording_url?: string;
      transcription_text?: string;
      duration_seconds?: number;
      started_at?: string;
      ended_at?: string;
    }) => {
      const { data, error } = await supabase
        .from('call_recordings')
        .insert(recording)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-recordings'] });
    },
  });
}

// Trigger AI analysis for a recording
export function useAnalyzeRecording() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      recordingId,
      transcriptText,
      durationSeconds,
      leadName,
      leadCompany,
    }: {
      recordingId: string;
      transcriptText: string;
      durationSeconds: number;
      leadName?: string;
      leadCompany?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('analyze-call-recording', {
        body: { recordingId, transcriptText, durationSeconds, leadName, leadCompany },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['call-recordings'] });
      queryClient.invalidateQueries({ queryKey: ['call-recording-detail', variables.recordingId] });
    },
  });
}

// Get coaching stats for an affiliate
export function useCoachingStats(affiliateId?: string) {
  return useQuery({
    queryKey: ['coaching-stats', affiliateId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let query = supabase
        .from('call_recordings')
        .select('id, call_quality_score, ai_analysis, duration_seconds')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('call_quality_score', 'is', null);

      if (affiliateId) {
        query = query.eq('caller_id', affiliateId);
      }

      const { data: recordings, error } = await query;
      if (error) throw error;

      const scores = recordings?.map(r => r.call_quality_score).filter(Boolean) as number[];
      const avgScore = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

      // Calculate average talk ratio
      let totalRepTalk = 0;
      let totalProspectTalk = 0;
      let ratioCount = 0;

      for (const r of recordings || []) {
        const analysis = parseAIAnalysis(r.ai_analysis);
        if (analysis?.talk_ratio) {
          totalRepTalk += analysis.talk_ratio.rep;
          totalProspectTalk += analysis.talk_ratio.prospect;
          ratioCount++;
        }
      }

      const avgTalkRatio = ratioCount > 0 
        ? { rep: Math.round(totalRepTalk / ratioCount), prospect: Math.round(totalProspectTalk / ratioCount) }
        : { rep: 50, prospect: 50 };

      return {
        totalCalls: recordings?.length || 0,
        avgQualityScore: avgScore,
        avgTalkRatio,
        recentScores: scores.slice(0, 10),
      };
    },
  });
}

// Utility functions
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getQualityColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
}

export function getOutcomeLabel(outcome: string): string {
  const labels: Record<string, string> = {
    positive: 'Positive',
    negative: 'Negative',
    neutral: 'Neutral',
    follow_up_scheduled: 'Follow-up Scheduled',
    closed_won: 'Closed Won',
    closed_lost: 'Closed Lost',
  };
  return labels[outcome] || outcome;
}

export function getMomentIcon(type: string): string {
  const icons: Record<string, string> = {
    objection: '⚠️',
    buying_signal: '🔥',
    competitor_mention: '🏢',
    question: '❓',
    commitment: '✅',
    concern: '😟',
    interest: '👍',
  };
  return icons[type] || '📌';
}

export function getMomentColor(importance: string): string {
  switch (importance) {
    case 'critical': return 'text-red-500 bg-red-500/10';
    case 'high': return 'text-orange-500 bg-orange-500/10';
    case 'medium': return 'text-yellow-500 bg-yellow-500/10';
    default: return 'text-muted-foreground bg-muted';
  }
}
