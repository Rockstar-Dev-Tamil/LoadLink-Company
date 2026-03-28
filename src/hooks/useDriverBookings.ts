import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type DriverBooking = {
  id: string;
  shipment_id: string;
  business_id: string;
  driver_id: string;
  status: string | null;
  current_milestone: string | null;
  agreed_price: number;
  created_at: string;
};

export function useDriverBookings(driverId: string | null | undefined) {
  const [bookings, setBookings] = useState<DriverBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!driverId) {
      setBookings([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);

    const fetch = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, shipment_id, business_id, driver_id, status, current_milestone, agreed_price, created_at')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false });

      if (!active) return;
      if (error) {
        setError(error.message);
        setBookings([]);
        setLoading(false);
        return;
      }

      setBookings((data ?? []) as unknown as DriverBooking[]);
      setError(null);
      setLoading(false);
    };

    void fetch();

    const ch = supabase
      .channel(`rt_driver_bookings_${driverId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `driver_id=eq.${driverId}`,
      }, () => void fetch())
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(ch);
    };
  }, [driverId]);

  const activeBooking = useMemo(() => {
    return bookings.find((b) => b.status === 'in_progress') ?? bookings[0] ?? null;
  }, [bookings]);

  return { bookings, activeBooking, loading, error };
}

