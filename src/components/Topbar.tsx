import React, { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LucideBell, LucideCreditCard, LucideMoon, LucideRoute, LucideSun, LucideMessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useUiStore } from '../stores/uiStore';
import { useNotifications } from '../hooks/useNotifications';


export function Topbar({ title, subtitle }: { title: ReactNode; subtitle?: string }) {
  const { t, i18n } = useTranslation(['common', 'dashboard']);
  const navigate = useNavigate();
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const { notifications, unreadCount, loading, formatRelative } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const dateText = new Date().toLocaleDateString(i18n.language === 'en' ? 'en-IN' : i18n.language === 'hi' ? 'hi-IN' : 'ta-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, []);

  const renderIcon = (type: string) => {
    if (type === 'message') return <LucideMessageSquare className="w-4 h-4" />;
    if (type === 'payment') return <LucideCreditCard className="w-4 h-4" />;
    return <LucideRoute className="w-4 h-4" />;
  };

  return (
    <header className="h-[64px] lg:h-[var(--topbar-height)] min-h-[64px] lg:min-h-[var(--topbar-height)] flex items-center justify-between px-4 sm:px-8 lg:px-10 border-b border-[var(--border)] sticky top-0 bg-[color:color-mix(in_srgb,var(--bg)_76%,transparent)] backdrop-blur-[22px] z-40 saturate-[120%]">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <h1 className="topbar-title text-[22px] sm:text-[30px] font-semibold text-[var(--text)] truncate max-w-[clamp(160px,46vw,520px)] sm:max-w-none">
            {title}
          </h1>
          <div className="h-4 w-[1px] bg-[var(--border)] hidden lg:block" />
          {subtitle && <span className="text-[12px] font-medium text-[var(--muted)] hidden lg:block truncate">{subtitle}</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5 sm:mt-0">
          <div className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
          <p className="text-[11px] text-[var(--muted)] font-medium tracking-[0.01em] opacity-85">
            {dateText}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <LanguageSwitcher />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-[13px] bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-all active:scale-95 group overflow-hidden"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? (
            <LucideSun className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
          ) : (
            <LucideMoon className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
          )}
        </motion.button>

        <div className="relative" ref={panelRef}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen((prev) => !prev)}
            className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-[13px] bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-all active:scale-95 group overflow-hidden"
            aria-label="Notifications"
            title="Notifications"
          >
            <LucideBell className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
            {unreadCount > 0 ? (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--accent-deep)] text-white text-[10px] font-bold flex items-center justify-center z-20">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </motion.button>

          {open ? (
            <div className="absolute right-0 top-[calc(100%+12px)] w-[min(92vw,380px)] rounded-[26px] border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface-strong)_88%,transparent)] backdrop-blur-[22px] shadow-[0_30px_80px_rgba(0,0,0,0.28)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
                <div>
                  <div className="section-label">NOTIFICATIONS</div>
                  <div className="text-[18px] font-semibold tracking-[-0.03em] text-[var(--text)]">Live activity</div>
                </div>
                <div className="pill pill--muted">{unreadCount} unread</div>
              </div>

              <div className="max-h-[420px] overflow-y-auto no-scrollbar p-3 space-y-2">
                {loading ? (
                  <div className="p-4 text-[13px] text-[var(--muted)]">Loading alerts...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 rounded-[18px] border border-dashed border-[var(--border)] bg-[var(--surface-soft)] text-[13px] text-[var(--muted)]">
                    No notifications yet. New shipment messages, booking milestones, and payment events will appear here.
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        navigate(notification.href);
                      }}
                      className="w-full rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-left transition hover:border-[var(--border-strong)] hover:bg-white/[0.03]"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 h-9 w-9 rounded-2xl border flex items-center justify-center ${
                          notification.unread
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]/20 text-[var(--accent-deep)]'
                            : 'border-[var(--border)] bg-white/[0.03] text-[var(--muted)]'
                        }`}>
                          {renderIcon(notification.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[13px] font-semibold text-[var(--text)] truncate">{notification.title}</div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] shrink-0">
                              {formatRelative(notification.createdAt)}
                            </div>
                          </div>
                          <div className="mt-1 text-[12px] text-[var(--muted)] line-clamp-2">{notification.body}</div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
