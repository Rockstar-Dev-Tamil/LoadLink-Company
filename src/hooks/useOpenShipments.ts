import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type OpenShipment = {
  id: string;
  business_id: string;
  pickup_address: string;
  drop_address: string;
  weight_kg: number;
  price: number;
  is_partial: boolean;
  status: string;
  created_at: string;
  bookings?: Array<{ id: string }>;
};

export function useOpenShipments() {
  const [shipments, setShipments] = useState<OpenShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchShipments = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('shipments')
        .select('id, business_id, pickup_address, drop_address, weight_kg, price, is_partial, status, created_at, bookings(id)')
        .in('status', ['pending', 'requested'])
        .order('created_at', { ascending: false });

      if (!active) return;
      if (error) {
        setError(error.message);
        setShipments([]);
        setLoading(false);
        return;
      }

      const next = ((data ?? []) as unknown as OpenShipment[]).filter((shipment) => !shipment.bookings?.length);
      setShipments(next);
      setError(null);
      setLoading(false);
    };

    void fetchShipments();

    const shipmentsChannel = supabase
      .channel('rt_open_shipments_market')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () => void fetchShipments())
      .subscribe();

    const bookingsChannel = supabase
      .channel('rt_open_shipments_bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => void fetchShipments())
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(shipmentsChannel);
      void supabase.removeChannel(bookingsChannel);
    };
  }, []);

  const totalWeightKg = useMemo(
    () => shipments.reduce((sum, shipment) => sum + Number(shipment.weight_kg || 0), 0),
    [shipments],
  );

  return { shipments, totalWeightKg, loading, error };
}
