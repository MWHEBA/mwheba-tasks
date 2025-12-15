
import React from 'react';
import { StatusService } from '../services/statusService';
import { TaskStatus } from '../types';

interface Props {
  status: string; // ID
  size?: 'normal' | 'small';
  clickable?: boolean;
  onStatusChange?: (newStatusId: string) => void;
  taskId?: string;
}

export const StatusBadge: React.FC<Props> = ({ 
  status, 
  size = 'normal', 
  clickable = false, 
  onStatusChange,
  taskId 
}) => {
  const [statusConfig, setStatusConfig] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [availableStatuses, setAvailableStatuses] = React.useState<TaskStatus[]>([]);
  const [loadingStatuses, setLoadingStatuses] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const loadStatus = async () => {
      const config = await StatusService.getById(status);
      setStatusConfig(config);
      setLoading(false);
    };
    loadStatus();
  }, [status]);

  // Load available statuses when dropdown opens
  React.useEffect(() => {
    if (isDropdownOpen && clickable) {
      const loadAvailableStatuses = async () => {
        setLoadingStatuses(true);
        try {
          const allowed = await StatusService.getAllowedNextStatuses(status);
          setAvailableStatuses(allowed);
        } catch (error) {
          console.error('Failed to load available statuses:', error);
          setAvailableStatuses([]);
        }
        setLoadingStatuses(false);
      };
      loadAvailableStatuses();
    }
  }, [isDropdownOpen, clickable, status]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleStatusSelect = (newStatusId: string) => {
    if (onStatusChange) {
      onStatusChange(newStatusId);
    }
    setIsDropdownOpen(false);
  };

  // Loading state
  if (loading) {
    return (
      <span 
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-400 animate-pulse"
        role="status"
      >
        ...
      </span>
    );
  }

  // Fallback if status deleted
  if (!statusConfig) {
      return (
        <span 
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500"
          role="status"
          aria-label="حالة غير معروفة"
        >
            غير معروف
        </span>
      );
  }

  const colorClass = StatusService.getThemeStyles(statusConfig.color);

  const sizeClasses = size === 'small' 
    ? 'px-2 py-0.5 text-[9px] gap-1' 
    : 'px-3 py-1 text-[11px] gap-1.5';

  if (!clickable) {
    return (
      <span 
        className={`inline-flex items-center rounded-full font-medium border ${colorClass} ${sizeClasses} pointer-events-none`}
        role="status"
        aria-label={`الحالة: ${statusConfig.label}`}
      >
        <i className={statusConfig.icon} aria-hidden="true"></i>
        {statusConfig.label}
      </span>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDropdownOpen(!isDropdownOpen);
        }}
        className={`inline-flex items-center rounded-full font-medium border ${colorClass} ${sizeClasses} cursor-pointer hover:opacity-80 transition-opacity`}
        role="button"
        aria-label={`تغيير الحالة: ${statusConfig.label}`}
        aria-expanded={isDropdownOpen}
      >
        <i className={statusConfig.icon} aria-hidden="true"></i>
        {statusConfig.label}
        <i className="fa-solid fa-chevron-down text-[8px] opacity-60" aria-hidden="true"></i>
      </button>

      {isDropdownOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[180px] py-1">
          {loadingStatuses ? (
            <div className="px-3 py-2 text-xs text-slate-500 flex items-center gap-2">
              <i className="fa-solid fa-spinner fa-spin"></i>
              جاري التحميل...
            </div>
          ) : availableStatuses.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">
              لا توجد حالات متاحة
            </div>
          ) : (
            availableStatuses.map((availableStatus) => {
              const availableColorClass = StatusService.getThemeStyles(availableStatus.color);
              return (
                <button
                  key={availableStatus.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleStatusSelect(availableStatus.id);
                  }}
                  className="w-full text-right px-3 py-2 hover:bg-slate-50 transition-colors flex items-center gap-2 text-xs"
                >
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium border ${availableColorClass} text-[9px]`}>
                    <i className={availableStatus.icon} aria-hidden="true"></i>
                    {availableStatus.label}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
