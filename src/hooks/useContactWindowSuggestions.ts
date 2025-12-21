import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from './useFeatureFlags';

interface TimeWindow {
  day: string;
  timeBlock: string;
  label: string;
  count: number;
}

interface ContactWindowSuggestion {
  primary: TimeWindow | null;
  secondary: TimeWindow | null;
  totalDataPoints: number;
  breakdown: {
    calls: number;
    demoViews: number;
    notes: number;
    activities: number;
  };
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TIME_BLOCKS = [
  { start: 6, end: 9, label: 'Early Morning (6-9 AM)' },
  { start: 9, end: 12, label: 'Morning (9 AM-12 PM)' },
  { start: 12, end: 14, label: 'Midday (12-2 PM)' },
  { start: 14, end: 17, label: 'Afternoon (2-5 PM)' },
  { start: 17, end: 20, label: 'Evening (5-8 PM)' },
  { start: 20, end: 24, label: 'Night (8 PM+)' },
];

function getTimeBlock(hour: number): { block: string; label: string } {
  for (const block of TIME_BLOCKS) {
    if (hour >= block.start && hour < block.end) {
      return { block: `${block.start}-${block.end}`, label: block.label };
    }
  }
  return { block: '0-6', label: 'Late Night' };
}

function formatWindowLabel(day: string, timeBlock: string): string {
  const block = TIME_BLOCKS.find(b => `${b.start}-${b.end}` === timeBlock);
  if (!block) return `${day}`;
  
  const startHour = block.start;
  const endHour = block.end;
  const startLabel = startHour >= 12 ? `${startHour > 12 ? startHour - 12 : 12}${startHour >= 12 ? 'PM' : 'AM'}` : `${startHour}AM`;
  const endLabel = endHour >= 12 ? `${endHour > 12 ? endHour - 12 : 12}${endHour >= 12 ? 'PM' : 'AM'}` : `${endHour}AM`;
  
  return `${day} ${startLabel}–${endLabel}`;
}

export function useContactWindowSuggestions(leadId: string | undefined) {
  const { isEnabled } = useFeatureFlags();
  const phase2Enabled = isEnabled('aiCrmPhase2');

  return useQuery({
    queryKey: ['contact-window-suggestions', leadId],
    queryFn: async (): Promise<ContactWindowSuggestion> => {
      if (!leadId) {
        return { primary: null, secondary: null, totalDataPoints: 0, breakdown: { calls: 0, demoViews: 0, notes: 0, activities: 0 } };
      }

      // Fetch all activity timestamps in parallel
      const [callLogsResult, demoViewsResult, notesResult, activitiesResult] = await Promise.all([
        supabase
          .from('call_logs')
          .select('created_at')
          .eq('lead_id', leadId),
        supabase
          .from('demo_views')
          .select('created_at')
          .eq('lead_id', leadId),
        supabase
          .from('notes')
          .select('created_at')
          .eq('related_to_type', 'lead')
          .eq('related_to_id', leadId),
        supabase
          .from('activities')
          .select('created_at')
          .eq('related_to_type', 'lead')
          .eq('related_to_id', leadId),
      ]);

      const timestamps: Date[] = [];
      const breakdown = {
        calls: 0,
        demoViews: 0,
        notes: 0,
        activities: 0,
      };

      // Collect call logs
      if (callLogsResult.data) {
        callLogsResult.data.forEach(row => {
          timestamps.push(new Date(row.created_at));
          breakdown.calls++;
        });
      }

      // Collect demo views
      if (demoViewsResult.data) {
        demoViewsResult.data.forEach(row => {
          timestamps.push(new Date(row.created_at));
          breakdown.demoViews++;
        });
      }

      // Collect notes
      if (notesResult.data) {
        notesResult.data.forEach(row => {
          timestamps.push(new Date(row.created_at));
          breakdown.notes++;
        });
      }

      // Collect activities
      if (activitiesResult.data) {
        activitiesResult.data.forEach(row => {
          timestamps.push(new Date(row.created_at));
          breakdown.activities++;
        });
      }

      const totalDataPoints = timestamps.length;

      if (totalDataPoints < 3) {
        return { primary: null, secondary: null, totalDataPoints, breakdown };
      }

      // Aggregate by day + time block
      const windowCounts: Record<string, { day: string; timeBlock: string; count: number }> = {};

      timestamps.forEach(ts => {
        const day = DAYS[ts.getDay()];
        const hour = ts.getHours();
        const { block, label } = getTimeBlock(hour);
        const key = `${day}-${block}`;

        if (!windowCounts[key]) {
          windowCounts[key] = { day, timeBlock: block, count: 0 };
        }
        windowCounts[key].count++;
      });

      // Sort by count descending
      const sorted = Object.values(windowCounts).sort((a, b) => b.count - a.count);

      const primary = sorted[0] ? {
        day: sorted[0].day,
        timeBlock: sorted[0].timeBlock,
        label: formatWindowLabel(sorted[0].day, sorted[0].timeBlock),
        count: sorted[0].count,
      } : null;

      const secondary = sorted[1] && sorted[1].count >= 2 ? {
        day: sorted[1].day,
        timeBlock: sorted[1].timeBlock,
        label: formatWindowLabel(sorted[1].day, sorted[1].timeBlock),
        count: sorted[1].count,
      } : null;

      return { primary, secondary, totalDataPoints, breakdown };
    },
    enabled: !!leadId && phase2Enabled,
    staleTime: 60000, // Cache for 1 minute
  });
}
