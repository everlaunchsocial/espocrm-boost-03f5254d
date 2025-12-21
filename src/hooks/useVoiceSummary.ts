import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, addDays, format } from 'date-fns';

export interface VoiceSummaryData {
  newLeadsToday: number;
  followUpsDue: { name: string; company?: string }[];
  demosViewed: number;
  appointmentsToday: { name: string; time: string }[];
  notableActivity: { description: string }[];
  textSummary: string;
  voiceScript: string;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export function useVoiceSummary() {
  return useQuery({
    queryKey: ['voice-summary'],
    queryFn: async (): Promise<VoiceSummaryData> => {
      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();
      const next24h = addDays(today, 1).toISOString();

      // Fetch new leads created today
      const { data: leadsToday } = await supabase
        .from('leads')
        .select('id, first_name, last_name, company')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      const newLeadsToday = leadsToday?.length || 0;

      // Fetch tasks due today (follow-ups)
      const { data: tasksDue } = await supabase
        .from('tasks')
        .select('id, name, related_to_name, related_to_type')
        .gte('due_date', todayStart)
        .lte('due_date', todayEnd)
        .neq('status', 'completed');

      const followUpsDue = tasksDue?.map(t => ({
        name: t.related_to_name || t.name,
        company: undefined
      })) || [];

      // Fetch demos viewed today
      const { data: demosViewedToday } = await supabase
        .from('demos')
        .select('id, business_name, view_count, last_viewed_at')
        .gte('last_viewed_at', todayStart)
        .lte('last_viewed_at', todayEnd);

      const demosViewed = demosViewedToday?.length || 0;

      // Fetch upcoming appointments (calendar_bookings in next 24h)
      const { data: bookings } = await supabase
        .from('calendar_bookings')
        .select('id, prospect_name, booking_date, booking_time')
        .gte('booking_date', format(today, 'yyyy-MM-dd'))
        .lte('booking_date', format(addDays(today, 1), 'yyyy-MM-dd'))
        .eq('status', 'confirmed');

      const appointmentsToday = bookings?.filter(b => {
        const bookingDateTime = new Date(`${b.booking_date}T${b.booking_time}`);
        return bookingDateTime >= today && bookingDateTime <= addDays(today, 1);
      }).map(b => ({
        name: b.prospect_name,
        time: b.booking_time
      })) || [];

      // Notable activity - demos with high engagement (viewed 3+ times today)
      const notableActivity: { description: string }[] = [];
      demosViewedToday?.forEach(demo => {
        if (demo.view_count >= 3) {
          notableActivity.push({
            description: `${demo.business_name} viewed your demo ${demo.view_count} times`
          });
        }
      });

      // Recent activities for notable events
      const { data: recentActivities } = await supabase
        .from('activities')
        .select('id, subject, type, related_to_name')
        .gte('created_at', todayStart)
        .order('created_at', { ascending: false })
        .limit(5);

      recentActivities?.forEach(activity => {
        if (activity.type === 'email' && activity.subject?.includes('opened')) {
          notableActivity.push({
            description: `${activity.related_to_name || 'Someone'} ${activity.subject}`
          });
        }
      });

      // Build text summary
      const parts: string[] = [];
      if (newLeadsToday > 0) {
        parts.push(`${newLeadsToday} new lead${newLeadsToday > 1 ? 's' : ''}`);
      }
      if (followUpsDue.length > 0) {
        parts.push(`${followUpsDue.length} follow-up${followUpsDue.length > 1 ? 's' : ''} pending`);
      }
      if (demosViewed > 0) {
        parts.push(`${demosViewed} demo view${demosViewed > 1 ? 's' : ''}`);
      }
      if (appointmentsToday.length > 0) {
        parts.push(`${appointmentsToday.length} appointment${appointmentsToday.length > 1 ? 's' : ''} today`);
      }

      const textSummary = parts.length > 0 
        ? parts.join(', ') + '.'
        : 'No activity to report yet today.';

      // Build voice script
      const voiceParts: string[] = [`${getGreeting()}!`];
      
      if (newLeadsToday > 0) {
        voiceParts.push(`You have ${newLeadsToday} new lead${newLeadsToday > 1 ? 's' : ''} today.`);
      }
      
      if (followUpsDue.length > 0) {
        voiceParts.push(`${followUpsDue.length} follow-up${followUpsDue.length > 1 ? 's are' : ' is'} due:`);
        followUpsDue.slice(0, 3).forEach(f => {
          voiceParts.push(`${f.name}${f.company ? ` from ${f.company}` : ''}.`);
        });
        if (followUpsDue.length > 3) {
          voiceParts.push(`And ${followUpsDue.length - 3} more.`);
        }
      }
      
      if (notableActivity.length > 0) {
        notableActivity.slice(0, 2).forEach(n => {
          voiceParts.push(n.description + '.');
        });
      }
      
      if (appointmentsToday.length > 0) {
        voiceParts.push(`You have ${appointmentsToday.length} appointment${appointmentsToday.length > 1 ? 's' : ''} scheduled.`);
        appointmentsToday.slice(0, 2).forEach(a => {
          voiceParts.push(`${a.name} at ${a.time}.`);
        });
      }

      if (voiceParts.length === 1) {
        voiceParts.push("No urgent items to report. You're all caught up!");
      }

      const voiceScript = voiceParts.join(' ');

      return {
        newLeadsToday,
        followUpsDue,
        demosViewed,
        appointmentsToday,
        notableActivity,
        textSummary,
        voiceScript
      };
    },
    refetchInterval: 60000, // Refetch every minute for real-time updates
  });
}
