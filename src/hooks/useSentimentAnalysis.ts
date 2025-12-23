import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

export interface SentimentAnalysis {
  id: string;
  lead_id: string;
  interaction_type: 'email_received' | 'call_notes' | 'sms_received' | 'demo_feedback' | 'notes';
  content_analyzed: string;
  sentiment_score: number;
  sentiment_label: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  emotions_detected: Record<string, number>;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  key_phrases: string[];
  recommended_action: string | null;
  analyzed_at: string;
}

export interface JourneyDataPoint {
  date: string;
  score: number;
  label: string;
  emotion: string;
  interaction_type: string;
}

export interface EmotionalJourney {
  id: string;
  lead_id: string;
  journey_data: JourneyDataPoint[];
  current_emotional_state: string;
  trend: 'improving' | 'declining' | 'stable';
  risk_level: 'none' | 'low' | 'medium' | 'high';
  last_updated: string;
}

export interface LeadWithSentiment {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  latest_sentiment: SentimentAnalysis | null;
  emotional_journey: EmotionalJourney | null;
}

// Fetch sentiment history for a lead
export function useLeadSentimentHistory(leadId: string | undefined) {
  const isEnabled = useFeatureFlags(state => state.isEnabled);

  return useQuery({
    queryKey: ['sentiment-history', leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const { data, error } = await supabase
        .from('sentiment_analysis')
        .select('*')
        .eq('lead_id', leadId)
        .order('analyzed_at', { ascending: false });

      if (error) throw error;
      return data as SentimentAnalysis[];
    },
    enabled: isEnabled('aiCrmPhase4') && !!leadId,
  });
}

// Fetch emotional journey for a lead
export function useEmotionalJourney(leadId: string | undefined) {
  const isEnabled = useFeatureFlags(state => state.isEnabled);

  return useQuery({
    queryKey: ['emotional-journey', leadId],
    queryFn: async () => {
      if (!leadId) return null;

      const { data, error } = await supabase
        .from('emotional_journey')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        journey_data: (Array.isArray(data.journey_data) ? data.journey_data : []) as unknown as JourneyDataPoint[],
      } as EmotionalJourney;
    },
    enabled: isEnabled('aiCrmPhase4') && !!leadId,
  });
}

// Fetch at-risk leads (negative sentiment)
export function useAtRiskLeads() {
  const isEnabled = useFeatureFlags(state => state.isEnabled);

  return useQuery({
    queryKey: ['at-risk-leads'],
    queryFn: async () => {
      // Get leads with high risk emotional journey
      const { data: journeys, error: journeyError } = await supabase
        .from('emotional_journey')
        .select(`
          *,
          leads:lead_id (
            id, first_name, last_name, company
          )
        `)
        .in('risk_level', ['medium', 'high'])
        .order('last_updated', { ascending: false })
        .limit(10);

      if (journeyError) throw journeyError;

      // Get latest sentiment for each
      const leadIds = journeys?.map((j: any) => j.lead_id) || [];
      if (leadIds.length === 0) return [];

      const { data: sentiments, error: sentimentError } = await supabase
        .from('sentiment_analysis')
        .select('*')
        .in('lead_id', leadIds)
        .order('analyzed_at', { ascending: false });

      if (sentimentError) throw sentimentError;

      // Combine data
      return journeys?.map((j: any) => {
        const latestSentiment = sentiments?.find((s: any) => s.lead_id === j.lead_id);
        return {
          id: j.leads?.id,
          first_name: j.leads?.first_name,
          last_name: j.leads?.last_name,
          company: j.leads?.company,
          latest_sentiment: latestSentiment || null,
          emotional_journey: j,
        };
      }).filter((l: any) => l.id) as LeadWithSentiment[];
    },
    enabled: isEnabled('aiCrmPhase4'),
    staleTime: 30000,
  });
}

// Fetch hot leads (positive sentiment)
export function useHotLeads() {
  const isEnabled = useFeatureFlags(state => state.isEnabled);

  return useQuery({
    queryKey: ['hot-leads'],
    queryFn: async () => {
      // Get recent positive sentiments
      const { data: sentiments, error } = await supabase
        .from('sentiment_analysis')
        .select(`
          *,
          leads:lead_id (
            id, first_name, last_name, company
          )
        `)
        .gte('sentiment_score', 0.5)
        .order('analyzed_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get unique leads
      const uniqueLeads = new Map();
      sentiments?.forEach((s: any) => {
        if (s.leads && !uniqueLeads.has(s.lead_id)) {
          uniqueLeads.set(s.lead_id, {
            id: s.leads.id,
            first_name: s.leads.first_name,
            last_name: s.leads.last_name,
            company: s.leads.company,
            latest_sentiment: s,
            emotional_journey: null,
          });
        }
      });

      return Array.from(uniqueLeads.values()) as LeadWithSentiment[];
    },
    enabled: isEnabled('aiCrmPhase4'),
    staleTime: 30000,
  });
}

// Analyze sentiment mutation
export function useAnalyzeSentiment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      content,
      interactionType,
    }: {
      leadId: string;
      content: string;
      interactionType: SentimentAnalysis['interaction_type'];
    }) => {
      const { data, error } = await supabase.functions.invoke('analyze-sentiment', {
        body: { leadId, content, interactionType },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sentiment-history', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['emotional-journey', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['at-risk-leads'] });
      queryClient.invalidateQueries({ queryKey: ['hot-leads'] });
    },
  });
}

// Utility functions
export function getSentimentEmoji(label: string): string {
  switch (label) {
    case 'very_positive': return '😊';
    case 'positive': return '🙂';
    case 'neutral': return '😐';
    case 'negative': return '😕';
    case 'very_negative': return '😟';
    default: return '😐';
  }
}

export function getSentimentColor(score: number): string {
  if (score >= 0.5) return 'text-green-500';
  if (score >= 0.2) return 'text-green-400';
  if (score >= -0.2) return 'text-yellow-500';
  if (score >= -0.5) return 'text-orange-500';
  return 'text-red-500';
}

export function getUrgencyBadgeVariant(urgency: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (urgency) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
}

export function getTrendIcon(trend: string): string {
  switch (trend) {
    case 'improving': return '↑';
    case 'declining': return '↓';
    default: return '→';
  }
}

export function getRiskColor(risk: string): string {
  switch (risk) {
    case 'high': return 'text-red-500';
    case 'medium': return 'text-orange-500';
    case 'low': return 'text-yellow-500';
    default: return 'text-green-500';
  }
}
