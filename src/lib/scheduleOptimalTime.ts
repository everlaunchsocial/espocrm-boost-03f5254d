/**
 * Calculates the next optimal time to send a follow-up based on contact window data.
 * 
 * Rules:
 * - Uses ML-learned patterns if available (highest priority)
 * - Uses suggested contact windows if available (best_day, best_time from Phase 2)
 * - Defaults to next business day 2-5pm if no data
 * - Respects lead's quiet_mode flag
 * - Skips weekends unless lead has weekend activity history
 * - Never schedules during 9pm-8am local time
 * - Minimum 1 hour from now
 */

interface ContactWindowData {
  primary: { day: string; timeBlock: string } | null;
  secondary: { day: string; timeBlock: string } | null;
  hasWeekendActivity?: boolean;
}

// ML-learned patterns from the leads table
export interface LearnedPatterns {
  learned_best_days: string[] | null;
  learned_best_times: string[] | null;
  learned_optimal_gap_hours: number | null;
  learned_channel_preference: string | null;
  learning_confidence: number | null;
}

const DAYS_MAP: Record<string, number> = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6,
};

const TIME_BLOCK_HOURS: Record<string, { start: number; end: number }> = {
  '6-9': { start: 8, end: 9 },      // Use 8am for early morning
  '9-12': { start: 10, end: 11 },   // Use 10am for morning
  '12-14': { start: 13, end: 14 },  // Use 1pm for midday
  '14-17': { start: 15, end: 16 },  // Use 3pm for afternoon
  '17-20': { start: 17, end: 18 },  // Use 5pm for evening
  '20-24': { start: 20, end: 20 },  // Cap at 8pm for night
  // ML time slot formats
  '8am-12pm': { start: 10, end: 11 },
  '12pm-2pm': { start: 13, end: 14 },
  '2pm-5pm': { start: 15, end: 16 },
  '5pm-8pm': { start: 17, end: 18 },
};

function isWeekend(dayOfWeek: number): boolean {
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function getNextDayOfWeek(targetDay: number, fromDate: Date = new Date()): Date {
  const result = new Date(fromDate);
  const currentDay = result.getDay();
  const daysUntilTarget = (targetDay - currentDay + 7) % 7;
  
  // If target is today, check if we still have time
  if (daysUntilTarget === 0) {
    // Will be handled by time logic below
    return result;
  }
  
  result.setDate(result.getDate() + (daysUntilTarget || 7));
  return result;
}

function getNextBusinessDay(fromDate: Date): Date {
  const result = new Date(fromDate);
  result.setDate(result.getDate() + 1);
  
  while (isWeekend(result.getDay())) {
    result.setDate(result.getDate() + 1);
  }
  
  return result;
}

export function calculateOptimalSendTime(
  contactWindow?: ContactWindowData | null,
  options?: {
    leadQuietMode?: boolean;
    hasWeekendActivity?: boolean;
    timezone?: string;
    learnedPatterns?: LearnedPatterns | null;
  }
): Date {
  const now = new Date();
  const minimumSendTime = new Date(now.getTime() + 60 * 60 * 1000); // At least 1 hour from now

  // If quiet mode, don't schedule at all (caller should handle this)
  if (options?.leadQuietMode) {
    // Return a far future date as a signal
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 1);
    return farFuture;
  }

  let targetDate: Date;
  let targetHour: number;

  // Priority 1: Use ML-learned patterns if available and confident (>= 60%)
  const learnedPatterns = options?.learnedPatterns;
  if (learnedPatterns && 
      learnedPatterns.learning_confidence && 
      learnedPatterns.learning_confidence >= 60 &&
      learnedPatterns.learned_best_days?.length &&
      learnedPatterns.learned_best_times?.length) {
    
    const bestDay = learnedPatterns.learned_best_days[0];
    const bestTimeSlot = learnedPatterns.learned_best_times[0];
    const targetDayNum = DAYS_MAP[bestDay];
    const timeBlock = TIME_BLOCK_HOURS[bestTimeSlot];

    if (targetDayNum !== undefined && timeBlock) {
      // Skip weekends unless lead has weekend activity
      if (isWeekend(targetDayNum) && !options?.hasWeekendActivity) {
        // Try second best day if available
        if (learnedPatterns.learned_best_days.length > 1) {
          const secondDay = learnedPatterns.learned_best_days[1];
          const secondDayNum = DAYS_MAP[secondDay];
          if (secondDayNum !== undefined && !isWeekend(secondDayNum)) {
            targetDate = getNextDayOfWeek(secondDayNum, now);
            targetHour = timeBlock.start;
          } else {
            targetDate = getNextBusinessDay(now);
            targetHour = timeBlock.start;
          }
        } else {
          targetDate = getNextBusinessDay(now);
          targetHour = timeBlock.start;
        }
      } else {
        targetDate = getNextDayOfWeek(targetDayNum, now);
        targetHour = timeBlock.start;
      }

      // Apply optimal gap if the scheduled time is less than the gap from now
      if (learnedPatterns.learned_optimal_gap_hours) {
        const gapMs = learnedPatterns.learned_optimal_gap_hours * 60 * 60 * 1000;
        const minTimeWithGap = new Date(now.getTime() + gapMs);
        if (targetDate < minTimeWithGap) {
          targetDate = minTimeWithGap;
          // Adjust to valid hour if needed
          if (targetDate.getHours() < 8) {
            targetDate.setHours(10, 0, 0, 0);
          } else if (targetDate.getHours() >= 21) {
            targetDate.setDate(targetDate.getDate() + 1);
            targetDate.setHours(10, 0, 0, 0);
          }
        }
      }

      // Set the target time and apply safety checks
      targetDate.setHours(targetHour, 0, 0, 0);
      return applySafetyChecks(targetDate, minimumSendTime, now, options?.hasWeekendActivity);
    }
  }

  // Priority 2: Use contact window data from Phase 2
  if (contactWindow?.primary) {
    // Use the primary contact window
    const targetDayNum = DAYS_MAP[contactWindow.primary.day];
    const timeBlock = TIME_BLOCK_HOURS[contactWindow.primary.timeBlock];
    
    if (targetDayNum !== undefined && timeBlock) {
      // Skip weekends unless lead has weekend activity
      if (isWeekend(targetDayNum) && !options?.hasWeekendActivity) {
        // Fall back to secondary or default
        if (contactWindow.secondary) {
          const secondaryDayNum = DAYS_MAP[contactWindow.secondary.day];
          const secondaryTimeBlock = TIME_BLOCK_HOURS[contactWindow.secondary.timeBlock];
          
          if (secondaryDayNum !== undefined && !isWeekend(secondaryDayNum) && secondaryTimeBlock) {
            targetDate = getNextDayOfWeek(secondaryDayNum, now);
            targetHour = secondaryTimeBlock.start;
          } else {
            // Default to next business day
            targetDate = getNextBusinessDay(now);
            targetHour = 15; // 3pm default
          }
        } else {
          targetDate = getNextBusinessDay(now);
          targetHour = 15;
        }
      } else {
        targetDate = getNextDayOfWeek(targetDayNum, now);
        targetHour = timeBlock.start;
      }
    } else {
      // Invalid data, use default
      targetDate = getNextBusinessDay(now);
      targetHour = 15;
    }
  } else {
    // Priority 3: No data, use default
    targetDate = getNextBusinessDay(now);
    targetHour = 15; // 3pm default
  }

  // Set the target time
  targetDate.setHours(targetHour, 0, 0, 0);

  return applySafetyChecks(targetDate, minimumSendTime, now, options?.hasWeekendActivity);
}

function applySafetyChecks(
  targetDate: Date, 
  minimumSendTime: Date, 
  now: Date, 
  hasWeekendActivity?: boolean
): Date {
  // Ensure it's in the future
  if (targetDate <= minimumSendTime) {
    // If today but time has passed, try later today or tomorrow
    const laterToday = new Date(now);
    laterToday.setHours(now.getHours() + 2, 0, 0, 0); // 2 hours from now
    
    // Check if later today is valid (before 9pm)
    if (laterToday.getHours() < 21 && laterToday.getHours() >= 8) {
      targetDate = laterToday;
    } else {
      // Schedule for next business day
      targetDate = getNextBusinessDay(now);
      targetDate.setHours(10, 0, 0, 0); // 10am
    }
  }

  // Safety check: Never schedule between 9pm and 8am
  if (targetDate.getHours() >= 21 || targetDate.getHours() < 8) {
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(10, 0, 0, 0);
  }

  // Safety check: Skip weekends if no weekend activity
  if (isWeekend(targetDate.getDay()) && !hasWeekendActivity) {
    targetDate = getNextBusinessDay(targetDate);
    targetDate.setHours(10, 0, 0, 0);
  }

  return targetDate;
}

export function formatTimeUntil(targetDate: Date): string {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  
  if (diffMs < 0) {
    return 'now';
  }
  
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    return remainingHours > 0 
      ? `${diffDays}d ${remainingHours}h`
      : `${diffDays}d`;
  }
  
  if (diffHours > 0) {
    const remainingMins = diffMins % 60;
    return remainingMins > 0 
      ? `${diffHours}h ${remainingMins}m`
      : `${diffHours}h`;
  }
  
  return `${diffMins}m`;
}

export function formatLearnedPatterns(patterns: LearnedPatterns | null): string {
  if (!patterns || !patterns.learning_confidence || patterns.learning_confidence < 50) {
    return 'Not enough data';
  }

  const parts: string[] = [];

  if (patterns.learned_best_days?.length) {
    const days = patterns.learned_best_days.slice(0, 2).join(' or ');
    parts.push(days);
  }

  if (patterns.learned_best_times?.length) {
    const times = patterns.learned_best_times[0];
    parts.push(`at ${times}`);
  }

  if (parts.length === 0) {
    return 'Analyzing patterns...';
  }

  return `Responds best on ${parts.join(' ')}`;
}