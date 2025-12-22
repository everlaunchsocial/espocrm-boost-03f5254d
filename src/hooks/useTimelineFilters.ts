import { useState, useMemo, useCallback } from 'react';
import { LeadTimelineEvent } from './useLeadTimeline';
import { subDays, isAfter, parseISO } from 'date-fns';

export type EventTypeFilter = 
  | 'call' 
  | 'voice_call' 
  | 'demo_view' 
  | 'demo_watched' 
  | 'followup' 
  | 'note' 
  | 'email'
  | 'meeting'
  | 'task'
  | 'status-change';

export type DateRangeOption = '7d' | '30d' | 'all' | 'custom';

export interface TimelineFilters {
  eventTypes: Set<EventTypeFilter>;
  dateRange: DateRangeOption;
  customStartDate: Date | null;
  customEndDate: Date | null;
}

const ALL_EVENT_TYPES: EventTypeFilter[] = [
  'call', 'voice_call', 'demo_view', 'demo_watched', 
  'followup', 'note', 'email', 'meeting', 'task', 'status-change'
];

// Group similar event types for UI display
export const EVENT_TYPE_GROUPS = {
  calls: ['call', 'voice_call'] as EventTypeFilter[],
  demos: ['demo_view', 'demo_watched'] as EventTypeFilter[],
  followups: ['followup'] as EventTypeFilter[],
  notes: ['note'] as EventTypeFilter[],
  other: ['email', 'meeting', 'task', 'status-change'] as EventTypeFilter[],
};

export function useTimelineFilters() {
  const [filters, setFilters] = useState<TimelineFilters>({
    eventTypes: new Set(ALL_EVENT_TYPES),
    dateRange: 'all',
    customStartDate: null,
    customEndDate: null,
  });

  const toggleEventTypeGroup = useCallback((groupTypes: EventTypeFilter[]) => {
    setFilters((prev) => {
      const newTypes = new Set(prev.eventTypes);
      const allSelected = groupTypes.every((t) => newTypes.has(t));
      
      if (allSelected) {
        groupTypes.forEach((t) => newTypes.delete(t));
      } else {
        groupTypes.forEach((t) => newTypes.add(t));
      }
      
      return { ...prev, eventTypes: newTypes };
    });
  }, []);

  const setDateRange = useCallback((range: DateRangeOption) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: range,
      ...(range !== 'custom' && { customStartDate: null, customEndDate: null }),
    }));
  }, []);

  const setCustomDateRange = useCallback((start: Date | null, end: Date | null) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: 'custom',
      customStartDate: start,
      customEndDate: end,
    }));
  }, []);

  const isGroupSelected = useCallback((groupTypes: EventTypeFilter[]) => {
    return groupTypes.every((t) => filters.eventTypes.has(t));
  }, [filters.eventTypes]);

  const filterEvents = useCallback((events: LeadTimelineEvent[]): LeadTimelineEvent[] => {
    return events.filter((event) => {
      // Filter by event type
      if (!filters.eventTypes.has(event.event_type as EventTypeFilter)) {
        return false;
      }

      // Filter by date range
      const eventDate = parseISO(event.event_at);
      const now = new Date();

      switch (filters.dateRange) {
        case '7d':
          return isAfter(eventDate, subDays(now, 7));
        case '30d':
          return isAfter(eventDate, subDays(now, 30));
        case 'custom':
          if (filters.customStartDate && !isAfter(eventDate, filters.customStartDate)) {
            return false;
          }
          if (filters.customEndDate && isAfter(eventDate, filters.customEndDate)) {
            return false;
          }
          return true;
        case 'all':
        default:
          return true;
      }
    });
  }, [filters]);

  const resetFilters = useCallback(() => {
    setFilters({
      eventTypes: new Set(ALL_EVENT_TYPES),
      dateRange: 'all',
      customStartDate: null,
      customEndDate: null,
    });
  }, []);

  return {
    filters,
    toggleEventTypeGroup,
    setDateRange,
    setCustomDateRange,
    isGroupSelected,
    filterEvents,
    resetFilters,
  };
}
