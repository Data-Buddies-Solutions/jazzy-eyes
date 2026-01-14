// Date Range Utility Functions for Analytics

/**
 * Calculate start and end dates based on preset string
 * @param preset - One of the predefined date range presets
 * @returns Object with startDate and endDate
 */
export function getDateRangePreset(preset: string): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  let startDate = new Date();

  switch (preset) {
    case 'Last 7 days':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'Last 30 days':
      startDate.setDate(now.getDate() - 30);
      break;
    case 'Last 90 days':
      startDate.setDate(now.getDate() - 90);
      break;
    case 'This Month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'Last Month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate.setFullYear(now.getFullYear());
      endDate.setMonth(now.getMonth());
      endDate.setDate(0); // Last day of previous month
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'This Quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    }
    case 'All Time':
      startDate = new Date(2000, 0, 1); // Far past date
      break;
    default:
      // Default to Last 30 days
      startDate.setDate(now.getDate() - 30);
  }

  startDate.setHours(0, 0, 0, 0);
  return { startDate, endDate };
}

/**
 * Format a date range into a human-readable string
 * @param start - Start date
 * @param end - End date
 * @returns Formatted string like "Dec 1, 2025 - Jan 8, 2026"
 */
export function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };

  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', options);

  return `${startStr} - ${endStr}`;
}

/**
 * Convert Date to YYYY-MM-DD format for API calls
 * @param date - Date to convert
 * @returns ISO date string (YYYY-MM-DD)
 */
export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate number of days between two dates
 * @param start - Start date
 * @param end - End date
 * @returns Number of days
 */
export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = end.getTime() - start.getTime();
  return Math.ceil(diffMs / msPerDay);
}

/**
 * Get all available date range preset options
 */
export const DATE_RANGE_PRESETS = [
  'Last 7 days',
  'Last 30 days',
  'Last 90 days',
  'This Month',
  'Last Month',
  'This Quarter',
  'All Time',
] as const;

export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];
