import React from 'react';
import { UseFormRegister } from 'react-hook-form';
import { motion } from 'framer-motion';

interface InputFieldProps {
  label:        string
  icon:         React.ReactNode
  error?:       string
  type?:        string
  placeholder?: string
  rightElement?: React.ReactNode  // for password toggle
  registration: ReturnType<UseFormRegister<any>>
}

export function InputField({ 
  label, 
  icon, 
  error, 
  type = 'text', 
  placeholder, 
  rightElement,
  registration 
}: InputFieldProps) {
  return (
    <div className="space-y-2.5 text-left group/field">
      <label className="block text-[10px] font-black text-[var(--muted)]/60 uppercase tracking-[0.2em] ml-2 group-focus-within/field:text-[var(--accent)] transition-colors duration-300">
        {label}
      </label>
      <div className="relative group">
        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--muted)] group-focus-within:text-[var(--accent)] transition-all duration-300 z-10">
          {icon}
        </div>
        <input
          type={type}
          placeholder={placeholder}
          {...registration}
          className={`
            w-full bg-white/[0.02] border rounded-[1.25rem] py-5 pl-16 pr-6
            text-white text-[15px] font-bold outline-none transition-all duration-500
            placeholder:text-white/10 placeholder:font-medium
            backdrop-blur-sm
            ${error 
              ? 'border-rose-500/40 focus:border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.1)] focus:bg-rose-500/[0.02]' 
              : 'border-white/5 focus:border-[var(--accent)] focus:shadow-[0_0_40px_rgba(70,127,227,0.2)] focus:bg-white/[0.04] hover:bg-white/[0.03] hover:border-white/10'
            }
          `}
        />
        {rightElement && (
          <div className="absolute right-5 top-1/2 -translate-y-1/2 transition-all duration-300 z-10">
            {rightElement}
          </div>
        )}
        
        {/* Subtle Inner Glow on Focus */}
        <div className="absolute inset-0 rounded-[1.25rem] bg-gradient-to-br from-[var(--accent)]/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>
      {error && (
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-1.5 ml-2 mt-1"
        >
          <div className="w-1 h-1 rounded-full bg-rose-500" />
          <span className="text-[10px] font-black text-rose-400 uppercase tracking-tight">
            {error}
          </span>
        </motion.div>
      )}
    </div>
  );
}
