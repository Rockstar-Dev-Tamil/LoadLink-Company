import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { analyticsService } from '../services/analyticsService';
import { useAuthStore } from '../stores/authStore';

export function useAnalytics() {
  const { user } = useAuthStore();
  const [data, setData] = useState<{
    metrics: any;
    trends: any;
    intelligence: any;
    sustainability: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    if (!data) setLoading(true);
    setError(null);

    try {
      const [metrics, trends, intelligence, sustainability] = await Promise.all([
        analyticsService.getCoreMetrics(user.id),
        analyticsService.getTrends(user.id),
        analyticsService.getLogisticsIntelligence(user.id),
        analyticsService.getSustainability(user.id)
      ]);

      if (!mountedRef.current) return;

      setData({
        metrics,
        trends,
        intelligence,
        sustainability
      });
    } catch (err: any) {
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime: Listen to multiple tables that affect analytics
  useEffect(() => {
    if (!user?.id) return;

    // Use a debounced refetch for realtime changes
    let timeout: any;
    const debouncedRefetch = () => {
      clearTimeout(timeout);
      timeout = setTimeout(fetchData, 2000);
    };

    const channels = [
      supabase.channel(`rt_analytics_shipments_${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments', filter: `business_id=eq.${user.id}` }, debouncedRefetch)
        .subscribe(),
      supabase.channel(`rt_analytics_payments_${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, debouncedRefetch)
        .subscribe(),
      supabase.channel(`rt_analytics_sust_${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sustainability' }, debouncedRefetch)
        .subscribe()
    ];

    return () => {
      clearTimeout(timeout);
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [user?.id, fetchData]);

  return {
    metrics: data?.metrics,
    trends: data?.trends,
    intelligence: data?.intelligence,
    sustainability: data?.sustainability,
    loading,
    error,
    refetch: fetchData
  };
}
