import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  subtext?: string;
  icon: React.ReactNode;
  color: 'cyan' | 'purple' | 'indigo' | 'emerald' | 'amber';
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, change, subtext, icon: Icon, color }) => {
  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="backdrop-blur-md bg-white/10 border border-white/20 shadow-xl rounded-2xl p-6 flex flex-col justify-between min-h-[160px] group transition-all"
    >
      <div className="flex justify-between items-start">
        <span className="text-text-muted uppercase text-[10px] font-bold tracking-[0.2em]">{label}</span>
        <div className={cn(
          "p-2 rounded-xl transition-transform group-hover:rotate-12",
          color === 'indigo' ? "bg-indigo/10 text-indigo" :
          color === 'emerald' ? "bg-emerald/10 text-emerald" :
          color === 'amber' ? "bg-amber/10 text-amber" :
          color === 'cyan' ? "bg-sky/10 text-sky" : "bg-indigo/10 text-indigo"
        )}>
          {Icon}
        </div>
      </div>
      <div>
        <div className="text-4xl font-display font-bold text-text-primary tracking-tight">{value}</div>
        {change && (
          <div className="text-emerald text-xs font-medium mt-1">{change}</div>
        )}
        {subtext && (
          <div className="flex items-center gap-2 mt-1">
             <span className="text-xs text-text-muted">{subtext}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
