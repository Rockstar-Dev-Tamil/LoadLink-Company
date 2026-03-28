import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export type DashboardStats = {
  activeShipments: number;
  deliveredShipments: number;
  pendingMatches: number;
  totalSpent: number;
  pendingPayments: number;
  failedPayments: number;
  co2Saved: number;
  distanceSaved: number;
};

const ZERO_STATS: DashboardStats = {
  activeShipments: 0,
  deliveredShipments: 0,
  pendingMatches: 0,
  totalSpent: 0,
  pendingPayments: 0,
  failedPayments: 0,
  co2Saved: 0,
  distanceSaved: 0,
};

export function useDashboardStats() {
  const { user, initialized } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>(ZERO_STATS);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchStats = useCallback(async () => {
    if (!initialized) return;

    if (!user?.id) {
      setStats(ZERO_STATS);
      setLoading(false);
      return;
    }

    try {
      const businessId = user.id;

      const [shipmentsRes, bookingsRes, paymentsRes, matchesRes] = await Promise.all([
        supabase.from('shipments').select('id, status').eq('business_id', businessId),
        supabase.from('bookings').select('id, shipment_id, status, route_id').eq('business_id', businessId),
        supabase
          .from('payments')
          .select('amount, payment_status, booking:bookings!inner(business_id)')
          .eq('booking.business_id', businessId),
        supabase
          .from('matches')
          .select('id, shipment:shipments!inner(business_id)', { count: 'exact', head: true })
          .eq('status', 'suggested')
          .eq('shipment.business_id', businessId),
      ]);

      const shipments = (shipmentsRes.data ?? []) as Array<{ id: string; status: string | null }>;
      const bookings = (bookingsRes.data ?? []) as Array<{
        id: string;
        shipment_id: string;
        status: string | null;
        route_id: string | null;
      }>;
      const payments = (paymentsRes.data ?? []) as Array<{ amount: number | null; payment_status: string | null }>;

      const bookingByShipment = new Map<string, { status: string | null }>();
      bookings.forEach((b) => bookingByShipment.set(b.shipment_id, { status: b.status ?? null }));

      const ACTIVE = new Set(['pending', 'requested', 'matched', 'in_progress']);
      const ACTIVE_BOOKING = new Set(['requested', 'matched', 'in_progress']);

      const activeShipments = shipments.filter((s) => {
        const b = bookingByShipment.get(s.id);
        if (b?.status) return ACTIVE_BOOKING.has(b.status);
        return ACTIVE.has(s.status ?? '');
      }).length;

      const deliveredShipments = shipments.filter((s) => {
        const b = bookingByShipment.get(s.id);
        if (b?.status) return b.status === 'completed';
        return (s.status ?? '') === 'completed' || (s.status ?? '') === 'delivered';
      }).length;

      const totalSpent = payments
        .filter((p) => p.payment_status === 'paid')
        .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

      const pendingPayments = payments
        .filter((p) => p.payment_status === 'pending')
        .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

      const failedPayments = payments.filter((p) => p.payment_status === 'failed').length;
      const pendingMatches = matchesRes.count ?? 0;

      const routeIds = bookings
        .filter((b) => b.status === 'completed' && !!b.route_id)
        .map((b) => b.route_id as string);

      let co2Saved = 0;
      let distanceSaved = 0;

      if (routeIds.length) {
        const { data: sustData } = await supabase
          .from('sustainability')
          .select('co2_reduction_kg, distance_saved_km')
          .in('route_id', routeIds);

        (sustData ?? []).forEach((row: any) => {
          co2Saved += Number(row.co2_reduction_kg) || 0;
          distanceSaved += Number(row.distance_saved_km) || 0;
        });
      }

      if (!mountedRef.current) return;
      setStats({
        activeShipments,
        deliveredShipments,
        pendingMatches,
        totalSpent,
        pendingPayments,
        failedPayments,
        co2Saved,
        distanceSaved,
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [initialized, user?.id]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!initialized || !user?.id) return;
    const businessId = user.id;

    const channel = supabase
      .channel(`rt_dashboard_${businessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments', filter: `business_id=eq.${businessId}` }, () => void fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `business_id=eq.${businessId}` }, () => void fetchStats())
      // Payments can't be filtered by business_id without a join filter; refetch on change is acceptable for now.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => void fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => void fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sustainability' }, () => void fetchStats())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialized, user?.id, fetchStats]);

  return { stats, loading, refresh: fetchStats };
}
