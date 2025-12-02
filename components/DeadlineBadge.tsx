import React from 'react';
import { formatRelativeDate } from '../utils/dateUtils';

/**
 * Props for DeadlineBadge component
 */
interface Props {
  /** موعد التسليم كـ timestamp (Deadline as timestamp in milliseconds) */
  deadline: number;
  /** هل المهمة منتهية؟ (Is the task finished?) */
  isFinished: boolean;
  /** حجم الشارة (Badge size) */
  size?: 'normal' | 'small';
}

type AlertLevel = 'safe' | 'warning' | 'urgent' | 'overdue';

/**
 * DeadlineBadge Component
 * 
 * مكون لعرض موعد التسليم مع تنبيهات بصرية حسب الوقت المتبقي
 * Displays a deadline with visual alerts based on time remaining
 * 
 * Alert Levels:
 * - 🟢 Safe (Green): More than 48 hours remaining
 * - 🟡 Warning (Yellow): Less than 48 hours remaining
 * - 🟠 Urgent (Orange): Less than 24 hours remaining
 * - 🔴 Overdue (Red): Past deadline
 * 
 * @example
 * <DeadlineBadge 
 *   deadline={Date.now() + 86400000} 
 *   isFinished={false}
 *   size="normal"
 * />
 */
export const DeadlineBadge: React.FC<Props> = ({ deadline, isFinished, size = 'normal' }) => {
  const now = Date.now();
  const timeRemaining = deadline - now;
  
  // Calculate hours remaining
  const hoursRemaining = timeRemaining / (1000 * 60 * 60);
  
  // Determine alert level based on time remaining
  const getAlertLevel = (): AlertLevel => {
    if (isFinished) return 'safe';
    if (timeRemaining < 0) return 'overdue';
    if (hoursRemaining < 24) return 'urgent';
    if (hoursRemaining < 48) return 'warning';
    return 'safe';
  };
  
  const alertLevel = getAlertLevel();
  
  // Format the deadline date using relative formatting
  const formatDeadline = (): string => {
    return formatRelativeDate(deadline, true);
  };
  
  // Get styling based on alert level
  const getStyles = () => {
    switch (alertLevel) {
      case 'overdue':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-300',
          icon: 'fa-solid fa-circle-exclamation text-red-600'
        };
      case 'urgent':
        return {
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          border: 'border-orange-300',
          icon: 'fa-solid fa-clock text-orange-600'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-300',
          icon: 'fa-solid fa-clock text-amber-600'
        };
      case 'safe':
      default:
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-300',
          icon: 'fa-solid fa-calendar-check text-emerald-600'
        };
    }
  };
  
  const styles = getStyles();
  const sizeClasses = size === 'small' 
    ? 'px-2 py-0.5 text-[9px] gap-1' 
    : 'px-3 py-1 text-[11px] gap-1.5';
  
  return (
    <span 
      className={`inline-flex items-center rounded-full font-medium border ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses}`}
      title={`موعد التسليم: ${formatDeadline()}`}
      role="status"
      aria-label={`موعد التسليم: ${formatDeadline()}${alertLevel === 'overdue' ? ' - متأخر' : alertLevel === 'urgent' ? ' - عاجل' : ''}`}
    >
      <i className={styles.icon} aria-hidden="true"></i>
      {formatDeadline()}
    </span>
  );
};
