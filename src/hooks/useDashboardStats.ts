import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export function useDashboardStats() {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState({
    activeShipments: 0,
    deliveredShipments: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    co2Saved: 0,
    distanceSaved: 0,
    failedPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!profile?.id) return;

    try {
      const [shipmentsRes, paymentsRes, matchesRes, bookingsRes] = await Promise.all([
        // 1. Shipments (for Active count)
        supabase.from('shipments')
          .select('id, status')
          .eq('business_id', profile.id),

        // 2. Total Paid
        supabase.from('payments')
          .select('amount, payment_status, booking:bookings!inner(business_id)')
          .eq('booking.business_id', profile.id)
          .eq('payment_status', 'paid'),

        // 3. Pending Matches Count
        supabase.from('matches')
          .select('id, shipment:shipments!inner(business_id)', { count: 'exact', head: true })
          .eq('status', 'suggested')
          .eq('shipment.business_id', profile.id),

        // 4. CO2 saved via completed bookings
        supabase.from('bookings')
          .select('route_id')
          .eq('business_id', profile.id)
          .eq('status', 'completed')
          .not('route_id', 'is', null)
      ]);

      const shipments = shipmentsRes.data || [];
      const activeShipments = shipments.filter(s => ['pending', 'matched', 'in_transit'].includes(s.status)).length;

      const totalSpent = (paymentsRes.data || []).reduce((acc, p) => acc + (p.amount || 0), 0);
      const pendingMatches = matchesRes.count || 0;

      const routeIds = (bookingsRes.data || []).map(b => b.route_id).filter(Boolean) as string[];
      let co2Saved = 0;

      if (routeIds.length > 0) {
        const { data: sustData } = await supabase
          .from('sustainability')
          .select('co2_reduction_kg')
          .in('route_id', routeIds);
        
        co2Saved = (sustData || []).reduce((acc, s) => acc + (s.co2_reduction_kg || 0), 0);
      }

      setStats({
        activeShipments,
        pendingMatches, // Added to local state
        totalSpent,     // Renamed/Standardized
        co2Saved,
        deliveredShipments: shipments.filter(s => s.status === 'delivered').length, // For trend/extra context
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    if (!profile?.id) return;

    const channel = supabase
      .channel(`dashboard_stats_realtime:${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments', filter: `business_id=eq.${profile.id}` }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchStats())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return { stats, loading, refresh: fetchStats };
}
