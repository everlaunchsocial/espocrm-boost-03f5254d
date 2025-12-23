import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeadPrediction {
  id: string;
  lead_id: string;
  predicted_close_probability: number;
  predicted_close_date: string | null;
  predicted_deal_value: number | null;
  predicted_time_to_close_days: number | null;
  prediction_factors: PredictionFactors;
  last_updated: string;
}

export interface PredictionFactors {
  industryCloseRate?: number;
  industry?: string;
  demoViews?: number;
  demoViewBonus?: number;
  emailOpens?: number;
  emailReplies?: number;
  emailBonus?: number;
  leadScore?: number;
  scoreMultiplier?: number;
  daysSinceLastInteraction?: number;
  decayFactor?: number;
  pipelineStatus?: string;
  stageProgress?: number;
  predictedDaysToClose?: number;
  predictedDealValue?: number;
}

export interface PipelineForecast {
  id: string;
  affiliate_id: string | null;
  forecast_date: string;
  forecast_period: 'week' | 'month' | 'quarter';
  predicted_revenue: number;
  confidence_interval_low: number;
  confidence_interval_high: number;
  predicted_closes: number;
  predicted_close_rate: number;
  factors: ForecastFactors;
  actual_revenue: number | null;
  actual_closes: number | null;
  accuracy_score: number | null;
  generated_at: string;
}

export interface ForecastFactors {
  totalLeads?: number;
  hotLeads?: number;
  warmLeads?: number;
  coldLeads?: number;
}

export interface LeadWithPrediction {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  pipeline_status: string;
  industry: string | null;
  prediction?: LeadPrediction;
}

// Fetch all lead predictions
export function useLeadPredictions() {
  return useQuery({
    queryKey: ['lead-predictions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_predictions')
        .select('*')
        .order('predicted_close_probability', { ascending: false });

      if (error) throw error;
      return data as LeadPrediction[];
    },
  });
}

// Fetch prediction for a single lead
export function useLeadPrediction(leadId: string | undefined) {
  return useQuery({
    queryKey: ['lead-prediction', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const { data, error } = await supabase
        .from('lead_predictions')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (error) throw error;
      return data as LeadPrediction | null;
    },
    enabled: !!leadId,
  });
}

// Fetch leads with their predictions
export function useLeadsWithPredictions(limit = 20) {
  return useQuery({
    queryKey: ['leads-with-predictions', limit],
    queryFn: async () => {
      // Fetch leads
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, first_name, last_name, company, pipeline_status, industry')
        .not('pipeline_status', 'in', '("customer_won","lost_closed")')
        .limit(limit);

      if (leadsError) throw leadsError;

      // Fetch predictions for these leads
      const leadIds = (leads || []).map(l => l.id);
      const { data: predictions, error: predsError } = await supabase
        .from('lead_predictions')
        .select('*')
        .in('lead_id', leadIds);

      if (predsError) throw predsError;

      // Combine and sort by probability
      const combined: LeadWithPrediction[] = (leads || []).map((lead) => ({
        ...lead,
        prediction: predictions?.find(p => p.lead_id === lead.id) as LeadPrediction | undefined,
      }));

      return combined.sort((a, b) => {
        const probA = a.prediction?.predicted_close_probability || 0;
        const probB = b.prediction?.predicted_close_probability || 0;
        return probB - probA;
      });
    },
  });
}

// Fetch latest pipeline forecast
export function useLatestForecast(period: 'week' | 'month' | 'quarter' = 'month') {
  return useQuery({
    queryKey: ['latest-forecast', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_forecasts')
        .select('*')
        .eq('forecast_period', period)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PipelineForecast | null;
    },
  });
}

// Fetch forecast history
export function useForecastHistory(period: 'week' | 'month' | 'quarter' = 'month', limit = 12) {
  return useQuery({
    queryKey: ['forecast-history', period, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_forecasts')
        .select('*')
        .eq('forecast_period', period)
        .order('forecast_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as PipelineForecast[];
    },
  });
}

// Generate new forecasts
export function useGenerateForecasts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-forecasts');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-predictions'] });
      queryClient.invalidateQueries({ queryKey: ['leads-with-predictions'] });
      queryClient.invalidateQueries({ queryKey: ['latest-forecast'] });
      queryClient.invalidateQueries({ queryKey: ['forecast-history'] });
    },
  });
}

// Get probability level and styling
export function getProbabilityLevel(probability: number) {
  if (probability >= 0.7) {
    return {
      level: 'hot',
      label: 'Hot',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-300',
      emoji: '🔴',
    };
  } else if (probability >= 0.4) {
    return {
      level: 'warm',
      label: 'Warm',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      borderColor: 'border-orange-300',
      emoji: '🟠',
    };
  } else if (probability >= 0.2) {
    return {
      level: 'lukewarm',
      label: 'Long Shot',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-300',
      emoji: '🟡',
    };
  } else {
    return {
      level: 'cold',
      label: 'Cold',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300',
      emoji: '⚪',
    };
  }
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format percentage
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
