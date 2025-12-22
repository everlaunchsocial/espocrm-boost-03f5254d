import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

export interface FeedbackLeaderboardEntry {
  suggestionText: string;
  helpfulCount: number;
  notHelpfulCount: number;
  totalRatings: number;
  percentHelpful: number;
  lastRatedAt: string;
}

interface UseFeedbackLeaderboardOptions {
  daysBack?: number;
  minRatings?: number;
}

export function useFeedbackLeaderboard(options: UseFeedbackLeaderboardOptions = {}) {
  const { daysBack = 30, minRatings = 1 } = options;

  return useQuery({
    queryKey: ['feedback-leaderboard', daysBack, minRatings],
    queryFn: async (): Promise<FeedbackLeaderboardEntry[]> => {
      const startDate = subDays(new Date(), daysBack).toISOString();

      const { data, error } = await supabase
        .from('follow_up_feedback')
        .select('suggestion_text, feedback, created_at')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Aggregate by suggestion_text
      const aggregated = new Map<string, {
        helpfulCount: number;
        notHelpfulCount: number;
        lastRatedAt: string;
      }>();

      for (const row of data || []) {
        const text = row.suggestion_text;
        const existing = aggregated.get(text) || {
          helpfulCount: 0,
          notHelpfulCount: 0,
          lastRatedAt: row.created_at,
        };

        if (row.feedback === 'helpful') {
          existing.helpfulCount++;
        } else {
          existing.notHelpfulCount++;
        }

        // Track the most recent rating
        if (row.created_at > existing.lastRatedAt) {
          existing.lastRatedAt = row.created_at;
        }

        aggregated.set(text, existing);
      }

      // Convert to array and calculate percentages
      const entries: FeedbackLeaderboardEntry[] = [];
      
      aggregated.forEach((stats, suggestionText) => {
        const totalRatings = stats.helpfulCount + stats.notHelpfulCount;
        
        if (totalRatings >= minRatings) {
          entries.push({
            suggestionText,
            helpfulCount: stats.helpfulCount,
            notHelpfulCount: stats.notHelpfulCount,
            totalRatings,
            percentHelpful: totalRatings > 0 
              ? Math.round((stats.helpfulCount / totalRatings) * 100) 
              : 0,
            lastRatedAt: stats.lastRatedAt,
          });
        }
      });

      // Sort by percent helpful descending, then by total ratings
      entries.sort((a, b) => {
        if (b.percentHelpful !== a.percentHelpful) {
          return b.percentHelpful - a.percentHelpful;
        }
        return b.totalRatings - a.totalRatings;
      });

      return entries;
    },
  });
}
