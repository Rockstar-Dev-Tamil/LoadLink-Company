import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export type DriverProfile = {
  id: string;
  name: string;
  email: string;
  home_city: string | null;
  trucks: {
    vehicle_number: string | null;
    vehicle_type: string;
    ulip_verified: boolean | null;
  }[];
  user_locations: {
    latitude: number;
    longitude: number;
    updated_at: string;
  } | null;
};

export function useDrivers() {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, name, email, home_city,
          trucks!trucks_driver_id_fkey(vehicle_number, vehicle_type, ulip_verified),
          user_locations(latitude, longitude, updated_at)
        `)
        .eq('role', 'driver');

      if (error) throw error;
      setDrivers((data || []) as any);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();

    // Subscribe to location updates
    const channel = supabase
      .channel('drivers-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_locations' 
      }, (payload) => {
        setDrivers(current => current.map(driver => {
          const newLoc = payload.new as any;
          if (newLoc.device_id === driver.id) {
            return {
              ...driver,
              user_locations: {
                latitude: newLoc.latitude,
                longitude: newLoc.longitude,
                updated_at: newLoc.updated_at
              }
            };
          }
          return driver;
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { drivers, loading, refresh: fetchDrivers };
}
