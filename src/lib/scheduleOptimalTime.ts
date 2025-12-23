/**
 * Calculates the next optimal time to send a follow-up based on contact window data.
 * 
 * Rules:
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

export function calculateOptimalSendTime(
  contactWindow?: ContactWindowData | null,
  options?: {
    leadQuietMode?: boolean;
    hasWeekendActivity?: boolean;
    timezone?: string;
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
    // No contact window data, use default
    targetDate = getNextBusinessDay(now);
    targetHour = 15; // 3pm default
  }

  // Set the target time
  targetDate.setHours(targetHour, 0, 0, 0);

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
  if (isWeekend(targetDate.getDay()) && !options?.hasWeekendActivity) {
    targetDate = getNextBusinessDay(targetDate);
    targetDate.setHours(10, 0, 0, 0);
  }

  return targetDate;
}

function getNextBusinessDay(fromDate: Date): Date {
  const result = new Date(fromDate);
  result.setDate(result.getDate() + 1);
  
  while (isWeekend(result.getDay())) {
    result.setDate(result.getDate() + 1);
  }
  
  return result;
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