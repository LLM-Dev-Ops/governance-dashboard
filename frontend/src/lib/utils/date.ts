import {
  format,
  formatDistanceToNow,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
} from 'date-fns';

/**
 * Format date to readable string
 */
export function formatDate(date: string | Date, formatStr: string = 'MMM d, yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Format date to datetime string
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM d, yyyy h:mm a');
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Get date range for today
 */
export function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfDay(now),
    end: endOfDay(now),
  };
}

/**
 * Get date range for this week
 */
export function getThisWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfWeek(now),
    end: endOfWeek(now),
  };
}

/**
 * Get date range for this month
 */
export function getThisMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
}

/**
 * Get date range for last N days
 */
export function getLastNDaysRange(days: number): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfDay(subDays(now, days - 1)),
    end: endOfDay(now),
  };
}

/**
 * Get date range for last N weeks
 */
export function getLastNWeeksRange(weeks: number): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfWeek(subWeeks(now, weeks - 1)),
    end: endOfWeek(now),
  };
}

/**
 * Get date range for last N months
 */
export function getLastNMonthsRange(months: number): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfMonth(subMonths(now, months - 1)),
    end: endOfMonth(now),
  };
}

/**
 * Convert date to ISO string for API
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Parse ISO string to Date
 */
export function fromISOString(date: string): Date {
  return parseISO(date);
}
