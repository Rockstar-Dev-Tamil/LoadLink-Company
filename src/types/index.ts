export interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: any;
  trend?: string;
  trendDir?: 'up' | 'down';
  color?: 'cyan' | 'purple' | 'indigo' | 'emerald' | 'amber';
  change?: string;
  subtext?: string;
}
