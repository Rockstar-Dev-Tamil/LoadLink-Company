import { useTranslation } from 'react-i18next';
import { LucideLayoutDashboard, LucideBox, LucideUserRound, LucideMapPin, LucideMap, LucideWallet, LucideBarChart3, LucideSettings, LucideLogOut, LucideMessageSquare, LucideRoute } from 'lucide-react';
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
    { id: 'dashboard', path: '/dashboard', label: t('nav.dashboard', 'Dashboard'), short: '', icon: <LucideLayoutDashboard size={20} />, key: 'dashboard' },
    { id: 'shipments', path: '/shipments', label: t('nav.shipments', 'Shipments'), short: '', icon: <LucideBox size={20} />, key: 'shipments' },
    { id: 'drivers', path: '/drivers', label: t('nav.drivers', 'Drivers'), short: '', icon: <LucideUserRound size={20} />, key: 'drivers' },
    { id: 'tracking', path: '/tracking', label: t('nav.tracking', 'Tracking'), short: '', icon: <LucideMapPin size={20} />, key: 'tracking' },
    /* id: 'maps', path: '/maps', label: t('nav.maps', 'Maps'), short: '', icon: <LucideMap size={20} />, key: 'maps' },*/
    { id: 'simulator', path: '/simulator', label: t('nav.simulator', 'Simulator'), short: '', icon: <LucideRoute size={20} />, key: 'simulator' },
    { id: 'messages', path: '/messages', label: t('nav.messages', 'Messages'), short: '', icon: <LucideMessageSquare size={20} />, key: 'messages' },
    { id: 'payments', path: '/payments', label: t('nav.payments', 'Payments'), short: '', icon: <LucideWallet size={20} />, key: 'payments' },
    { id: 'analytics', path: '/analytics', label: t('nav.analytics', 'Analytics'), short: '', icon: <LucideBarChart3 size={20} />, key: 'analytics' },
    { id: 'settings', path: '/settings', label: t('nav.settings', 'Settings'), short: '', icon: <LucideSettings size={20} />, key: 'settings' },
  ];

  const activeTab = navItems.find(item => {
    if (item.path === '/dashboard') return location.pathname === '/' || location.pathname === '/dashboard';
    return location.pathname.startsWith(item.path);
  })?.id || 'dashboard';

  return (
    <aside className="w-[var(--sidebar-width)] min-w-[var(--sidebar-width)] bg-[var(--sidebar)] border-r border-[var(--border)] flex flex-col p-6 gap-8 relative overflow-y-auto backdrop-blur-[24px] saturate-[130%] h-screen sticky top-0 z-50">
      <div className="flex flex-col gap-4 group cursor-default">
        <div className="flex flex-col gap-1">
          <div className="brand-mark text-[26px] font-semibold tracking-[-0.05em] text-[var(--text)]">
            LoadLink
          </div>
          <div className="text-[11px] font-medium tracking-[0.08em] uppercase text-[var(--muted)]">
            {t('common:brand.caption', 'MSME Portal')}
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.99 }}
              key={item.id}
              onClick={() => navigate(item.path)}
              onMouseEnter={() => (PAGE_PRELOADERS as any)[item.key]?.()}
              className={cn(
                "flex items-center justify-between px-4 py-4 rounded-[16px] transition-all relative overflow-hidden group",
                isActive
                  ? "bg-[var(--surface-strong)] border border-[var(--border-strong)] text-[var(--text)] shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text)] border border-transparent"
              )}
            >
              <div className="flex items-center gap-4 relative z-10">
                <span className={isActive ? 'text-[var(--text)] opacity-90' : 'text-inherit opacity-60 group-hover:opacity-100 transition-all'}>
                  {item.icon}
                </span>
                <span className="font-medium text-[14px] tracking-[-0.01em]">{item.label}</span>
              </div>
              {isActive ? (
                <div className="h-2 w-2 rounded-full bg-[var(--text)]/85 relative z-10" />
              ) : (
                <span className="text-[10px] font-medium opacity-20 group-hover:opacity-40 transition-opacity">{item.short}</span>
              )}
            </motion.button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-6">
        <div className="glass-card rounded-[18px] p-4 space-y-4 group cursor-default transition-all">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-[14px] bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] font-semibold text-base uppercase">
              {profile?.name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-[var(--text)] tracking-[-0.01em] truncate">
                {profile?.name || 'User'}
              </div>
              <div className="text-[11px] text-[var(--muted)] font-medium tracking-[-0.01em]">
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
          className="flex items-center justify-center gap-3 w-full py-3.5 rounded-[14px] bg-[var(--surface-soft)] border border-[var(--border)] hover:bg-[var(--surface-strong)] hover:border-[var(--border-strong)] text-[var(--muted-strong)] transition-all font-medium text-[13px]"
          title={t('common:account.sign_out')}
        >
          {signOutLoading ? (
            <div className="w-4 h-4 border-2 border-[var(--muted-strong)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <LucideLogOut size={16} />
          )}
          <span>{t('common:account.sign_out')}</span>
        </motion.button>
      </div>
    </aside>
  );
}
