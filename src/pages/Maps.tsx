import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LucideMapPin, LucideNavigation } from 'lucide-react';
import { Topbar } from '../components/Topbar';
import { Skeleton } from '../components/Skeleton';
import { LiveTrackingMap, TrackedShipment } from '../components/LiveTrackingMap';
import { useShipments } from '../hooks/useShipments';
import { useTracking } from '../hooks/useTracking';
import { useMatchedVehicles } from '../hooks/useMatchedVehicles';
import { useUserLocation } from '../hooks/useUserLocation';

export default function Maps() {
  const { t } = useTranslation(['tracking', 'common']);
  const { shipments, loading } = useShipments();
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [routeDetails, setRouteDetails] = useState<Record<string, any>>({});

  const trackableShipments = useMemo(() => {
    return shipments.filter((shipment) => ['requested', 'matched', 'in_progress'].includes(shipment.status));
  }, [shipments]);

  const activeShipment = useMemo(() => {
    if (selectedShipmentId) {
      return trackableShipments.find((shipment) => shipment.id === selectedShipmentId) || trackableShipments[0];
    }
    return trackableShipments[0];
  }, [trackableShipments, selectedShipmentId]);

  const activeBooking = activeShipment?.bookings?.[0];
  const live = useUserLocation(activeBooking?.driver_id ?? null);
  const { location } = useTracking(activeBooking?.id);
  const { vehicles: matchedVehicles } = useMatchedVehicles(activeShipment?.id || null);

  const candidates = useMemo(() => {
    return matchedVehicles
      .filter((vehicle) => vehicle.location)
      .map((vehicle) => ({
        id: vehicle.truckId,
        location: vehicle.location!,
        label: vehicle.registrationNumber || 'Candidate',
      }));
  }, [matchedVehicles]);

  const mappedShipments: TrackedShipment[] = useMemo(() => {
    return trackableShipments
      .filter((shipment) => shipment.pickup_location?.coordinates && shipment.drop_location?.coordinates)
      .map((shipment) => {
        const originCoord = shipment.pickup_location!.coordinates;
        const destCoord = shipment.drop_location!.coordinates;

        let truckLoc;
        if (shipment.id === activeShipment?.id && live.location) {
          truckLoc = { lat: live.location.lat, lng: live.location.lng };
        } else if (shipment.id === activeShipment?.id && location?.coordinates) {
          truckLoc = { lat: location.coordinates[1], lng: location.coordinates[0] };
        }

        return {
          id: shipment.id,
          origin: { lat: originCoord[1], lng: originCoord[0] },
          destination: { lat: destCoord[1], lng: destCoord[0] },
          truckLocation: truckLoc,
          status: shipment.status,
        };
      });
  }, [trackableShipments, activeShipment?.id, live.location, location]);

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Topbar title="Maps" />
        <div className="page-scroll">
          <Skeleton className="h-[70vh] w-full rounded-[32px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Maps" subtitle="OSRM routing overlays for your live shipments" />

      <div className="page-scroll pb-24">
        <div className="card hero-card mb-6">
          <div className="hero-copy">
            <div className="section-label">MAPS</div>
            <h1 className="hero-title">OSRM-powered route intelligence for every active lane.</h1>
            <p className="hero-description">
              This view uses the OSRM routing layer in your map component and updates as shipments and tracking coordinates change in Supabase.
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl h-[70vh] min-h-[520px]">
          <LiveTrackingMap
            shipments={mappedShipments}
            onSelectShipment={setSelectedShipmentId}
            onRouteDataUpdate={(id, data) => setRouteDetails((prev) => ({ ...prev, [id]: data }))}
            candidates={candidates}
            activeShipmentId={activeShipment?.id ?? null}
          />

          {activeShipment && routeDetails[activeShipment.id] && (
            <div className="absolute bottom-6 left-6 right-6 p-1 bg-[var(--surface-strong)] border border-[var(--border-strong)] rounded-[22px] backdrop-blur-xl z-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-5">
                  <div className="w-11 h-11 rounded-[14px] bg-[var(--accent)] flex items-center justify-center text-white">
                    <LucideNavigation size={22} className="rotate-45" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">
                      {t('tracking:intelligence.eta', 'Est. Intersection')}
                    </div>
                    <div className="text-[15px] font-black text-[var(--text)]">
                      {Math.round(routeDetails[activeShipment.id].duration / 60)} {t('tracking:intelligence.min', 'min')}
                    </div>
                  </div>
                </div>
                <div className="h-10 w-px bg-[var(--border)]" />
                <div className="flex flex-col items-end">
                  <div className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">
                    {t('tracking:intelligence.distance', 'Remaining')}
                  </div>
                  <div className="text-[15px] font-black text-[var(--text)]">
                    {(routeDetails[activeShipment.id].distance / 1000).toFixed(1)} km
                  </div>
                </div>
              </div>
              <div className="h-1 rounded-full bg-white/5 mx-6 mb-1 overflow-hidden">
                <div className="h-full bg-[var(--accent)] w-2/3" />
              </div>
            </div>
          )}

        </div>

        {activeShipment && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
            <div className="message-card">
              <div className="section-label">ACTIVE LANE</div>
              <div className="mt-3 text-lg font-black">{activeShipment.pickup_address.split(',')[0]}</div>
              <div className="muted">{activeShipment.drop_address.split(',')[0]}</div>
            </div>
            <div className="message-card">
              <div className="section-label">STATUS</div>
              <div className="mt-3 text-lg font-black uppercase">{activeShipment.status}</div>
              <div className="muted">OSRM route refreshed in realtime.</div>
            </div>
            <div className="message-card">
              <div className="section-label">COORDINATES</div>
              <div className="mt-3 text-sm font-black flex items-center gap-2">
                <LucideMapPin size={14} />
                {activeShipment.pickup_location?.coordinates?.[1]?.toFixed(4) ?? '--'},
                {activeShipment.pickup_location?.coordinates?.[0]?.toFixed(4) ?? '--'}
              </div>
              <div className="muted">Origin node</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
