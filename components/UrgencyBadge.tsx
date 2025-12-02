import React from 'react';
import { Urgency } from '../types';

interface Props {
  level: Urgency;
}

export const UrgencyBadge: React.FC<Props> = ({ level }) => {
  // Only display badge if Urgent
  if (level !== Urgency.URGENT) {
    return null;
  }

  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 shadow-sm"
      role="status"
      aria-label="مهمة عاجلة"
    >
      <i className="fa-solid fa-fire text-red-500" aria-hidden="true"></i>
      عاجل
    </span>
  );
};