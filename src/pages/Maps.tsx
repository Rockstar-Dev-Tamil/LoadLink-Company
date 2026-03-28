import { useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Topbar } from '../components/Topbar';
import { useShipments } from '@/hooks/useShipments';
import { useFleetUserLocations, type FleetUserLocation } from '@/hooks/useFleetUserLocations';
import { FleetIntelMap } from '@/components/FleetIntelMap';
import { toast } from 'sonner';

/**
 * Maps Page: Network-Wide Logistics Demo
 * Provides a high-fidelity standalone logistics simulation across the network.
 */
export default function Maps() {
  useTranslation(['tracking', 'common']);
  const { shipments, error } = useShipments();

  const driverIds = useMemo(() => {
    return shipments
      .map((s) => s.bookings?.[0]?.driver_id)
      .filter((v): v is string => !!v);
  }, [shipments]);

  const live = useFleetUserLocations(driverIds);

  const liveByDriverId = useMemo(() => {
    const out: Record<string, { lat: number; lng: number; updated_at: string }> = {};
    Object.values(live.rows as Record<string, FleetUserLocation>).forEach((r) => {
      out[r.device_id] = { lat: r.latitude, lng: r.longitude, updated_at: r.updated_at };
    });
    return out;
  }, [live.rows]);

  const mapShipments = useMemo(() => {
    return shipments
      .filter((s) => s.pickup_location?.coordinates && s.drop_location?.coordinates)
      .slice(0, 30)
      .map((s) => {
        const o = s.pickup_location!.coordinates;
        const d = s.drop_location!.coordinates;
        return {
          id: s.id,
          origin: { lat: o[1], lng: o[0] },
          destination: { lat: d[1], lng: d[0] },
          driverId: s.bookings?.[0]?.driver_id ?? null,
        };
      });
  }, [shipments]);

  const lastErrorRef = useRef<string>('');
  useEffect(() => {
    if (!error) return;
    if (lastErrorRef.current === error) return;
    lastErrorRef.current = error;
    toast.error(error);
  }, [error]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--surface)]">
      <Topbar 
        title="FLEET INTELLIGENCE" 
        subtitle="Network live: shipments, terminals, and driver devices." 
      />
      
      <main className="flex-1 p-2 sm:p-6 lg:p-8 flex flex-col min-h-0">
        <div className="flex-1 relative rounded-3xl sm:rounded-[40px] overflow-hidden border border-[var(--border-strong)] shadow-[0_32px_64px_rgba(0,0,0,0.4)] bg-[var(--surface-strong)]">
          <FleetIntelMap shipments={mapShipments} liveByDriverId={liveByDriverId} />
          
          {/* Simulation Status Overlay */}
          <div className="absolute top-4 sm:top-8 left-4 sm:left-8 z-10 pointer-events-none">
            <div className="glass-panel !py-3 sm:!py-4 !px-4 sm:!px-6 flex items-center gap-3 sm:gap-4 backdrop-blur-3xl border border-white/10 shadow-2xl rounded-xl sm:rounded-2xl">
              <div className="relative">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 animate-pulse" />
                <div className="absolute inset-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500/50 animate-ping" />
              </div>
              <div>
                <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white/50 mb-0.5"> System Status </div>
                <div className="text-xs sm:text-sm font-black text-white uppercase tracking-wider"> Network Live </div>
              </div>
            </div>
          </div>

          {/* Map Overlay Badge */}
          <div className="absolute top-4 sm:top-8 right-4 sm:right-8 z-10 hidden sm:block">
            <div className="glass-panel !py-3 !px-5 backdrop-blur-xl border border-white/10 shadow-xl rounded-xl">
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1 text-right">Coordinate System</div>
              <div className="text-xs font-mono text-white/90">WGS84 | EPSG:4326</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
