import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type FleetUserLocation = {
  device_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
};

export function useFleetUserLocations(deviceIds: string[]) {
  const [rows, setRows] = useState<Record<string, FleetUserLocation>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const idsKey = useMemo(() => [...new Set(deviceIds)].sort().join(','), [deviceIds]);
  const idSetRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    idSetRef.current = new Set(idsKey ? idsKey.split(',') : []);
  }, [idsKey]);

  useEffect(() => {
    if (!idsKey) {
      setRows({});
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);

    const fetch = async () => {
      const ids = idsKey.split(',').filter(Boolean);
      const { data, error } = await supabase
        .from('user_locations')
        .select('device_id, latitude, longitude, updated_at')
        .in('device_id', ids);

      if (!active) return;
      if (error) {
        setError(error.message);
        setRows({});
        setLoading(false);
        return;
      }

      const map: Record<string, FleetUserLocation> = {};
      (data ?? []).forEach((r: any) => {
        map[String(r.device_id)] = {
          device_id: String(r.device_id),
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          updated_at: String(r.updated_at),
        };
      });
      setRows(map);
      setError(null);
      setLoading(false);
    };

    void fetch();

    const ch = supabase
      .channel(`rt_fleet_user_locations_${idsKey.slice(0, 64)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_locations' },
        (payload) => {
          const next = payload.new as any;
          if (!next) return;
          const id = String(next.device_id);
          if (!idSetRef.current.has(id)) return;

          setRows((prev) => ({
            ...prev,
            [id]: {
              device_id: id,
              latitude: Number(next.latitude),
              longitude: Number(next.longitude),
              updated_at: String(next.updated_at),
            },
          }));
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(ch);
    };
  }, [idsKey]);

  return { rows, loading, error };
}

