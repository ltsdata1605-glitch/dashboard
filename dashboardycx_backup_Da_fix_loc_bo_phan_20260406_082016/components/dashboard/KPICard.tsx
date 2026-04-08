
import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  isUp: boolean;
  icon: LucideIcon;
  color: string;
  delay?: number;
}

export default function KPICard({ title, value, change, isUp, icon: Icon, color, delay = 0 }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-950/50 transition-all duration-500 group"
    >
      <div className="flex items-start justify-between mb-6">
        <div className={`p-4 rounded-2xl ${color} bg-opacity-10 dark:bg-opacity-20 transition-transform duration-500 group-hover:scale-110`}>
          <Icon className={`w-7 h-7 ${color.replace('bg-', 'text-')}`} />
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
          isUp ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
        }`}>
          {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {change}
        </div>
      </div>
      
      <div>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
      </div>
      
      <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800"></div>
            ))}
          </div>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">+12 active now</span>
        </div>
      </div>
    </motion.div>
  );
}
