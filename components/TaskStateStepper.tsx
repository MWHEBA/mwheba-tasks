
import React, { useState, useRef, useEffect } from 'react';
import { StatusService } from '../services/statusService';
import { StatusBadge } from './StatusBadge';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  status: string; // ID
  onUpdate: (newStatus: string) => void;
  isSubtask?: boolean;
}

export const TaskStateStepper: React.FC<Props> = ({ status, onUpdate, isSubtask = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<any>(null);
  const [allowedNextStatuses, setAllowedNextStatuses] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const badgeSize = isSubtask ? 'small' : 'normal';

  useEffect(() => {
    const loadStatusData = async () => {
      const current = await StatusService.getById(status);
      const allowed = await StatusService.getAllowedNextStatuses(status);
      setCurrentStatus(current);
      setAllowedNextStatuses(allowed);
    };
    loadStatusData();
  }, [status]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Safety check
  if (!currentStatus) return <StatusBadge status={status} size={badgeSize} />;

  // Final Step? Just show badge
  if (currentStatus.isFinished) {
      return <StatusBadge status={status} size={badgeSize} />;
  }

  // No allowed next statuses? Just show current status badge
  if (allowedNextStatuses.length === 0) {
    return <StatusBadge status={status} size={badgeSize} />;
  }

  // If we have allowed statuses, show the stepper (for both main tasks and subtasks)

  const handleStatusChange = (newStatusId: string) => {
    onUpdate(newStatusId);
    setIsOpen(false);
  };

  // Split statuses into main actions and secondary actions
  const mainStatuses = allowedNextStatuses.filter(s => s.id !== 'On Hold' && s.id !== 'Cancelled');
  const secondaryStatuses = allowedNextStatuses.filter(s => s.id === 'On Hold' || s.id === 'Cancelled');

  return (
    <div className="relative flex items-center gap-2 flex-wrap" ref={dropdownRef}>
      {/* Current Status Badge */}
      <StatusBadge status={status} size={badgeSize} />
      
      {/* Main Status Buttons - Direct Actions */}
      {mainStatuses.map(nextStatus => {
        const themeStyles = StatusService.getThemeStyles(nextStatus.color);
        return (
          <button
            key={nextStatus.id}
            onClick={() => handleStatusChange(nextStatus.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 border ${themeStyles} hover:brightness-95 hover:shadow-sm`}
            title={`تحديث إلى: ${nextStatus.label}`}
          >
            <i className={`${nextStatus.icon} text-[10px]`}></i>
            <span>{nextStatus.label}</span>
            <i className="fa-solid fa-arrow-left text-[8px] opacity-50"></i>
          </button>
        );
      })}

      {/* Secondary Actions Menu (On Hold, Cancelled) */}
      {secondaryStatuses.length > 0 && (
        <>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center justify-center w-8 h-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            title="خيارات إضافية"
          >
            <i className="fa-solid fa-ellipsis-vertical text-sm"></i>
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden"
              >
                <div className="p-1 space-y-0.5">
                  {secondaryStatuses.map(nextStatus => {
                    const themeStyles = StatusService.getThemeStyles(nextStatus.color);
                    return (
                      <button
                        key={nextStatus.id}
                        onClick={() => handleStatusChange(nextStatus.id)}
                        className={`w-full text-right px-3 py-2 rounded-lg transition-all duration-150 border ${themeStyles} hover:brightness-95 flex items-center gap-2`}
                      >
                        <i className={`${nextStatus.icon} text-xs`}></i>
                        <span className="font-medium text-sm flex-1">{nextStatus.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};
