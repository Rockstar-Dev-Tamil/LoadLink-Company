import { useMemo, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LucideLayoutDashboard, LucideBox, LucideMapPin, LucideMap, LucideMessageSquare, LucideSettings } from 'lucide-react';
import { cn } from '../../lib/utils';

type NavItem = {
  id: string;
  path: string;
  label: string;
  icon: ReactNode;
};

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const items = useMemo<NavItem[]>(() => [
    { id: 'dashboard', path: '/dashboard', label: 'Home', icon: <LucideLayoutDashboard size={20} /> },
    { id: 'shipments', path: '/shipments', label: 'Ship', icon: <LucideBox size={20} /> },
    { id: 'tracking', path: '/tracking', label: 'Track', icon: <LucideMapPin size={20} /> },
    { id: 'maps', path: '/maps', label: 'Maps', icon: <LucideMap size={20} /> },
    { id: 'messages', path: '/messages', label: 'Chat', icon: <LucideMessageSquare size={20} /> },
    { id: 'settings', path: '/settings', label: 'Settings', icon: <LucideSettings size={20} /> },
  ], []);

  const activePath = location.pathname.startsWith('/navigation') ? '/tracking' : location.pathname;
  const activeId = items.find((item) => activePath.startsWith(item.path))?.id ?? 'dashboard';

  return (
    <nav
      className="bottom-nav lg:hidden"
      aria-label="Bottom navigation"
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(item.path)}
            className={cn(
              'bottom-nav-item',
              active ? 'bottom-nav-item--active' : 'bottom-nav-item--idle',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <span className={cn('bottom-nav-icon', active ? 'text-[var(--text)]' : 'text-[var(--muted)]')}>
              {item.icon}
            </span>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
