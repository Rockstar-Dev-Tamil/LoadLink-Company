import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { FullPageSpinner } from '@/components/ui/FullPageSpinner';

export function DriverGuard() {
  const { user, profile, initialized, loading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!initialized || loading) return;
    if (!user) return;
    if (!profile) return;
    if (profile.role === 'business') navigate('/dashboard', { replace: true });
  }, [initialized, loading, user, profile, navigate]);

  if (!initialized || loading) return <FullPageSpinner />;
  if (!user) return null;
  if (!profile) return <FullPageSpinner />;
  if (profile.role === 'business') return null;
  return <Outlet />;
}

