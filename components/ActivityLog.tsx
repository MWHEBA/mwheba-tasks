import React, { useState } from 'react';
import { ActivityLogEntry, ActivityType } from '../types';
import { formatRelativeDate } from '../utils/dateUtils';

/**
 * Props for ActivityLog component
 */
interface Props {
  /** قائمة إدخالات سجل النشاط (Array of activity log entries) */
  entries: ActivityLogEntry[];
  /** الحد الأقصى للإدخالات المعروضة افتراضياً (Maximum entries to show initially) */
  maxEntries?: number;
}

/**
 * ActivityLog Component
 * 
 * مكون لعرض سجل نشاط المهمة بترتيب زمني عكسي
 * Displays task activity log in reverse chronological order (newest first)
 * 
 * Features:
 * - Automatic sorting (newest first)
 * - Color-coded activity types
 * - Detailed information for each entry
 * - "Show more" functionality for older entries
 * - Relative timestamps (e.g., "منذ 5 دقائق")
 * 
 * Activity Types:
 * - STATUS_CHANGE: Status updates
 * - COMMENT_ADDED: New comments
 * - ATTACHMENT_ADDED: New attachments
 * - TASK_CREATED: Task creation
 * - TASK_UPDATED: Task updates
 * - DEADLINE_SET/CHANGED: Deadline modifications
 * 
 * @example
 * <ActivityLog 
 *   entries={task.activityLog || []}
 *   maxEntries={10}
 * />
 */
export const ActivityLog: React.FC<Props> = ({ entries, maxEntries = 10 }) => {
  const [showAll, setShowAll] = useState(false);
  
  // Sort entries in reverse chronological order (newest first)
  const sortedEntries = [...entries].sort((a, b) => b.timestamp - a.timestamp);
  
  // Determine which entries to display
  const displayedEntries = showAll ? sortedEntries : sortedEntries.slice(0, maxEntries);
  const hasMore = sortedEntries.length > maxEntries;
  
  // Format timestamp using relative date formatting
  const formatTimestamp = (timestamp: number): string => {
    return formatRelativeDate(timestamp, false);
  };
  
  // Get icon and color based on activity type
  const getActivityStyle = (type: ActivityType | string) => {
    switch (type) {
      case ActivityType.STATUS_CHANGE:
      case 'statusChange':
        return {
          icon: 'fa-solid fa-arrow-right-arrow-left',
          color: 'text-blue-500',
          bg: 'bg-slate-50',
          border: 'border-slate-100'
        };
      case ActivityType.COMMENT_ADDED:
      case 'commentAdded':
        return {
          icon: 'fa-solid fa-comment',
          color: 'text-purple-500',
          bg: 'bg-slate-50',
          border: 'border-slate-100'
        };
      case ActivityType.REPLY_ADDED:
      case 'replyAdded':
        return {
          icon: 'fa-solid fa-reply',
          color: 'text-indigo-500',
          bg: 'bg-slate-50',
          border: 'border-slate-100'
        };
      case ActivityType.COMMENT_RESOLVED:
      case 'commentResolved':
        return {
          icon: 'fa-solid fa-check-circle',
          color: 'text-green-500',
          bg: 'bg-slate-50',
          border: 'border-slate-100'
        };
      case ActivityType.ATTACHMENT_ADDED:
      case 'attachmentAdded':
        return {
          icon: 'fa-solid fa-paperclip',
          color: 'text-green-500',
          bg: 'bg-slate-50',
          border: 'border-slate-100'
        };
      case ActivityType.ATTACHMENT_DELETED:
      case 'attachmentDeleted':
        return {
          icon: 'fa-solid fa-trash',
          color: 'text-red-500',
          bg: 'bg-slate-50',
          border: 'border-slate-100'
        };
      case ActivityType.TASK_CREATED:
      case 'taskCreated':
        return {
          icon: 'fa-solid fa-plus-circle',
          color: 'text-emerald-500',
          bg: 'bg-slate-50',
          border: 'border-slate-100'
        };
      case ActivityType.TASK_UPDATED:
      case 'taskUpdated':
        return {
          icon: 'fa-solid fa-pen',
          color: 'text-amber-500',
          bg: 'bg-slate-50',
          border: 'border-slate-100'
        };
      case ActivityType.DEADLINE_SET:
      case ActivityType.DEADLINE_CHANGED:
      case 'deadlineSet':
      case 'deadlineChanged':
        return {
          icon: 'fa-solid fa-calendar-check',
          color: 'text-orange-500',
          bg: 'bg-slate-50',
          border: 'border-slate-100'
        };
      default:
        return {
          icon: 'fa-solid fa-circle-info',
          color: 'text-slate-500',
          bg: 'bg-slate-50',
          border: 'border-slate-100'
        };
    }
  };
  
  if (entries.length === 0) {
    return (
      <div className="bg-slate-50 rounded-lg p-6 text-center">
        <i className="fa-solid fa-clock-rotate-left text-slate-300 text-3xl mb-2"></i>
        <p className="text-slate-500 text-sm">لا يوجد نشاط مسجل بعد</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <i className="fa-solid fa-clock-rotate-left text-slate-600" aria-hidden="true"></i>
        <h3 className="text-lg font-semibold text-slate-800">سجل النشاط</h3>
        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full" aria-label={`${entries.length} إدخال في السجل`}>
          {entries.length} إدخال
        </span>
      </div>
      
      <div className="space-y-1.5" role="feed" aria-label="سجل نشاط المهمة">
        {displayedEntries.map((entry) => {
          const style = getActivityStyle(entry.type);
          
          return (
            <div
              key={entry.id}
              className={`flex items-center gap-2 p-2 rounded border ${style.bg} ${style.border} transition-all hover:shadow-sm`}
              role="article"
              aria-label={`نشاط: ${entry.description}`}
            >
              <div className={`flex-shrink-0 w-6 h-6 rounded-full ${style.bg} border ${style.border} flex items-center justify-center`}>
                <i className={`${style.icon} ${style.color} text-[10px]`} aria-hidden="true"></i>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-700">
                  {entry.description}
                </p>
                
                {entry.details && Object.keys(entry.details).length > 0 && (
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {entry.details.commentText && (
                      <span className="italic">"{entry.details.commentText}"</span>
                    )}
                    {entry.details.attachmentName && (
                      <span>الملف: {entry.details.attachmentName}</span>
                    )}
                    {(entry.details.oldStatus || entry.details.oldStatusLabel) && (entry.details.newStatus || entry.details.newStatusLabel) && (
                      <span>من: {entry.details.oldStatusLabel || entry.details.oldStatus} → {entry.details.newStatusLabel || entry.details.newStatus}</span>
                    )}
                    {entry.details.deadline && (
                      <span>الموعد: {formatRelativeDate(entry.details.deadline, true)}</span>
                    )}
                  </div>
                )}
              </div>
              
              <p className="text-[10px] text-slate-400 flex-shrink-0">
                {formatTimestamp(entry.timestamp)}
              </p>
            </div>
          );
        })}
      </div>
      
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-2 px-4 text-sm font-medium text-brand-600 bg-white border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          aria-label={`عرض ${sortedEntries.length - maxEntries} إدخال إضافي`}
          aria-expanded="false"
        >
          <i className="fa-solid fa-chevron-down ml-2" aria-hidden="true"></i>
          عرض المزيد ({sortedEntries.length - maxEntries} إدخال إضافي)
        </button>
      )}
      
      {showAll && hasMore && (
        <button
          onClick={() => setShowAll(false)}
          className="w-full py-2 px-4 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          aria-label="عرض أقل من سجل النشاط"
          aria-expanded="true"
        >
          <i className="fa-solid fa-chevron-up ml-2" aria-hidden="true"></i>
          عرض أقل
        </button>
      )}
    </div>
  );
};
