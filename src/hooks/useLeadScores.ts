import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeadScore {
  id: string;
  lead_id: string;
  overall_score: number;
  engagement_score: number;
  urgency_score: number;
  fit_score: number;
  score_factors: {
    engagement: {
      demo_views: number;
      email_opens: number;
      replies: number;
      days_since_interaction: number;
    };
    urgency: {
      days_in_status: number;
      follow_ups_ignored: number;
      status_type: string;
    };
    fit: {
      industry_match: boolean;
      has_website: boolean;
      has_reviews: boolean;
      review_rating: number | null;
    };
  };
  last_calculated: string;
  created_at: string;
}

export interface ScoreFactorsType {
  engagement: {
    demo_views: number;
    email_opens: number;
    replies: number;
    days_since_interaction: number;
  };
  urgency: {
    days_in_status: number;
    follow_ups_ignored: number;
    status_type: string;
  };
  fit: {
    industry_match: boolean;
    has_website: boolean;
    has_reviews: boolean;
    review_rating: number | null;
  };
}

export interface LeadScoreData {
  id: string;
  overall_score: number;
  engagement_score: number;
  urgency_score: number;
  fit_score: number;
  score_factors: ScoreFactorsType | null;
  last_calculated: string;
}

export interface LeadWithScore {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  pipeline_status: string;
  lead_scores: LeadScoreData | LeadScoreData[] | null;
}

export function useLeadScores() {
  return useQuery({
    queryKey: ['lead-scores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_scores')
        .select('*')
        .order('overall_score', { ascending: false });

      if (error) throw error;
      return data as LeadScore[];
    },
  });
}

export function useLeadScore(leadId: string | undefined) {
  return useQuery({
    queryKey: ['lead-score', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      
      const { data, error } = await supabase
        .from('lead_scores')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (error) throw error;
      return data as LeadScore | null;
    },
    enabled: !!leadId,
  });
}

export function usePriorityLeads(limit = 10) {
  return useQuery({
    queryKey: ['priority-leads', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          company,
          pipeline_status,
          lead_scores (
            id,
            overall_score,
            engagement_score,
            urgency_score,
            fit_score,
            score_factors,
            last_calculated
          )
        `)
        .not('pipeline_status', 'in', '("lost_closed","customer_won")')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter leads that have scores and sort by overall score
      const leadsWithScores = (data || [])
        .filter((lead: any) => {
          const scores = lead.lead_scores;
          // Handle both array and single object returns from Supabase
          return scores && (Array.isArray(scores) ? scores.length > 0 : scores.overall_score !== undefined);
        })
        .map((lead: any) => {
          // Normalize lead_scores to always be an array
          const scores = lead.lead_scores;
          const normalizedScores = Array.isArray(scores) ? scores : [scores];
          return { ...lead, lead_scores: normalizedScores };
        })
        .sort((a: any, b: any) => {
          const scoreA = a.lead_scores[0]?.overall_score || 0;
          const scoreB = b.lead_scores[0]?.overall_score || 0;
          return scoreB - scoreA;
        })
        .slice(0, limit);

      return leadsWithScores as Array<Omit<LeadWithScore, 'lead_scores'> & { lead_scores: LeadScoreData[] }>;
    },
  });
}

export function useRecalculateScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('calculate-lead-scores');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-scores'] });
      queryClient.invalidateQueries({ queryKey: ['priority-leads'] });
    },
  });
}

export function getScoreLevel(score: number): {
  level: 'hot' | 'warm' | 'lukewarm' | 'cold';
  label: string;
  emoji: string;
  colorClass: string;
  bgClass: string;
} {
  if (score >= 80) {
    return {
      level: 'hot',
      label: 'Hot',
      emoji: '🔴',
      colorClass: 'text-destructive',
      bgClass: 'bg-destructive/10',
    };
  }
  if (score >= 60) {
    return {
      level: 'warm',
      label: 'Warm',
      emoji: '🟠',
      colorClass: 'text-warning',
      bgClass: 'bg-warning/10',
    };
  }
  if (score >= 40) {
    return {
      level: 'lukewarm',
      label: 'Lukewarm',
      emoji: '🟡',
      colorClass: 'text-yellow-600',
      bgClass: 'bg-yellow-100',
    };
  }
  return {
    level: 'cold',
    label: 'Cold',
    emoji: '⚪',
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
  };
}
