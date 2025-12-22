import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type FeedbackType = 'helpful' | 'not_helpful';

interface FollowUpFeedback {
  id: string;
  lead_id: string;
  suggestion_key: string;
  suggestion_text: string;
  user_id: string | null;
  feedback: FeedbackType;
  created_at: string;
}

/**
 * Hook to manage follow-up suggestion feedback (thumbs up/down).
 */
export function useFollowUpFeedback() {
  const queryClient = useQueryClient();

  // Fetch all feedback entries
  const { data: feedbackEntries = [], isLoading } = useQuery({
    queryKey: ['follow-up-feedback'],
    queryFn: async (): Promise<FollowUpFeedback[]> => {
      const { data, error } = await supabase
        .from('follow_up_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as FollowUpFeedback[];
    },
  });

  // Create a map for quick lookup by suggestion_key
  const feedbackMap = new Map(
    feedbackEntries.map(f => [f.suggestion_key, f.feedback])
  );

  // Submit feedback mutation
  const submitFeedback = useMutation({
    mutationFn: async ({
      suggestionKey,
      leadId,
      suggestionText,
      feedback,
    }: {
      suggestionKey: string;
      leadId: string;
      suggestionText: string;
      feedback: FeedbackType;
    }) => {
      const { data, error } = await supabase
        .from('follow_up_feedback')
        .insert({
          suggestion_key: suggestionKey,
          lead_id: leadId,
          suggestion_text: suggestionText,
          feedback,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-feedback'] });
      toast.success('Thanks for your feedback');
    },
    onError: (error) => {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    },
  });

  const hasFeedback = (suggestionKey: string) => feedbackMap.has(suggestionKey);
  const getFeedback = (suggestionKey: string) => feedbackMap.get(suggestionKey);

  return {
    feedbackEntries,
    isLoading,
    hasFeedback,
    getFeedback,
    submitFeedback,
  };
}
