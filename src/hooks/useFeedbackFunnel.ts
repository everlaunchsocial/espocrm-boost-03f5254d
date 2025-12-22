import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

export interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  dropOff: number;
  fill: string;
}

interface UseFeedbackFunnelOptions {
  daysBack?: number;
}

export function useFeedbackFunnel(options: UseFeedbackFunnelOptions = {}) {
  const { daysBack = 30 } = options;

  return useQuery({
    queryKey: ['feedback-funnel', daysBack],
    queryFn: async (): Promise<FunnelStage[]> => {
      const startDate = subDays(new Date(), daysBack).toISOString();

      // Fetch learning log data (accepted + confirmed actions)
      const { data: learningData, error: learningError } = await supabase
        .from('followup_learning_log')
        .select('accepted, confirmed, recorded_at')
        .gte('recorded_at', startDate);

      if (learningError) throw learningError;

      // Fetch feedback data
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('follow_up_feedback')
        .select('id, created_at')
        .gte('created_at', startDate);

      if (feedbackError) throw feedbackError;

      // Count each stage
      const actionsClicked = learningData?.filter(d => d.accepted === true).length || 0;
      const actionsConfirmed = learningData?.filter(d => d.confirmed === true).length || 0;
      const feedbackGiven = feedbackData?.length || 0;

      // For a proper funnel, we want:
      // 1. Actions Clicked (accepted in learning log)
      // 2. Actions Confirmed (confirmed in learning log)
      // 3. Feedback Given (from follow_up_feedback)

      const stages: FunnelStage[] = [
        {
          name: 'Actions Clicked',
          count: actionsClicked,
          percentage: 100,
          dropOff: 0,
          fill: 'hsl(217, 91%, 60%)',
        },
        {
          name: 'Actions Confirmed',
          count: actionsConfirmed,
          percentage: actionsClicked > 0 ? Math.round((actionsConfirmed / actionsClicked) * 100) : 0,
          dropOff: actionsClicked > 0 ? Math.round(((actionsClicked - actionsConfirmed) / actionsClicked) * 100) : 0,
          fill: 'hsl(280, 65%, 60%)',
        },
        {
          name: 'Feedback Given',
          count: feedbackGiven,
          percentage: actionsClicked > 0 ? Math.round((feedbackGiven / actionsClicked) * 100) : 0,
          dropOff: actionsConfirmed > 0 ? Math.round(((actionsConfirmed - feedbackGiven) / actionsConfirmed) * 100) : 0,
          fill: 'hsl(142, 71%, 45%)',
        },
      ];

      return stages;
    },
  });
}
