import { supabase } from '../lib/supabase';

export const analyticsService = {
  async getCoreMetrics(businessId: string) {
    const { data: shipments, error: shipError } = await supabase
      .from('shipments')
      .select('status, price')
      .eq('business_id', businessId);

    if (shipError) throw shipError;

    const items = shipments || [];
    const totalShipments = items.length;
    const activeShipments = items.filter(s => !['delivered', 'cancelled'].includes(s.status)).length;
    const completedShipments = items.filter(s => s.status === 'delivered').length;
    const totalSpent = items.reduce((acc, s) => acc + (Number(s.price) || 0), 0);
    const avgCost = totalShipments > 0 ? totalSpent / totalShipments : 0;
    const completionRate = totalShipments > 0 ? (completedShipments / totalShipments) * 100 : 0;

    return {
      totalShipments,
      activeShipments,
      completedShipments,
      totalSpent,
      avgCost,
      completionRate
    };
  },

  async getTrends(businessId: string) {
    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select('amount, created_at, payment_status, bookings!inner(business_id)')
      .eq('bookings.business_id', businessId)
      .eq('payment_status', 'paid');

    if (payError) throw payError;

    const { data: shipments, error: shipError } = await supabase
      .from('shipments')
      .select('id')
      .eq('business_id', businessId);

    if (shipError) throw shipError;

    const groupByDate = (items: any[]) => {
      const groups: Record<string, number> = {};
      items.forEach(item => {
        const date = new Date(item.created_at).toISOString().split('T')[0];
        groups[date] = (groups[date] || 0) + (Number(item.amount) || 1);
      });
      return Object.entries(groups).map(([date, value]) => ({ date, value })).sort((a,b) => a.date.localeCompare(b.date));
    };

    return {
      revenueTrend: groupByDate(payments || []),
      shipmentTrend: (shipments || []).map((item, index) => ({
        date: `shipment-${index + 1}`,
        value: 1,
      }))
    };
  },

  async getLogisticsIntelligence(businessId: string) {
    const { data: shipments, error: error } = await supabase
      .from('shipments')
      .select('pickup_address, drop_address, weight_kg')
      .eq('business_id', businessId);

    if (error) throw error;

    const items = shipments || [];
    const routeCounts: Record<string, number> = {};
    items.forEach(s => {
      const route = `${s.pickup_address?.split(',')[0] || 'Unknown'} → ${s.drop_address?.split(',')[0] || 'Unknown'}`;
      routeCounts[route] = (routeCounts[route] || 0) + 1;
    });
    
    const mostUsedRoutes = Object.entries(routeCounts)
      .map(([route, count]) => ({ route, count }))
      .sort((a,b) => b.count - a.count)
      .slice(0, 5);

    const avgWeight = items.length > 0 ? items.reduce((acc, s) => acc + (Number(s.weight_kg) || 0), 0) / items.length : 0;

    return {
      mostUsedRoutes,
      avgWeight,
      totalWeight: items.reduce((acc, s) => acc + (Number(s.weight_kg) || 0), 0)
    };
  },

  async getSustainability(businessId: string) {
    const { data, error } = await supabase
      .from('sustainability')
      .select(`
        *,
        routes!inner (
          id,
          bookings!inner (
            business_id
          )
        )
      `)
      .eq('routes.bookings.business_id', businessId);

    if (error) return { co2_reduction_kg: 0, distance_saved_km: 0, fuel_saved_liters: 0 };

    const totals = (data || []).reduce((acc, curr) => ({
      co2_reduction_kg: acc.co2_reduction_kg + (Number(curr.co2_reduction_kg) || 0),
      distance_saved_km: acc.distance_saved_km + (Number(curr.distance_saved_km) || 0),
      fuel_saved_liters: acc.fuel_saved_liters + (Number(curr.fuel_saved_liters) || 0)
    }), { co2_reduction_kg: 0, distance_saved_km: 0, fuel_saved_liters: 0 });

    return totals;
  }
};
