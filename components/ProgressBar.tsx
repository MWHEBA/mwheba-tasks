import React from 'react';

/**
 * Props for ProgressBar component
 */
interface Props {
  /** عدد المهام المنتهية (Number of completed tasks) */
  completed: number;
  /** إجمالي عدد المهام (Total number of tasks) */
  total: number;
  /** حجم شريط التقدم (Progress bar size) */
  size?: 'small' | 'medium' | 'large';
}

/**
 * ProgressBar Component
 * 
 * مكون لعرض شريط تقدم المهام الفرعية مع نسبة مئوية
 * Displays a progress bar for subtasks with percentage
 * 
 * Color Coding:
 * - Gray: Less than 40% complete
 * - Amber: 40-69% complete
 * - Blue: 70-99% complete
 * - Green: 100% complete
 * 
 * @example
 * <ProgressBar 
 *   completed={3} 
 *   total={5} 
 *   size="medium"
 * />
 * // Displays: "3/5 مهام منتهية" with 60% progress bar
 */
export const ProgressBar: React.FC<Props> = ({ completed, total, size = 'medium' }) => {
  // Calculate percentage
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  // Determine color based on completion percentage
  const getColorClasses = () => {
    if (percentage === 100) {
      return {
        bg: 'bg-emerald-500',
        text: 'text-emerald-700',
        lightBg: 'bg-emerald-50',
        border: 'border-emerald-200'
      };
    } else if (percentage >= 70) {
      return {
        bg: 'bg-blue-500',
        text: 'text-blue-700',
        lightBg: 'bg-blue-50',
        border: 'border-blue-200'
      };
    } else if (percentage >= 40) {
      return {
        bg: 'bg-amber-500',
        text: 'text-amber-700',
        lightBg: 'bg-amber-50',
        border: 'border-amber-200'
      };
    } else {
      return {
        bg: 'bg-slate-400',
        text: 'text-slate-600',
        lightBg: 'bg-slate-50',
        border: 'border-slate-200'
      };
    }
  };
  
  const colors = getColorClasses();
  
  // Size-based styling
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'gap-1.5',
          bar: 'h-1.5',
          text: 'text-[10px]'
        };
      case 'large':
        return {
          container: 'gap-2.5',
          bar: 'h-3',
          text: 'text-sm'
        };
      case 'medium':
      default:
        return {
          container: 'gap-2',
          bar: 'h-2',
          text: 'text-xs'
        };
    }
  };
  
  const sizeClasses = getSizeClasses();
  
  return (
    <div className={`flex flex-col ${sizeClasses.container}`}>
      {/* Progress bar */}
      <div className={`w-full ${colors.lightBg} rounded-full overflow-hidden border ${colors.border}`}>
        <div
          className={`${colors.bg} ${sizeClasses.bar} transition-all duration-300 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`تقدم المهام: ${percentage}%`}
        />
      </div>
      
      {/* Text label */}
      <div className={`flex items-center justify-between ${sizeClasses.text} ${colors.text} font-medium`}>
        <span>{completed}/{total} مهام منتهية</span>
        <span>{percentage}%</span>
      </div>
    </div>
  );
};
