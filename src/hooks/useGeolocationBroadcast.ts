import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type BroadcastState = {
  enabled: boolean;
  lastError: string | null;
  lastSentAt: string | null;
  lastLatLng: { lat: number; lng: number } | null;
  lastSpeedKmh: number | null;
};

export function useGeolocationBroadcast(deviceId: string | null | undefined) {
  const [state, setState] = useState<BroadcastState>({
    enabled: false,
    lastError: null,
    lastSentAt: null,
    lastLatLng: null,
    lastSpeedKmh: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const sendingRef = useRef(false);
  const lastSentMsRef = useRef(0);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    sendingRef.current = false;
    setState((s) => ({ ...s, enabled: false }));
  }, []);

  const start = useCallback(() => {
    if (!deviceId) {
      setState((s) => ({ ...s, lastError: 'No device selected for broadcast.' }));
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState((s) => ({ ...s, lastError: 'Geolocation is unavailable on this device/browser.' }));
      return;
    }

    setState((s) => ({ ...s, enabled: true, lastError: null }));

    // Throttle DB writes to avoid spamming Supabase.
    const minIntervalMs = 900;

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        if (!deviceId) return;
        const now = Date.now();
        if (now - lastSentMsRef.current < minIntervalMs) return;
        if (sendingRef.current) return;

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        sendingRef.current = true;
        try {
          // Writer: upsert live location by device_id.
          const { error } = await supabase
            .from('user_locations')
            .upsert({
              device_id: deviceId,
              latitude: lat,
              longitude: lng,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'device_id' });

          if (error) throw error;

          lastSentMsRef.current = now;
          setState((s) => ({
            ...s,
            lastError: null,
            lastSentAt: new Date().toISOString(),
            lastLatLng: { lat, lng },
            lastSpeedKmh: null,
          }));
        } catch (err: any) {
          setState((s) => ({
            ...s,
            lastError: err?.message || 'Unable to broadcast location right now.',
          }));
        } finally {
          sendingRef.current = false;
        }
      },
      (err) => {
        setState((s) => ({ ...s, lastError: err?.message || 'Geolocation permission denied.' }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 8000,
      },
    );

    watchIdRef.current = id;
  }, [deviceId]);

  // Stop broadcasting if the booking changes (prevents sending wrong booking_id).
  useEffect(() => {
    if (!state.enabled) return;
    if (!deviceId) stop();
  }, [deviceId, state.enabled, stop]);

  // Cleanup on unmount
  useEffect(() => stop, [stop]);

  return {
    enabled: state.enabled,
    lastError: state.lastError,
    lastSentAt: state.lastSentAt,
    lastLatLng: state.lastLatLng,
    lastSpeedKmh: state.lastSpeedKmh,
    start,
    stop,
  };
}
