import React from 'react';
import { useTranslation } from 'react-i18next';
import { LucideBell, LucideMoon, LucideSun } from 'lucide-react';
import { motion } from 'framer-motion';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useUiStore } from '../stores/uiStore';


export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { t, i18n } = useTranslation(['common', 'dashboard']);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  
  const dateText = new Date().toLocaleDateString(i18n.language === 'en' ? 'en-IN' : i18n.language === 'hi' ? 'hi-IN' : 'ta-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="h-[var(--topbar-height)] min-h-[var(--topbar-height)] flex items-center justify-between px-5 sm:px-8 lg:px-12 border-b border-[var(--border)] sticky top-0 bg-[var(--bg)]/40 backdrop-blur-[30px] z-40 saturate-[180%]">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-4">
          <h1 className="topbar-title text-2xl font-black text-[var(--text)] tracking-tighter uppercase">{title}</h1>
          <div className="h-4 w-[1px] bg-[var(--border)] hidden md:block" />
          {subtitle && <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest hidden md:block opacity-60">{subtitle}</span>}
        </div>
        <div className="flex items-center gap-2.5">
          <div className="live-dot w-1.5 h-1.5" />
          <p className="text-[9px] text-[var(--muted)] font-black uppercase tracking-[0.15em]">
            {dateText} | <span className="text-[var(--accent-bright)] animate-pulse">{t('dashboard:stats.live_sync', 'GRID ACTIVE')}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <LanguageSwitcher />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="relative w-12 h-12 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-all active:scale-95 group overflow-hidden"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          {theme === 'dark' ? (
            <LucideSun className="w-5 h-5 relative z-10" />
          ) : (
            <LucideMoon className="w-5 h-5 relative z-10" />
          )}
        </motion.button>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-12 h-12 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-all active:scale-95 group overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <LucideBell className="w-5 h-5 relative z-10" />
          <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-[var(--accent)] border-2 border-[var(--bg)] shadow-[0_0_12px_var(--accent)] z-20"></span>
        </motion.button>
      </div>
    </header>
  );
}
