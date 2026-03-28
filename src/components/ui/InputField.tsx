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
    <div className="space-y-2 text-left">
      <label className="block text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">
        {label}
      </label>
      <div className="relative group">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--muted)] group-focus-within:text-[var(--accent)] transition-all duration-300">
          {icon}
        </div>
        <input
          type={type}
          placeholder={placeholder}
          {...registration}
          className={`
            w-full bg-[var(--bg-deep)] border rounded-2xl py-4.5 pl-14 pr-4
            text-[var(--text)] text-sm font-bold outline-none transition-all duration-300
            placeholder:text-[var(--muted)]/40 placeholder:font-medium
            ${error 
              ? 'border-rose-500/50 focus:border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.15)]' 
              : 'border-[var(--border)] focus:border-[var(--accent)]/50 focus:shadow-[0_0_25px_rgba(70,127,227,0.15)] focus:bg-[var(--surface-solid)]'
            }
          `}
        />
        {rightElement && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <motion.span 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] font-black text-rose-400 ml-1 uppercase tracking-tighter"
        >
          {error}
        </motion.span>
      )}
    </div>
  );
}
