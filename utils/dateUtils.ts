/**
 * Date utility functions for MWHEBA Tasks
 * Provides helper functions for date formatting and deadline calculations
 */

/**
 * Get the correct Arabic plural form for a number
 * @param count - The number to pluralize
 * @param singular - Singular form (e.g., "دقيقة")
 * @param dual - Dual form (e.g., "دقيقتان")
 * @param plural - Plural form for 3-10 (e.g., "دقائق")
 * @param pluralMany - Plural form for 11+ (e.g., "دقيقة")
 * @returns The correct plural form based on Arabic grammar rules
 * 
 * @example
 * getArabicPlural(1, 'دقيقة', 'دقيقتان', 'دقائق', 'دقيقة') // "دقيقة"
 * getArabicPlural(2, 'دقيقة', 'دقيقتان', 'دقائق', 'دقيقة') // "دقيقتان"
 * getArabicPlural(5, 'دقيقة', 'دقيقتان', 'دقائق', 'دقيقة') // "دقائق"
 * getArabicPlural(15, 'دقيقة', 'دقيقتان', 'دقائق', 'دقيقة') // "دقيقة"
 */
export const getArabicPlural = (
  count: number,
  singular: string,
  dual: string,
  plural: string,
  pluralMany: string
): string => {
  if (count === 1) {
    return singular;
  } else if (count === 2) {
    return dual;
  } else if (count >= 3 && count <= 10) {
    return plural;
  } else {
    return pluralMany;
  }
};

/**
 * Calculate time remaining until a deadline
 * @param deadline - Timestamp of the deadline
 * @returns Time remaining in milliseconds
 */
export const getTimeRemaining = (deadline: number): number => {
  return deadline - Date.now();
};

/**
 * Check if a deadline is overdue
 * @param deadline - Timestamp of the deadline
 * @returns True if the deadline has passed
 */
export const isOverdue = (deadline: number): boolean => {
  return deadline < Date.now();
};

/**
 * Check if a deadline is within the specified hours
 * @param deadline - Timestamp of the deadline
 * @param hours - Number of hours to check
 * @returns True if deadline is within the specified hours
 */
export const isWithinHours = (deadline: number, hours: number): boolean => {
  const timeRemaining = getTimeRemaining(deadline);
  const hoursInMs = hours * 60 * 60 * 1000;
  return timeRemaining > 0 && timeRemaining <= hoursInMs;
};

/**
 * Get deadline alert level based on time remaining
 * @param deadline - Timestamp of the deadline
 * @returns Alert level: 'none' | 'warning' | 'urgent' | 'overdue'
 */
export const getDeadlineAlertLevel = (deadline: number): 'none' | 'warning' | 'urgent' | 'overdue' => {
  if (isOverdue(deadline)) {
    return 'overdue';
  }
  
  if (isWithinHours(deadline, 24)) {
    return 'urgent';
  }
  
  if (isWithinHours(deadline, 48)) {
    return 'warning';
  }
  
  return 'none';
};

/**
 * Format a timestamp to Arabic date string
 * @param timestamp - Timestamp to format
 * @returns Formatted date string in Arabic
 */
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format a timestamp to Arabic date and time string
 * @param timestamp - Timestamp to format
 * @returns Formatted date and time string in Arabic
 */
export const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format a timestamp to short date string (DD/MM/YYYY)
 * @param timestamp - Timestamp to format
 * @returns Formatted short date string
 */
export const formatShortDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

/**
 * Format time remaining in a human-readable format
 * @param deadline - Timestamp of the deadline
 * @returns Human-readable time remaining string in Arabic
 */
export const formatTimeRemaining = (deadline: number): string => {
  const timeRemaining = getTimeRemaining(deadline);
  
  if (timeRemaining < 0) {
    const overdue = Math.abs(timeRemaining);
    const days = Math.floor(overdue / (1000 * 60 * 60 * 24));
    const hours = Math.floor((overdue % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      const dayWord = getArabicPlural(days, 'يوم', 'يومان', 'أيام', 'يوم');
      return `متأخر ${days === 2 ? '' : days + ' '}${dayWord}`;
    }
    const hourWord = getArabicPlural(hours, 'ساعة', 'ساعتان', 'ساعات', 'ساعة');
    return `متأخر ${hours === 2 ? '' : hours + ' '}${hourWord}`;
  }
  
  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    const dayWord = getArabicPlural(days, 'يوم', 'يومان', 'أيام', 'يوم');
    return `${days === 2 ? '' : days + ' '}${dayWord} ${days === 2 ? 'متبقيان' : 'متبقية'}`;
  }
  
  if (hours > 0) {
    const hourWord = getArabicPlural(hours, 'ساعة', 'ساعتان', 'ساعات', 'ساعة');
    return `${hours === 2 ? '' : hours + ' '}${hourWord} ${hours === 2 ? 'متبقيتان' : 'متبقية'}`;
  }
  
  const minuteWord = getArabicPlural(minutes, 'دقيقة', 'دقيقتان', 'دقائق', 'دقيقة');
  return `${minutes === 2 ? '' : minutes + ' '}${minuteWord} ${minutes === 2 ? 'متبقيتان' : 'متبقية'}`;
};

/**
 * Get relative time string (e.g., "منذ ساعتين", "قبل 3 أيام")
 * @param timestamp - Timestamp to compare
 * @returns Relative time string in Arabic
 */
export const getRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (years > 0) {
    const yearWord = getArabicPlural(years, 'سنة', 'سنتان', 'سنوات', 'سنة');
    return `منذ ${years === 2 ? '' : years + ' '}${yearWord}`;
  }
  
  if (months > 0) {
    const monthWord = getArabicPlural(months, 'شهر', 'شهران', 'أشهر', 'شهر');
    return `منذ ${months === 2 ? '' : months + ' '}${monthWord}`;
  }
  
  if (days > 0) {
    const dayWord = getArabicPlural(days, 'يوم', 'يومان', 'أيام', 'يوم');
    return `منذ ${days === 2 ? '' : days + ' '}${dayWord}`;
  }
  
  if (hours > 0) {
    const hourWord = getArabicPlural(hours, 'ساعة', 'ساعتان', 'ساعات', 'ساعة');
    return `منذ ${hours === 2 ? '' : hours + ' '}${hourWord}`;
  }
  
  if (minutes > 0) {
    const minuteWord = getArabicPlural(minutes, 'دقيقة', 'دقيقتان', 'دقائق', 'دقيقة');
    return `منذ ${minutes === 2 ? '' : minutes + ' '}${minuteWord}`;
  }
  
  return 'الآن';
};

/**
 * Check if a date is in the past
 * @param timestamp - Timestamp to check
 * @returns True if the date is in the past
 */
export const isInPast = (timestamp: number): boolean => {
  return timestamp < Date.now();
};

/**
 * Check if a date is today
 * @param timestamp - Timestamp to check
 * @returns True if the date is today
 */
export const isToday = (timestamp: number): boolean => {
  const today = new Date();
  const date = new Date(timestamp);
  
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

/**
 * Check if a date is tomorrow
 * @param timestamp - Timestamp to check
 * @returns True if the date is tomorrow
 */
export const isTomorrow = (timestamp: number): boolean => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = new Date(timestamp);
  
  return date.getDate() === tomorrow.getDate() &&
         date.getMonth() === tomorrow.getMonth() &&
         date.getFullYear() === tomorrow.getFullYear();
};

/**
 * Check if a date is yesterday
 * @param timestamp - Timestamp to check
 * @returns True if the date is yesterday
 */
export const isYesterday = (timestamp: number): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = new Date(timestamp);
  
  return date.getDate() === yesterday.getDate() &&
         date.getMonth() === yesterday.getMonth() &&
         date.getFullYear() === yesterday.getFullYear();
};

/**
 * Check if a date is the day after tomorrow
 * @param timestamp - Timestamp to check
 * @returns True if the date is the day after tomorrow
 */
export const isDayAfterTomorrow = (timestamp: number): boolean => {
  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  const date = new Date(timestamp);
  
  return date.getDate() === dayAfterTomorrow.getDate() &&
         date.getMonth() === dayAfterTomorrow.getMonth() &&
         date.getFullYear() === dayAfterTomorrow.getFullYear();
};

/**
 * Format date in a relative way (اليوم، أمس، غداً، بعد غد، منذ X دقيقة/ساعة/يوم)
 * @param timestamp - Timestamp to format
 * @param includeTime - Whether to include time in the output
 * @returns Formatted relative date string in Arabic
 */
export const formatRelativeDate = (timestamp: number, includeTime: boolean = true): string => {
  const date = new Date(timestamp);
  const now = Date.now();
  const diff = now - timestamp;
  
  // For future dates (deadlines)
  if (diff < 0) {
    const futureDiff = Math.abs(diff);
    const minutes = Math.floor(futureDiff / (1000 * 60));
    const hours = Math.floor(futureDiff / (1000 * 60 * 60));
    const days = Math.floor(futureDiff / (1000 * 60 * 60 * 24));
    
    const timeStr = includeTime ? ` ${date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}` : '';
    
    if (isToday(timestamp)) {
      return `اليوم${timeStr}`;
    }
    
    if (isTomorrow(timestamp)) {
      return `غداً${timeStr}`;
    }
    
    if (isDayAfterTomorrow(timestamp)) {
      return `بعد غد${timeStr}`;
    }
    
    if (days < 7) {
      const dayWord = getArabicPlural(days, 'يوم', 'يومان', 'أيام', 'يوم');
      return `بعد ${days === 2 ? '' : days + ' '}${dayWord}${timeStr}`;
    }
    
    // For dates more than a week away, show full date
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime && { hour: '2-digit', minute: '2-digit' })
    });
  }
  
  // For past dates
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  // Less than 1 minute
  if (seconds < 60) {
    return 'الآن';
  }
  
  // Less than 1 hour
  if (minutes < 60) {
    const minuteWord = getArabicPlural(minutes, 'دقيقة', 'دقيقتان', 'دقائق', 'دقيقة');
    return `منذ ${minutes === 2 ? '' : minutes + ' '}${minuteWord}`;
  }
  
  // Less than 24 hours
  if (hours < 24) {
    const hourWord = getArabicPlural(hours, 'ساعة', 'ساعتان', 'ساعات', 'ساعة');
    return `منذ ${hours === 2 ? '' : hours + ' '}${hourWord}`;
  }
  
  // Yesterday
  if (isYesterday(timestamp)) {
    const timeStr = includeTime ? ` ${date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}` : '';
    return `أمس${timeStr}`;
  }
  
  // Today (edge case for times earlier today)
  if (isToday(timestamp)) {
    const timeStr = includeTime ? ` ${date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}` : '';
    return `اليوم${timeStr}`;
  }
  
  // Less than 7 days
  if (days < 7) {
    const dayWord = getArabicPlural(days, 'يوم', 'يومان', 'أيام', 'يوم');
    return `منذ ${days === 2 ? '' : days + ' '}${dayWord}`;
  }
  
  // More than a week, show full date
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(includeTime && { hour: '2-digit', minute: '2-digit' })
  });
};
