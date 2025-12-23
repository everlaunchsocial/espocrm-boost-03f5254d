import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Competitor {
  id: string;
  name: string;
  website: string | null;
  category: 'direct' | 'indirect' | 'alternative_solution';
  strengths: string[];
  weaknesses: string[];
  pricing_info: Record<string, any>;
  last_updated: string;
  created_at: string;
}

export interface CompetitiveMention {
  id: string;
  lead_id: string;
  competitor_id: string;
  mentioned_in: 'call_notes' | 'email' | 'demo_feedback' | 'lost_reason';
  context: string | null;
  sentiment: 'positive' | 'negative' | 'neutral' | null;
  mentioned_at: string;
  mentioned_by: string | null;
  competitor?: Competitor;
}

export interface WinLossAnalysis {
  id: string;
  lead_id: string;
  outcome: 'won' | 'lost';
  competitor_id: string | null;
  primary_reason: string;
  detailed_notes: string | null;
  deal_value: number | null;
  analyzed_at: string;
  analyzed_by: string | null;
  competitor?: Competitor;
}

export interface BattleCardContent {
  competitor_overview?: string;
  our_advantages?: Array<{
    point: string;
    proof?: string;
    how_to_position?: string;
  }>;
  their_advantages?: Array<{
    point: string;
    counter?: string;
    when_to_concede?: string;
  }>;
  landmines?: string[];
  key_differentiators?: string[];
  pricing_comparison?: Record<string, any>;
  trap_questions?: string[];
}

export interface BattleCard {
  id: string;
  competitor_id: string;
  card_content: BattleCardContent;
  version: number;
  last_updated: string;
  auto_generated: boolean;
  competitor?: Competitor;
}

export interface CompetitorWithStats extends Competitor {
  mention_count: number;
  win_rate: number;
  last_mentioned: string | null;
}

// Fetch all competitors
export function useCompetitors() {
  return useQuery({
    queryKey: ['competitors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitors')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Competitor[];
    },
  });
}

// Fetch competitors with stats
export function useCompetitorsWithStats() {
  return useQuery({
    queryKey: ['competitors-with-stats'],
    queryFn: async () => {
      // Fetch competitors
      const { data: competitors, error: compError } = await supabase
        .from('competitors')
        .select('*')
        .order('name');

      if (compError) throw compError;

      // Fetch mentions grouped by competitor
      const { data: mentions } = await supabase
        .from('competitive_mentions')
        .select('competitor_id, mentioned_at');

      // Fetch win/loss data
      const { data: winLoss } = await supabase
        .from('win_loss_analysis')
        .select('competitor_id, outcome');

      // Calculate stats for each competitor
      const competitorsWithStats: CompetitorWithStats[] = (competitors || []).map(comp => {
        const compMentions = mentions?.filter(m => m.competitor_id === comp.id) || [];
        const compWinLoss = winLoss?.filter(w => w.competitor_id === comp.id) || [];
        
        const wins = compWinLoss.filter(w => w.outcome === 'won').length;
        const total = compWinLoss.length;
        const winRate = total > 0 ? (wins / total) * 100 : 0;
        
        const lastMention = compMentions.length > 0
          ? compMentions.sort((a, b) => new Date(b.mentioned_at).getTime() - new Date(a.mentioned_at).getTime())[0].mentioned_at
          : null;

        return {
          id: comp.id,
          name: comp.name,
          website: comp.website,
          category: comp.category as Competitor['category'],
          strengths: comp.strengths || [],
          weaknesses: comp.weaknesses || [],
          pricing_info: comp.pricing_info as Record<string, any>,
          last_updated: comp.last_updated,
          created_at: comp.created_at,
          mention_count: compMentions.length,
          win_rate: Math.round(winRate),
          last_mentioned: lastMention,
        };
      });

      return competitorsWithStats.sort((a, b) => b.mention_count - a.mention_count);
    },
  });
}

// Fetch battle card for a competitor
export function useBattleCard(competitorId: string | undefined) {
  return useQuery({
    queryKey: ['battle-card', competitorId],
    queryFn: async () => {
      if (!competitorId) return null;
      
      const { data, error } = await supabase
        .from('battle_cards')
        .select('*, competitor:competitors(*)')
        .eq('competitor_id', competitorId)
        .maybeSingle();

      if (error) throw error;
      return data as (BattleCard & { competitor: Competitor }) | null;
    },
    enabled: !!competitorId,
  });
}

// Fetch win/loss summary
export function useWinLossSummary(days = 30) {
  return useQuery({
    queryKey: ['win-loss-summary', days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from('win_loss_analysis')
        .select('*, competitor:competitors(name)')
        .gte('analyzed_at', since.toISOString());

      if (error) throw error;

      const analyses = (data || []) as unknown as Array<{
        id: string;
        lead_id: string;
        outcome: 'won' | 'lost';
        competitor_id: string | null;
        primary_reason: string;
        detailed_notes: string | null;
        deal_value: number | null;
        analyzed_at: string;
        competitor: { name: string } | null;
      }>;
      
      const wins = analyses.filter(a => a.outcome === 'won');
      const losses = analyses.filter(a => a.outcome === 'lost');
      
      // Group by reason
      const lossByReason = losses.reduce((acc, a) => {
        const reason = a.competitor ? `Lost to ${a.competitor.name}` : a.primary_reason;
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const winByReason = wins.reduce((acc, a) => {
        acc[a.primary_reason] = (acc[a.primary_reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalWins: wins.length,
        totalLosses: losses.length,
        winRate: analyses.length > 0 ? Math.round((wins.length / analyses.length) * 100) : 0,
        lossByReason,
        winByReason,
        recentAnalyses: analyses.slice(0, 10),
      };
    },
  });
}

// Fetch mentions for a lead
export function useLeadMentions(leadId: string | undefined) {
  return useQuery({
    queryKey: ['lead-mentions', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('competitive_mentions')
        .select('*, competitor:competitors(*)')
        .eq('lead_id', leadId)
        .order('mentioned_at', { ascending: false });

      if (error) throw error;
      return data as (CompetitiveMention & { competitor: Competitor })[];
    },
    enabled: !!leadId,
  });
}

// Add competitive mention
export function useAddMention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mention: {
      lead_id: string;
      competitor_id: string;
      mentioned_in: CompetitiveMention['mentioned_in'];
      context?: string;
      sentiment?: CompetitiveMention['sentiment'];
    }) => {
      const { data, error } = await supabase
        .from('competitive_mentions')
        .insert(mention)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-mentions', variables.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['competitors-with-stats'] });
    },
  });
}

// Record win/loss analysis
export function useRecordWinLoss() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (analysis: {
      lead_id: string;
      outcome: 'won' | 'lost';
      competitor_id?: string | null;
      primary_reason: string;
      detailed_notes?: string;
      deal_value?: number;
    }) => {
      const { data, error } = await supabase
        .from('win_loss_analysis')
        .insert(analysis)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['win-loss-summary'] });
      queryClient.invalidateQueries({ queryKey: ['competitors-with-stats'] });
    },
  });
}

// Win reasons for dropdown
export const WIN_REASONS = [
  'Better features',
  'Better price',
  'Better service',
  'Relationship/Trust',
  'Faster implementation',
  'Better AI technology',
  'Other',
];

// Loss reasons for dropdown
export const LOSS_REASONS = [
  'Price too high',
  'Lost to competitor',
  'Not ready to buy',
  'Bad timing',
  'Chose alternative solution',
  'No decision made',
  'Other',
];

// Get category label
export function getCategoryLabel(category: Competitor['category']): string {
  switch (category) {
    case 'direct': return 'Direct Competitor';
    case 'indirect': return 'Indirect Competitor';
    case 'alternative_solution': return 'Alternative Solution';
    default: return category;
  }
}
