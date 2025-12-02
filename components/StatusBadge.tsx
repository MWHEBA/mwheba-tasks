
import React from 'react';
import { StatusService } from '../services/statusService';

interface Props {
  status: string; // ID
  size?: 'normal' | 'small';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'normal' }) => {
  const [statusConfig, setStatusConfig] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadStatus = async () => {
      const config = await StatusService.getById(status);
      setStatusConfig(config);
      setLoading(false);
    };
    loadStatus();
  }, [status]);

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
};
