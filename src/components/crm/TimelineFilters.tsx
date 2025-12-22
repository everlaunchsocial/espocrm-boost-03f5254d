import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  TimelineFilters as FiltersType, 
  DateRangeOption,
  EVENT_TYPE_GROUPS,
  EventTypeFilter 
} from '@/hooks/useTimelineFilters';

interface TimelineFiltersProps {
  filters: FiltersType;
  toggleEventTypeGroup: (groupTypes: EventTypeFilter[]) => void;
  setDateRange: (range: DateRangeOption) => void;
  setCustomDateRange: (start: Date | null, end: Date | null) => void;
  isGroupSelected: (groupTypes: EventTypeFilter[]) => boolean;
  resetFilters: () => void;
}

export function TimelineFilters({
  filters,
  toggleEventTypeGroup,
  setDateRange,
  setCustomDateRange,
  isGroupSelected,
  resetFilters,
}: TimelineFiltersProps) {
  const [customDateOpen, setCustomDateOpen] = useState(false);

  const hasActiveFilters = 
    filters.dateRange !== 'all' || 
    !Object.values(EVENT_TYPE_GROUPS).every(group => isGroupSelected(group));

  return (
    <div className="flex flex-col gap-3 p-3 bg-muted/30 rounded-lg border border-border mb-4">
      {/* Event Type Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Filter className="h-3 w-3" />
          Filter:
        </span>
        
        <label className="flex items-center gap-1.5 cursor-pointer">
          <Checkbox
            checked={isGroupSelected(EVENT_TYPE_GROUPS.calls)}
            onCheckedChange={() => toggleEventTypeGroup(EVENT_TYPE_GROUPS.calls)}
            className="h-4 w-4"
          />
          <span className="text-sm">Calls</span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <Checkbox
            checked={isGroupSelected(EVENT_TYPE_GROUPS.demos)}
            onCheckedChange={() => toggleEventTypeGroup(EVENT_TYPE_GROUPS.demos)}
            className="h-4 w-4"
          />
          <span className="text-sm">Demos</span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <Checkbox
            checked={isGroupSelected(EVENT_TYPE_GROUPS.notes)}
            onCheckedChange={() => toggleEventTypeGroup(EVENT_TYPE_GROUPS.notes)}
            className="h-4 w-4"
          />
          <span className="text-sm">Notes</span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <Checkbox
            checked={isGroupSelected(EVENT_TYPE_GROUPS.followups)}
            onCheckedChange={() => toggleEventTypeGroup(EVENT_TYPE_GROUPS.followups)}
            className="h-4 w-4"
          />
          <span className="text-sm">Follow-Ups</span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <Checkbox
            checked={isGroupSelected(EVENT_TYPE_GROUPS.email)}
            onCheckedChange={() => toggleEventTypeGroup(EVENT_TYPE_GROUPS.email)}
            className="h-4 w-4"
          />
          <span className="text-sm">Email</span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <Checkbox
            checked={isGroupSelected(EVENT_TYPE_GROUPS.other)}
            onCheckedChange={() => toggleEventTypeGroup(EVENT_TYPE_GROUPS.other)}
            className="h-4 w-4"
          />
          <span className="text-sm">Other</span>
        </label>
      </div>

      {/* Date Range Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Date:</span>
        
        <div className="flex items-center gap-1 bg-background rounded-md p-0.5 border border-border">
          <Button
            variant={filters.dateRange === '7d' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setDateRange('7d')}
          >
            7 Days
          </Button>
          <Button
            variant={filters.dateRange === '30d' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setDateRange('30d')}
          >
            30 Days
          </Button>
          <Button
            variant={filters.dateRange === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setDateRange('all')}
          >
            All
          </Button>
          
          <Popover open={customDateOpen} onOpenChange={setCustomDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={filters.dateRange === 'custom' ? 'secondary' : 'ghost'}
                size="sm"
                className={cn("h-7 px-2 text-xs", filters.dateRange === 'custom' && "gap-1")}
              >
                <CalendarIcon className="h-3 w-3" />
                {filters.dateRange === 'custom' && filters.customStartDate && filters.customEndDate ? (
                  <span>
                    {format(filters.customStartDate, 'MMM d')} - {format(filters.customEndDate, 'MMM d')}
                  </span>
                ) : (
                  <span>Custom</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{
                  from: filters.customStartDate || undefined,
                  to: filters.customEndDate || undefined,
                }}
                onSelect={(range) => {
                  setCustomDateRange(range?.from || null, range?.to || null);
                  if (range?.from && range?.to) {
                    setCustomDateOpen(false);
                  }
                }}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={resetFilters}
          >
            <X className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
