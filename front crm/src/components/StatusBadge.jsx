// src/components/StatusBadge.jsx

import React from 'react';

export const StatusBadge = ({ status }) => {
  const isActive = status === true || status === 'active' || String(status).toLowerCase() === 'true';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border transition-all duration-300
        ${isActive
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20'
          : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 dark:bg-rose-500/20'
        }
      `}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full animate-pulse
          ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}
        `}
      />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
};

export default StatusBadge;
