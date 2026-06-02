// src/components/StatsCard.jsx

import React from 'react';
import { motion } from 'framer-motion';

const colorMap = {
  indigo: {
    bg: 'from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20',
    border: 'border-indigo-500/20 dark:border-indigo-500/30',
    text: 'text-indigo-600 dark:text-indigo-400',
    glow: 'shadow-indigo-500/10'
  },
  emerald: {
    bg: 'from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20',
    border: 'border-emerald-500/20 dark:border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    glow: 'shadow-emerald-500/10'
  },
  rose: {
    bg: 'from-rose-500/10 to-pink-500/10 dark:from-rose-500/20 dark:to-pink-500/20',
    border: 'border-rose-500/20 dark:border-rose-500/30',
    text: 'text-rose-600 dark:text-rose-400',
    glow: 'shadow-rose-500/10'
  },
  amber: {
    bg: 'from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20',
    border: 'border-amber-500/20 dark:border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    glow: 'shadow-amber-500/10'
  }
};

export const StatsCard = ({ title, value, icon: Icon, color = 'indigo', loading = false }) => {
  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className={`relative overflow-hidden rounded-[2rem] p-6 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl ${scheme.glow} transition-all duration-300`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 100 }}
    >
      {/* Dynamic Background Gradients */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${scheme.bg} blur-3xl opacity-60 rounded-full`} />

      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
            {title}
          </p>
          {loading ? (
            <div className="h-9 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          ) : (
            <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
              {value}
            </h3>
          )}
        </div>

        <div className={`p-4 rounded-2xl bg-gradient-to-tr ${scheme.bg} border ${scheme.border} ${scheme.text} flex items-center justify-center shadow-lg shadow-black/5`}>
          {Icon && <Icon size={24} className="stroke-[2px]" />}
        </div>
      </div>
    </motion.div>
  );
};

export default StatsCard;
