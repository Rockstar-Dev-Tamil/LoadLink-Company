import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type UserLocationRow = {
  id: string;
  device_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
};

const haversineMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371e3;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

export function useUserLocation(deviceId: string | null | undefined) {
  const [row, setRow] = useState<UserLocationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState<Array<{ lat: number; lng: number }>>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!deviceId) {
      setRow(null);
      setPath([]);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    const fetch = async () => {
      const { data, error } = await supabase
        .from('user_locations')
        .select('id, device_id, latitude, longitude, updated_at')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (!active || !mountedRef.current) return;
      if (error) {
        setRow(null);
        setPath([]);
        setError(error.message);
        setLoading(false);
        return;
      }

      const next = (data ?? null) as unknown as UserLocationRow | null;
      setRow(next);
      if (next) setPath([{ lat: next.latitude, lng: next.longitude }]);
      setError(null);
      setLoading(false);
    };

    void fetch();

    const ch = supabase
      .channel(`rt_user_locations_${deviceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_locations',
        filter: `device_id=eq.${deviceId}`,
      }, (payload) => {
        if (!mountedRef.current) return;
        
        // Handle both INSERT and UPDATE
        const next = (payload.new || payload.old) as unknown as UserLocationRow;
        if (!next || !next.latitude) return;
        
        setRow(next);
        setError(null);
        setPath((prev) => {
          const nextPoint = { lat: next.latitude, lng: next.longitude };
          const last = prev[0];
          // Avoid noise; append only after ~5m movement.
          if (last && haversineMeters(last, nextPoint) < 5) return prev;
          const updated = [nextPoint, ...prev];
          return updated.slice(0, 500); // Keep more history for smoother maps
        });
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(ch);
    };
  }, [deviceId]);

  const latest = useMemo(() => {
    if (!row) return null;
    return {
      latitude: row.latitude,
      longitude: row.longitude,
      updated_at: row.updated_at,
    };
  }, [row]);

  const location = useMemo(() => {
    if (!row) return null;
    return { lat: row.latitude, lng: row.longitude };
  }, [row]);

  return { row, latest, location, path, loading, error };
}
