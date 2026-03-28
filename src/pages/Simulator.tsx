import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Topbar } from '@/components/Topbar';
import { LucideRoute, LucidePlay, LucideSquare, LucideRefreshCcw, LucideTruck, LucideGauge, LucideMapPin } from 'lucide-react';

type LatLng = { lat: number; lng: number };

const OSRM_BASE = (import.meta as any).env?.VITE_OSRM_BASE_URL || 'https://router.project-osrm.org';

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const createTruckIcon = () =>
  L.divIcon({
    className: 'truck-marker-wrapper',
    html: `
      <div class="driver-marker">
        <div class="truck-pin" style="transform: rotate(0deg)">
          <svg viewBox="0 0 24 24" fill="rgba(70,127,227,0.95)" stroke="white" stroke-width="0.5">
            <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5zm-14 10.5c-.83 0-1.5-.67-1.5-1.5S5.17 15.5 6 15.5s1.5.67 1.5 1.5S6.83 18.5 6 18.5zm9-9h3.5l1.96 2.5H15V9.5zm2 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"></path>
          </svg>
        </div>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });

function FitRoute({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);
  return null;
}

export default function Simulator() {
  const { user, profile } = useAuthStore();
  const [deviceId, setDeviceId] = useState<string>('');

  const [origin, setOrigin] = useState<LatLng>({ lat: 12.9716, lng: 77.5946 }); // Bengaluru
  const [dest, setDest] = useState<LatLng>({ lat: 13.0827, lng: 80.2707 }); // Chennai

  const [routePoints, setRoutePoints] = useState<LatLng[]>([]);
  const [routeDistanceM, setRouteDistanceM] = useState<number | null>(null);
  const [routeDurationS, setRouteDurationS] = useState<number | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1.4); // points/sec
  const [cursor, setCursor] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const truck = useMemo<LatLng>(() => {
    if (routePoints.length && cursor >= 0 && cursor < routePoints.length) return routePoints[cursor];
    return origin;
  }, [routePoints, cursor, origin]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    // Default device_id to auth.uid(). Drivers should keep this (RLS-safe).
    setDeviceId(user.id);
  }, [user?.id]);

  const broadcastLocation = async (p: LatLng) => {
    if (!deviceId) {
      toast.error('Enter a device_id (UUID).');
      return;
    }
    if (!isUuid(deviceId)) {
      toast.error('device_id must be a UUID (match profiles.id / driver_id).');
      return;
    }
    const { error } = await supabase
      .from('user_locations')
      .upsert(
        {
          device_id: deviceId,
          latitude: p.lat,
          longitude: p.lng,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'device_id' },
      );
    if (error) throw error;
  };

  const fetchRoute = async () => {
    setRouteLoading(true);
    try {
      const url =
        `${OSRM_BASE}/route/v1/driving/` +
        `${origin.lng},${origin.lat};${dest.lng},${dest.lat}` +
        `?overview=full&geometries=geojson&steps=false`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`OSRM failed (${res.status})`);
      const json = await res.json();
      const r = json?.routes?.[0];
      const coords: Array<[number, number]> = r?.geometry?.coordinates ?? [];
      if (!coords.length) throw new Error('No route geometry returned.');
      const points: LatLng[] = coords.map(([lng, lat]) => ({ lat, lng }));
      setRoutePoints(points);
      setRouteDistanceM(typeof r?.distance === 'number' ? r.distance : null);
      setRouteDurationS(typeof r?.duration === 'number' ? r.duration : null);
      setCursor(0);
      toast.success('Route ready');
    } catch (err: any) {
      toast.error(err?.message || 'Unable to fetch route');
      setRoutePoints([]);
      setRouteDistanceM(null);
      setRouteDurationS(null);
      setCursor(0);
    } finally {
      setRouteLoading(false);
    }
  };

  const stop = () => {
    setRunning(false);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const start = async () => {
    if (!routePoints.length) {
      toast.error('Fetch route first.');
      return;
    }
    if (running) return;
    setRunning(true);

    const tickMs = Math.max(240, Math.round(1000 / Math.max(0.3, speed)));
    intervalRef.current = window.setInterval(async () => {
      if (!mountedRef.current) return;
      setCursor((c) => {
        const next = Math.min(routePoints.length - 1, c + 1);
        return next;
      });
    }, tickMs);
  };

  // Push to Supabase whenever the simulated truck moves.
  useEffect(() => {
    if (!running) return;
    if (!routePoints.length) return;
    if (cursor < 0 || cursor >= routePoints.length) return;
    void (async () => {
      try {
        await broadcastLocation(routePoints[cursor]);
      } catch (err: any) {
        toast.error(err?.message || 'Broadcast blocked (RLS?)');
        stop();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, running]);

  useEffect(() => {
    if (!running) return;
    if (cursor >= routePoints.length - 1) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, running, routePoints.length]);

  const roleLabel = profile?.role ? profile.role.toUpperCase() : 'USER';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Simulator" subtitle="OSRM route replay + realtime `user_locations` broadcaster." />

      <div className="page-scroll pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px] gap-6 min-w-0">
          <div className="min-w-0">
            <div className="card !p-0 overflow-hidden bg-[var(--surface-strong)]">
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="section-label">SIMULATION MAP</div>
                  <div className="text-base font-black text-[var(--text)] tracking-tight flex items-center gap-2">
                    <LucideTruck size={16} className="text-[var(--accent)]" />
                    Truck Replay
                    <span className="pill pill--muted font-mono">{roleLabel}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`pill ${running ? 'pill--success' : 'pill--muted'}`}>{running ? 'LIVE' : 'IDLE'}</span>
                </div>
              </div>

              <div className="relative h-[54dvh] min-h-[360px] lg:h-[calc(100dvh-260px)]">
                <MapContainer
                  center={[origin.lat, origin.lng]}
                  zoom={6}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />

                  {!!routePoints.length && (
                    <>
                      <Polyline positions={routePoints.map((p) => [p.lat, p.lng] as [number, number])} pathOptions={{ color: '#467fe3', weight: 5, opacity: 0.85 }} />
                      <FitRoute points={routePoints} />
                    </>
                  )}

                  <Marker position={[origin.lat, origin.lng]} />
                  <Marker position={[dest.lat, dest.lng]} />
                  <Marker position={[truck.lat, truck.lng]} icon={createTruckIcon()} zIndexOffset={1000} />
                </MapContainer>

                <div className="absolute top-4 left-4 z-[1001]">
                  <div className="glass-panel !py-3 !px-4 rounded-2xl border border-[var(--border)]">
                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Truck</div>
                    <div className="mt-1 text-[12px] font-black text-[var(--text)] font-mono">
                      {truck.lat.toFixed(5)}, {truck.lng.toFixed(5)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 flex flex-col gap-6">
            <div className="card space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="section-label">DEVICE</div>
                  <div className="text-[12px] font-black text-[var(--text)] uppercase tracking-widest">
                    device_id = driver_id
                  </div>
                </div>
                <div className="pill pill--muted font-mono">{deviceId ? deviceId.slice(0, 8).toUpperCase() : '--'}</div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase text-[var(--muted)] tracking-widest">Device ID (UUID)</div>
                <input
                  className="text-field"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="must be a UUID"
                  disabled={profile?.role === 'driver'}
                />
                {profile?.role === 'driver' && (
                  <div className="text-[11px] font-bold text-[var(--muted)]">
                    Locked to your driver account for RLS safety.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-black uppercase text-[var(--muted)] tracking-widest flex items-center gap-2">
                    <LucideMapPin size={14} /> Origin
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="text-field" type="number" step="0.0001" value={origin.lat} onChange={(e) => setOrigin((p) => ({ ...p, lat: Number(e.target.value) }))} />
                    <input className="text-field" type="number" step="0.0001" value={origin.lng} onChange={(e) => setOrigin((p) => ({ ...p, lng: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[10px] font-black uppercase text-[var(--muted)] tracking-widest flex items-center gap-2">
                    <LucideMapPin size={14} /> Destination
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="text-field" type="number" step="0.0001" value={dest.lat} onChange={(e) => setDest((p) => ({ ...p, lat: Number(e.target.value) }))} />
                    <input className="text-field" type="number" step="0.0001" value={dest.lng} onChange={(e) => setDest((p) => ({ ...p, lng: Number(e.target.value) }))} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="secondary-button !min-h-[52px] flex items-center justify-center gap-2"
                  onClick={fetchRoute}
                  disabled={routeLoading || running}
                >
                  <LucideRoute size={16} />
                  {routeLoading ? 'Fetching…' : 'Fetch Route'}
                </button>
                <button
                  type="button"
                  className="primary-button !min-h-[52px] flex items-center justify-center gap-2"
                  onClick={async () => {
                    try {
                      await broadcastLocation(truck);
                      toast.success('Broadcast sent');
                    } catch (err: any) {
                      toast.error(err?.message || 'Broadcast blocked (RLS?)');
                    }
                  }}
                  disabled={running}
                >
                  <LucideRefreshCcw size={16} />
                  Broadcast Once
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase text-[var(--muted)] tracking-widest flex items-center gap-2">
                    <LucideGauge size={14} /> Speed
                  </div>
                  <div className="text-[11px] font-black text-[var(--text)] font-mono">{speed.toFixed(1)} pts/s</div>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={6}
                  step={0.2}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full"
                  disabled={running}
                />
              </div>

              {!running ? (
                <button
                  type="button"
                  className="primary-button !min-h-[56px] flex items-center justify-center gap-2"
                  onClick={start}
                  disabled={!routePoints.length}
                >
                  <LucidePlay size={18} />
                  Start Simulation
                </button>
              ) : (
                <button
                  type="button"
                  className="ghost-button !min-h-[56px] flex items-center justify-center gap-2 !text-rose-400 !border-rose-500/20"
                  onClick={stop}
                >
                  <LucideSquare size={18} />
                  Stop
                </button>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="mini-card !p-3">
                  <div className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Distance</div>
                  <div className="mt-2 text-xs font-black text-[var(--text)]">
                    {routeDistanceM ? `${(routeDistanceM / 1000).toFixed(1)} km` : '--'}
                  </div>
                </div>
                <div className="mini-card !p-3">
                  <div className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Duration</div>
                  <div className="mt-2 text-xs font-black text-[var(--text)]">
                    {routeDurationS ? `${Math.round(routeDurationS / 60)} min` : '--'}
                  </div>
                </div>
                <div className="mini-card !p-3">
                  <div className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Cursor</div>
                  <div className="mt-2 text-xs font-black text-[var(--text)] font-mono">
                    {routePoints.length ? `${cursor + 1}/${routePoints.length}` : '--'}
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-bold text-[var(--muted)] leading-relaxed">
                To see this in Tracking: your booking must have <span className="font-mono text-[var(--text)]">bookings.driver_id = device_id</span>,
                and your Supabase RLS must allow this role to upsert its own row in <span className="font-mono text-[var(--text)]">user_locations</span>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
