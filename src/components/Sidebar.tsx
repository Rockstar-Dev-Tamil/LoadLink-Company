import { useTranslation } from 'react-i18next';
import { LucideLayoutDashboard, LucideBox, LucideUserRound, LucideMapPin, LucideMap, LucideWallet, LucideBarChart3, LucideSettings, LucideLogOut, LucideMessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/authStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { PAGE_PRELOADERS } from '../App';

export function Sidebar() {
  const { t } = useTranslation('common');
  const { profile, signOut, signOutLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: t('nav.dashboard', 'Dashboard'), short: '', icon: <LucideLayoutDashboard size={18} />, key: 'dashboard' },
    { id: 'shipments', path: '/shipments', label: t('nav.shipments', 'Shipments'), short: '', icon: <LucideBox size={18} />, key: 'shipments' },
    { id: 'drivers', path: '/drivers', label: t('nav.drivers', 'Drivers'), short: '', icon: <LucideUserRound size={18} />, key: 'drivers' },
    { id: 'tracking', path: '/tracking', label: t('nav.tracking', 'Tracking'), short: '', icon: <LucideMapPin size={18} />, key: 'tracking' },
    { id: 'maps', path: '/maps', label: t('nav.maps', 'Maps'), short: '', icon: <LucideMap size={18} />, key: 'maps' },
    { id: 'messages', path: '/messages', label: t('nav.messages', 'Messages'), short: '', icon: <LucideMessageSquare size={18} />, key: 'messages' },
    { id: 'payments', path: '/payments', label: t('nav.payments', 'Payments'), short: '', icon: <LucideWallet size={18} />, key: 'payments' },
    { id: 'analytics', path: '/analytics', label: t('nav.analytics', 'Analytics'), short: '', icon: <LucideBarChart3 size={18} />, key: 'analytics' },
    { id: 'settings', path: '/settings', label: t('nav.settings', 'Settings'), short: '', icon: <LucideSettings size={18} />, key: 'settings' },
  ];

  const activeTab = navItems.find(item => {
    if (item.path === '/dashboard') return location.pathname === '/' || location.pathname === '/dashboard';
    return location.pathname.startsWith(item.path);
  })?.id || 'dashboard';

  return (
    <aside className="w-[var(--sidebar-width)] min-w-[var(--sidebar-width)] bg-[var(--sidebar)] border-r border-[var(--border)] flex flex-col p-[40px_24px] gap-[40px] relative overflow-y-auto backdrop-blur-[40px] saturate-[180%] h-screen sticky top-0 z-50">
      <div className="flex flex-col gap-2 group cursor-default">
        <div className="brand-mark text-[32px] font-black tracking-[-0.06em] uppercase leading-[0.85] text-[var(--text)]">
          LOAD<span className="text-[var(--accent)] italic">LINK</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--muted)] opacity-80">
            {t('common:brand.caption', 'Logistics Ecosystem')}
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              key={item.id}
              onClick={() => navigate(item.path)}
              onMouseEnter={() => (PAGE_PRELOADERS as any)[item.key]?.()}
              className={cn(
                "flex items-center justify-between px-5 py-4 rounded-2xl transition-all relative overflow-hidden group",
                isActive
                  ? "bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--text)] shadow-lg shadow-[var(--accent)]/5"
                  : "text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text)] border border-transparent"
              )}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/5 to-transparent animate-shimmer" />
              )}
              <div className="flex items-center gap-4 relative z-10">
                <span className={isActive ? 'text-[var(--accent)]' : 'text-inherit opacity-50 group-hover:opacity-100 group-hover:text-[var(--accent)] transition-all'}>
                  {item.icon}
                </span>
                <span className="font-black text-[11px] tracking-[0.1em] uppercase">{item.label}</span>
              </div>
              {isActive ? (
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)] relative z-10" />
              ) : (
                <span className="text-[9px] font-black opacity-20 group-hover:opacity-40 transition-opacity uppercase">{item.short}</span>
              )}
            </motion.button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-6">
        <div className="glass-card rounded-[2rem] p-5 space-y-4 group cursor-default border-white/5 hover:border-[var(--accent-soft)] transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-bright)] border border-white/10 flex items-center justify-center text-white font-black text-lg uppercase shadow-xl transition-all group-hover:scale-105">
              {profile?.name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-black text-white uppercase tracking-tight truncate">
                {profile?.name || 'User'}
              </div>
              <div className="text-[9px] text-[var(--muted)] font-black uppercase tracking-widest opacity-80">
                {profile?.role || 'Partner'}
              </div>
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => void signOut()}
          disabled={signOutLoading}
          className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 hover:border-rose-500/20 text-rose-400 transition-all font-black uppercase text-[10px] tracking-widest"
          title={t('common:account.sign_out')}
        >
          {signOutLoading ? (
            <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <LucideLogOut size={16} />
          )}
          <span>{t('common:account.sign_out')}</span>
        </motion.button>
      </div>
    </aside>
  );
}
