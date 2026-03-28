import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useShipments } from '../hooks/useShipments';
import { useTracking } from '../hooks/useTracking';
import { useMatchedVehicles } from '../hooks/useMatchedVehicles';
import { useUserLocation } from '../hooks/useUserLocation';
import { Skeleton } from '../components/Skeleton';
import { StatusBadge } from '../components/StatusBadge';
import { LiveTrackingMap, TrackedShipment } from '../components/LiveTrackingMap';
import { Topbar } from '../components/Topbar';
import { LucideFilter, Navigation, Package, Truck, LucideZap, LucideHistory, LucideShip, LucideLocateFixed, LucideRoute, LucideExternalLink, LucideChevronDown, LucideChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { updateBookingMilestone, updateBookingProofs, type BookingMilestone, type MilestoneHistoryEntry } from '../services/bookingService';

type StatusFilter = 'all' | 'active' | 'requested' | 'matched' | 'in_progress' | 'completed' | 'cancelled';

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

export default function Tracking() {
  const { t } = useTranslation(['tracking', 'common']);
  const [searchParams] = useSearchParams();
  const { shipments, loading, error } = useShipments();
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [routeDetails, setRouteDetails] = useState<Record<string, any>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [savingMilestone, setSavingMilestone] = useState(false);
  const [loadingProofUrl, setLoadingProofUrl] = useState('');
  const [deliveryProofUrl, setDeliveryProofUrl] = useState('');
  const [followMode, setFollowMode] = useState(true);
  const [overviewKey, setOverviewKey] = useState(0);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState<'details' | 'fleet'>('details');
  const initialDistanceRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const visibleShipments = useMemo(() => {
    if (statusFilter === 'all') return shipments;
    if (statusFilter === 'active') {
      return shipments.filter(s => ['requested', 'matched', 'in_progress'].includes(s.status));
    }
    return shipments.filter(s => s.status === statusFilter);
  }, [shipments, statusFilter]);

  const activeShipment = useMemo(() => {
    if (selectedShipmentId) {
      return visibleShipments.find(s => s.id === selectedShipmentId) || visibleShipments[0];
    }
    return visibleShipments[0];
  }, [visibleShipments, selectedShipmentId]);

  useEffect(() => {
    // Ensure we always have an active selection so routeDetails + widgets can bind.
    if (!visibleShipments.length) {
      if (selectedShipmentId !== null) setSelectedShipmentId(null);
      return;
    }
    const exists = selectedShipmentId ? visibleShipments.some((s) => s.id === selectedShipmentId) : false;
    if (!selectedShipmentId || !exists) setSelectedShipmentId(visibleShipments[0].id);
  }, [selectedShipmentId, visibleShipments]);

  useEffect(() => {
    const id = searchParams.get('shipment');
    if (!id) return;
    if (selectedShipmentId === id) return;
    const exists = visibleShipments.some((s) => s.id === id);
    if (exists) setSelectedShipmentId(id);
  }, [searchParams, selectedShipmentId, visibleShipments]);

  const activeBooking = activeShipment?.bookings?.[0];
  // Live device tracking (new): public.user_locations keyed by device_id (driver_id).
  const live = useUserLocation(activeBooking?.driver_id ?? null);
  // Fallback (old): public.tracking history keyed by booking_id.
  const { location, history, latest } = useTracking(activeBooking?.id);
  const { vehicles: matchedVehicles } = useMatchedVehicles(activeShipment?.id || null);

  const activeTruckStatus = useMemo(() => {
    return {
      speed: null,
      recordedAt: live.latest?.updated_at ?? (latest as any)?.recorded_at ?? null,
      bookingStatus: activeBooking?.status ?? null,
      milestone: (activeBooking as any)?.current_milestone ?? null,
    };
  }, [activeBooking?.status, activeBooking, live.latest?.updated_at, latest]);

  // When following the truck, compute a navigation origin that updates only after meaningful movement.
  const navOriginRef = useRef<{ lat: number; lng: number } | null>(null);
  const navOrigin = (() => {
    const src = live.location
      ? { lat: live.location.lat, lng: live.location.lng }
      : (location?.coordinates ? { lat: location.coordinates[1], lng: location.coordinates[0] } : null);
    if (!followMode || !src) return null;
    const next = src;
    const prev = navOriginRef.current;
    if (!prev) {
      navOriginRef.current = next;
      return next;
    }
    if (haversineMeters(prev, next) >= 30) {
      navOriginRef.current = next;
      return next;
    }
    return prev;
  })();

  const candidates = useMemo(() => {
    return matchedVehicles
      .filter(v => v.location)
      .map(v => ({
        id: v.truckId,
        location: v.location!,
        label: v.registrationNumber || 'Candidate'
      }));
  }, [matchedVehicles]);

  const mappedShipments: TrackedShipment[] = useMemo(() => {
    return visibleShipments
      .filter(s => s.pickup_location?.coordinates && s.drop_location?.coordinates)
      .map(s => {
        const originCoord = s.pickup_location!.coordinates;
        const destCoord = s.drop_location!.coordinates;

        let truckLoc;
        if (s.id === activeShipment?.id && live.location) {
          truckLoc = { lat: live.location.lat, lng: live.location.lng };
        } else if (s.id === activeShipment?.id && location?.coordinates) {
          truckLoc = { lat: location.coordinates[1], lng: location.coordinates[0] };
        }

        const trackPath = s.id === activeShipment?.id
          ? (live.path.length > 1
              ? live.path
              : history
                  .map((p) => {
                    const coords = (p.location as any)?.coordinates as [number, number] | undefined;
                    if (!coords) return null;
                    return { lat: coords[1], lng: coords[0] };
                  })
                  .filter(Boolean) as Array<{ lat: number; lng: number }>)
          : undefined;

        return {
          id: s.id,
          origin: { lat: originCoord[1], lng: originCoord[0] },
          destination: { lat: destCoord[1], lng: destCoord[0] },
          truckLocation: truckLoc,
          routeOrigin: s.id === activeShipment?.id && navOrigin ? { lat: navOrigin.lat, lng: navOrigin.lng } : undefined,
          truckStatus: s.id === activeShipment?.id ? activeTruckStatus : undefined,
          trackPath,
          status: s.status,
        };
      });
  }, [visibleShipments, activeShipment?.id, history, location, live.location, live.path, navOrigin, activeTruckStatus]);

  const activeId = selectedShipmentId ?? activeShipment?.id ?? null;
  const activeRoute = activeId ? routeDetails[activeId] : null;
  const activeSteps = (activeRoute?.steps as Array<{ instruction: string; distance: number; duration: number }> | undefined) ?? [];
  const nextInstruction = activeSteps[0]?.instruction ?? 'Waiting for route sync';
  const upcomingSteps = activeSteps.slice(0, 6);

  useEffect(() => {
    if (!activeId) return;
    const d = Number(activeRoute?.distance);
    if (!Number.isFinite(d) || d <= 0) return;
    const current = initialDistanceRef.current[activeId];
    // Keep the max observed distance as baseline so progress shrinks as the route recalculates from live position.
    if (!Number.isFinite(current) || d > current) initialDistanceRef.current[activeId] = d;
  }, [activeRoute?.distance, activeId]);

  const formatDistance = (meters: number) => {
    if (!Number.isFinite(meters)) return '--';
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.max(0, Math.round(meters))} m`;
  };

  const formatDuration = (seconds: number) => {
    if (!Number.isFinite(seconds)) return '--';
    const totalMinutes = Math.max(1, Math.round(seconds / 60));
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
    }
    return `${totalMinutes} min`;
  };

  const formatArrivalTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) return '--';
    const arrival = new Date(Date.now() + seconds * 1000);
    return arrival.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const deviceUpdatedAtMs = live.row?.updated_at ? Date.parse(live.row.updated_at) : Number.NaN;
  const fallbackUpdatedAtMs = activeTruckStatus.recordedAt ? Date.parse(activeTruckStatus.recordedAt) : Number.NaN;
  const liveUpdatedAtMs = Number.isFinite(deviceUpdatedAtMs) ? deviceUpdatedAtMs : fallbackUpdatedAtMs;
  const liveConnected = Number.isFinite(liveUpdatedAtMs) ? (Date.now() - liveUpdatedAtMs) <= 120_000 : false;
  const liveUpdatedMins = Number.isFinite(liveUpdatedAtMs) ? Math.max(0, Math.round((Date.now() - liveUpdatedAtMs) / 60000)) : null;

  const distanceLeft = Number(activeRoute?.distance ?? NaN);
  const driveTime = Number(activeRoute?.duration ?? NaN);
  const baseline = activeId ? initialDistanceRef.current[activeId] : undefined;
  const progressRatio = Number.isFinite(distanceLeft) && Number.isFinite(baseline) && baseline! > 0
    ? Math.max(0, Math.min(1, 1 - (distanceLeft / baseline!)))
    : 0;

  const openGoogleMaps = () => {
    if (!activeShipment) return;
    const originCoord = activeShipment.pickup_location?.coordinates;
    const destCoord = activeShipment.drop_location?.coordinates;
    if (!originCoord || !destCoord) return;

    const base = new URL('https://www.google.com/maps/dir/');
    base.searchParams.set('api', '1');
    base.searchParams.set('travelmode', 'driving');
    base.searchParams.set('dir_action', 'navigate');

    const origin = live.location
      ? `${live.location.lat},${live.location.lng}`
      : (location?.coordinates ? `${location.coordinates[1]},${location.coordinates[0]}` : `${originCoord[1]},${originCoord[0]}`);
    const dest = `${destCoord[1]},${destCoord[0]}`;
    base.searchParams.set('origin', origin);
    base.searchParams.set('destination', dest);

    window.open(base.toString(), '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    setLoadingProofUrl(activeBooking?.loading_proof_url ?? '');
    setDeliveryProofUrl(activeBooking?.delivery_proof_url ?? '');
  }, [activeBooking?.loading_proof_url, activeBooking?.delivery_proof_url]);

  const milestoneSteps: BookingMilestone[] = [
    'started',
    'arrived_pickup',
    'loaded',
    'in_transit',
    'arrived_destination',
    'delivered',
  ];

  const milestoneHistory = useMemo<MilestoneHistoryEntry[]>(() => {
    const raw = activeBooking?.milestone_history;
    if (Array.isArray(raw)) return raw as MilestoneHistoryEntry[];
    return [];
  }, [activeBooking?.milestone_history]);

  const handleMilestoneUpdate = async (milestone: BookingMilestone) => {
    if (!activeBooking?.id) return;
    setSavingMilestone(true);
    try {
      await updateBookingMilestone(activeBooking.id, milestone, activeBooking.milestone_history);
      toast.success('Milestone updated.');
    } catch (err: any) {
      toast.error(err?.message || 'Unable to update milestone.');
    } finally {
      setSavingMilestone(false);
    }
  };

  const handleProofSave = async () => {
    if (!activeBooking?.id) return;
    try {
      await updateBookingProofs(activeBooking.id, {
        loading_proof_url: loadingProofUrl.trim() || null,
        delivery_proof_url: deliveryProofUrl.trim() || null,
      });
      toast.success('Proof links saved.');
    } catch (err: any) {
      toast.error(err?.message || 'Unable to save proof links.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Topbar title={t('tracking:header.title', 'Tracking')} />
        <div className="page-scroll">
          <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.9fr] gap-8 h-[calc(100vh-180px)]">
            <Skeleton className="h-full w-full rounded-[32px]" />
            <div className="space-y-6">
              <Skeleton className="h-48 w-full rounded-[32px]" />
              <Skeleton className="h-64 w-full rounded-[32px]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title={t('tracking:header.title', 'Tracking')} subtitle="Live OSRM routes, booking-level GPS, and carrier candidates." />

      <div className="page-scroll pb-24">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(360px,460px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] gap-6 min-w-0">
          <div className="relative overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl min-w-0 h-[58dvh] min-h-[360px] sm:h-[62dvh] sm:min-h-[420px] xl:h-[calc(100dvh-220px)] xl:min-h-[600px]">
            <LiveTrackingMap
              shipments={mappedShipments}
              onSelectShipment={setSelectedShipmentId}
              onRouteDataUpdate={(id, data) => setRouteDetails((prev) => ({ ...prev, [id]: data }))}
              candidates={candidates}
              activeShipmentId={activeShipment?.id ?? null}
              followShipmentId={activeShipment?.id ?? null}
              followMode={followMode}
              overviewKey={overviewKey}
            />

            {/* Webpage-map style floating controls */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[1001] grid gap-2">
              <button
                type="button"
                onClick={() => setFollowMode((prev) => !prev)}
                className="ghost-button !min-h-[44px] !px-5 !rounded-2xl flex items-center gap-2"
              >
                <LucideLocateFixed size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">{followMode ? 'Following Truck' : 'Free Pan'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFollowMode(false);
                  setOverviewKey((v) => v + 1);
                }}
                className="ghost-button !min-h-[44px] !px-5 !rounded-2xl flex items-center gap-2"
              >
                <LucideRoute size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Route Overview</span>
              </button>
            </div>

            {selectedShipmentId && routeDetails[selectedShipmentId] && (
              <div className="absolute bottom-6 left-6 right-6 p-1 bg-[var(--surface-strong)] border border-[var(--border-strong)] rounded-[22px] backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-500 z-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] hidden xl:block">
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-5">
                    <div className="w-11 h-11 rounded-[14px] bg-[var(--accent)] flex items-center justify-center text-white shadow-[0_0_20px_var(--accent-soft)]">
                      <Navigation size={22} className="rotate-45" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">
                        {t('tracking:intelligence.eta', 'Est. Intersection')}
                      </div>
                      <div className="text-[15px] font-black text-[var(--text)]">
                        {Math.round(routeDetails[selectedShipmentId].duration / 60)} {t('tracking:intelligence.min', 'min')}
                      </div>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-[var(--border)]" />
                  <div className="flex flex-col items-end">
                    <div className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">
                      {t('tracking:intelligence.distance', 'Remaining')}
                    </div>
                    <div className="text-[15px] font-black text-[var(--text)]">
                      {(routeDetails[selectedShipmentId].distance / 1000).toFixed(1)} km
                    </div>
                  </div>
                </div>
                <div className="h-1 rounded-full bg-white/5 mx-6 mb-1 overflow-hidden">
                  <div className="h-full bg-[var(--accent)] w-2/3 shadow-[0_0_10px_var(--accent)]" />
                </div>
              </div>
            )}

            {/* Webpage-map style bottom panel (all sizes, collapsed by default on desktop) */}
            {activeShipment && (
              <>
                {!panelCollapsed ? (
                  <section className="absolute bottom-6 left-6 right-6 z-[1002]">
                    <div className="card !p-0 overflow-hidden bg-[var(--surface-strong)]">
                      <div className="p-5 border-b border-[var(--border)] flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="section-label">LOADLINK LIVE</div>
                          <div className="text-xl font-black tracking-tight text-[var(--text)]">Truck Navigation</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="pill pill--active">{liveConnected ? 'LIVE' : 'OFFLINE'}</span>
                            {activeBooking?.driver_id ? (
                              <span className="pill pill--muted font-mono">DRV {activeBooking.driver_id.slice(0, 6).toUpperCase()}</span>
                            ) : (
                              <span className="pill pill--muted">NO DRIVER</span>
                            )}
                            <span className="pill pill--muted font-mono">BIZ {activeShipment.business_id.slice(0, 6).toUpperCase()}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPanelCollapsed(true)}
                          className="ghost-button !min-h-[40px] !px-4 !rounded-2xl shrink-0 flex items-center gap-2"
                        >
                          <LucideChevronDown size={16} />
                          Collapse
                        </button>
                      </div>

                      <div className="p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <span className={`pill ${liveConnected ? 'pill--success' : 'pill--warning'}`}>
                            {liveConnected ? 'Driver en route' : (liveUpdatedMins === null ? 'Awaiting GPS' : 'Signal lost')}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
                            {liveUpdatedMins === null ? 'Waiting for GPS' : `Updated ${liveUpdatedMins} min ago`}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="mini-card !p-3">
                            <div className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Distance</div>
                            <div className="mt-2 text-sm font-black text-[var(--text)]">{formatDistance(distanceLeft)}</div>
                          </div>
                          <div className="mini-card !p-3">
                            <div className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Drive Time</div>
                            <div className="mt-2 text-sm font-black text-[var(--text)]">{formatDuration(driveTime)}</div>
                          </div>
                          <div className="mini-card !p-3">
                            <div className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Arrives</div>
                            <div className="mt-2 text-sm font-black text-[var(--text)]">{formatArrivalTime(driveTime)}</div>
                          </div>
                        </div>

                        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Route Progress</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">{Math.round(progressRatio * 100)}%</div>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full bg-[var(--accent)]" style={{ width: `${Math.round(progressRatio * 100)}%` }} />
                          </div>
                        </div>

                        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
                          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Current Guidance</div>
                          <div className="mt-2 text-sm font-black text-[var(--text)]">{nextInstruction}</div>
                          <div className="mt-1 text-[11px] font-bold text-[var(--muted)]">
                            {upcomingSteps[0]?.distance ? `${formatDistance(upcomingSteps[0].distance)} to next maneuver` : 'Preparing the road guidance'}
                          </div>
                        </div>

                        {upcomingSteps.length > 0 && (
                          <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Upcoming</div>
                            <div className="mt-2 space-y-2">
                              {upcomingSteps.slice(0, 3).map((step, index) => (
                                <div key={`${step.instruction}-${index}`} className="row-sub !mt-0">
                                  <span className="font-black uppercase truncate">{step.instruction}</span>
                                  <span>{formatDistance(step.distance)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          className="primary-button w-full !min-h-[52px] !rounded-2xl flex items-center justify-center gap-2"
                          onClick={openGoogleMaps}
                        >
                          <LucideExternalLink size={16} />
                          Open Google Maps
                        </button>
                      </div>
                    </div>
                  </section>
                ) : (
                  <aside className="absolute top-28 right-6 z-[1002] w-[min(320px,calc(100vw-48px))]">
                    <div className="card !p-0 overflow-hidden bg-[var(--surface-strong)]">
                      <div className="p-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="section-label">LOADLINK WIDGET</div>
                          <div className="text-base font-black text-[var(--text)]">
                            {liveConnected ? 'Driver en route' : (liveUpdatedMins === null ? 'Awaiting GPS' : 'Signal lost')}
                          </div>
                          <div className="mt-2 text-[11px] font-bold text-[var(--muted)] truncate">
                            {nextInstruction}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPanelCollapsed(false)}
                          className="ghost-button !min-h-[40px] !px-4 !rounded-2xl shrink-0 flex items-center gap-2"
                        >
                          <LucideChevronUp size={16} />
                          Expand
                        </button>
                      </div>
                      <div className="p-4 pt-0 grid grid-cols-3 gap-2">
                        <div className="mini-card !p-3">
                          <div className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Distance</div>
                          <div className="mt-2 text-xs font-black text-[var(--text)]">{formatDistance(distanceLeft)}</div>
                        </div>
                        <div className="mini-card !p-3">
                          <div className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Time</div>
                          <div className="mt-2 text-xs font-black text-[var(--text)]">{formatDuration(driveTime)}</div>
                        </div>
                        <div className="mini-card !p-3">
                          <div className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Arrives</div>
                          <div className="mt-2 text-xs font-black text-[var(--text)]">{formatArrivalTime(driveTime)}</div>
                        </div>
                      </div>
                      <div className="p-4 pt-0">
                        <button
                          type="button"
                          className="primary-button w-full !min-h-[48px] !rounded-2xl flex items-center justify-center gap-2"
                          onClick={openGoogleMaps}
                        >
                          <LucideExternalLink size={16} />
                          Google Maps
                        </button>
                      </div>
                    </div>
                  </aside>
                )}
              </>
            )}
          </div>

          <div className="flex flex-col min-h-0 gap-6 min-w-0 pr-0.5 xl:h-full xl:overflow-y-auto xl:no-scrollbar">
            <div className="xl:hidden">
              <div className="p-1 rounded-[22px] border border-[var(--border)] bg-[var(--surface-strong)] shadow-[0_20px_50px_rgba(0,0,0,0.22)]">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setMobileView('details')}
                    className={`h-11 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${
                      mobileView === 'details'
                        ? 'bg-[var(--accent-soft)] text-[var(--text)] border border-[var(--accent)]/20'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    Selected
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileView('fleet')}
                    className={`h-11 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${
                      mobileView === 'fleet'
                        ? 'bg-[var(--accent-soft)] text-[var(--text)] border border-[var(--accent)]/20'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    Fleet
                  </button>
                </div>
              </div>
            </div>
            <div className={`${mobileView === 'fleet' ? '' : 'hidden xl:block'}`}>
            <div className="card !p-0 overflow-hidden bg-[var(--surface-strong)]">
              <div className="p-6 pb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="section-label">TRACKING</div>
                  <div className="text-2xl font-black tracking-tighter text-[var(--text)]">
                    {visibleShipments.length}{' '}Active View
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--muted)] shrink-0">
                  <LucideFilter size={12} />
                  Filters
                </div>
              </div>
              <div className="px-6 pb-6">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'active', label: 'Active' },
                    { id: 'all', label: 'All' },
                    { id: 'requested', label: 'Requested' },
                    { id: 'matched', label: 'Matched' },
                    { id: 'in_progress', label: 'In Progress' },
                    { id: 'completed', label: 'Completed' },
                    { id: 'cancelled', label: 'Cancelled' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStatusFilter(item.id as StatusFilter)}
                      className={`pill ${statusFilter === item.id ? 'pill--active' : 'pill--muted'} uppercase`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            </div>

            {!activeShipment ? (
              <div className="card flex-1 flex flex-col items-center justify-center text-center p-12 glass-panel">
                <div className="w-20 h-20 bg-[var(--surface-soft)] rounded-full flex items-center justify-center mb-6 text-[var(--muted)]">
                  <LucideShip size={40} className="opacity-20" />
                </div>
                <h3 className="text-xl font-black text-[var(--text)] mb-2 uppercase tracking-tight">No tracking yet</h3>
                <p className="text-[11px] text-[var(--muted)] mb-8 font-bold leading-relaxed">Once a shipment is booked, live tracking will appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col min-h-0 gap-4 pb-6 text-left">
                <div className={`${mobileView === 'details' ? '' : 'hidden xl:block'}`}>
                <div className="card !p-0 overflow-hidden bg-[var(--surface-strong)]">
                  <div className="p-6 pb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="section-label">SELECTED TRACK</div>
                      <div className="text-2xl font-black tracking-tighter text-[var(--text)]">
                        {activeShipment.id.split('-')[0].toUpperCase()}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={activeBooking?.status ?? activeShipment.status} />
                    </div>
                  </div>

                  <div className="px-6 space-y-7 pb-6">
                    {/* Driver live location health */}
                    <div className="message-card">
                      <div className="section-label">DRIVER LOCATION</div>
                      <div className="mt-3 text-sm font-black uppercase">
                        {activeBooking?.driver_id ? `Device: ${activeBooking.driver_id.slice(0, 8).toUpperCase()}` : 'No driver assigned yet'}
                      </div>
                      <div className="muted mt-1">
                        {live.error
                          ? `Blocked: ${live.error}`
                          : (live.location
                              ? `Live fix: ${live.location.lat.toFixed(5)}, ${live.location.lng.toFixed(5)}`
                              : 'No live GPS row yet. Open /driver on the driver phone and press Start.'
                            )}
                      </div>
                    </div>

                    <div className="relative pl-6 space-y-8 border-l-2 border-dashed border-[var(--border)] ml-2 py-2">
                      <div className="relative">
                        <span className="absolute -left-[19px] top-1 w-4 h-4 rounded-full bg-[var(--accent)] border-4 border-[var(--surface-strong)] z-10 shadow-[0_0_12px_var(--accent-soft)]"></span>
                        <div className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-1.5">{t('tracking:details.pickup', 'Origin Node')}</div>
                        <div className="text-xs text-[var(--text)] font-black leading-tight break-words">{activeShipment.pickup_address}</div>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[19px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-[var(--surface-strong)] z-10 shadow-[0_0_12px_rgba(16,185,129,0.3)]"></span>
                        <div className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-1.5">{t('tracking:details.drop', 'Destination Target')}</div>
                        <div className="text-xs text-[var(--text)] font-black leading-tight break-words">{activeShipment.drop_address}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="min-w-0 bg-[var(--surface-soft)] p-3 rounded-2xl border border-[var(--border)] group hover:border-[var(--border-strong)] transition-all">
                        <div className="text-[8px] font-black text-[var(--muted)] uppercase tracking-widest mb-1 items-center flex gap-1">
                          <Package size={10} /> Payload
                        </div>
                        <div className="text-sm font-black text-[var(--text)]">{activeShipment.weight_kg} <span className="text-[8px] opacity-40">KG</span></div>
                      </div>
                      <div className="min-w-0 bg-[var(--surface-soft)] p-3 rounded-2xl border border-[var(--border)] group hover:border-[var(--border-strong)] transition-all">
                        <div className="text-[8px] font-black text-[var(--muted)] uppercase tracking-widest mb-1 items-center flex gap-1">
                          <LucideZap size={10} /> Value
                        </div>
                        <div className="text-sm font-black text-rose-500 font-mono text-right">
                          {'\u20B9'}{Math.round(activeBooking?.agreed_price ?? activeShipment.price).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {activeBooking && (
                      <div className="space-y-3">
                        <div className="p-4 rounded-[22px] bg-[var(--accent)]/[0.03] border border-[var(--accent-soft)]/20 flex items-center justify-between group cursor-pointer hover:bg-[var(--accent-soft)]/5 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white">
                              <Truck size={18} />
                            </div>
                            <div>
                              <div className="text-[9px] font-black text-[var(--accent)] opacity-60 uppercase tracking-widest">Driver Identity</div>
                              <div className="text-xs font-black text-[var(--text)]">#{activeBooking.driver_id.split('-')[0].toUpperCase()}</div>
                            </div>
                          </div>
                        </div>
                        <div className="message-card">
                          <div className="section-label">CURRENT MILESTONE</div>
                          <div className="mt-3 text-sm font-black uppercase">{activeBooking.current_milestone ?? 'not_started'}</div>
                          <div className="muted">Booking status: {activeBooking.status ?? 'unknown'}</div>
                        </div>
                        <div className="message-card">
                          <div className="section-label">NAVIGATION</div>
                          <div className="mt-3 text-sm font-black uppercase">{nextInstruction}</div>
                          <div className="muted">
                            Distance left: {formatDistance(activeRoute?.distance ?? NaN)} | Drive time: {formatDuration(activeRoute?.duration ?? NaN)} | Arrives: {formatArrivalTime(activeRoute?.duration ?? NaN)}
                          </div>
                          {upcomingSteps.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {upcomingSteps.map((step, index) => (
                                <div key={`${step.instruction}-${index}`} className="row-sub">
                                  <span className="font-black uppercase truncate">{step.instruction}</span>
                                  <span>{formatDistance(step.distance)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-3 flex gap-2 flex-wrap">
                            <button
                              type="button"
                              className="primary-button !min-h-[44px] !px-5 !rounded-2xl flex items-center gap-2"
                              onClick={openGoogleMaps}
                            >
                              <LucideExternalLink size={16} />
                              Open Google Maps
                            </button>
                          </div>
                        </div>

                        <div className="message-card">
                          <div className="section-label">LIVE LOCATION (DEVICE)</div>
                          <div className="muted mt-1">
                            Driver device GPS comes from Supabase `public.user_locations` where `device_id = bookings.driver_id`. The driver must keep /driver open to stream realtime.
                          </div>
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
                              <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Last fix</div>
                              <div className="mt-1 text-xs font-black text-[var(--text)]">
                                {live.location
                                  ? `${live.location.lat.toFixed(5)}, ${live.location.lng.toFixed(5)}`
                                  : (location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : '--')}
                              </div>
                            </div>
                            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
                              <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Health</div>
                              <div className="mt-1 text-xs font-black text-[var(--text)]">
                                {liveConnected ? 'LIVE' : (liveUpdatedMins === null ? 'AWAITING GPS' : 'OFFLINE')}
                              </div>
                            </div>
                          </div>
                          {live.error && (
                            <div className="mt-3 text-[11px] font-bold text-[var(--danger)]">{live.error}</div>
                          )}
                        </div>
                        <div className="message-card">
                          <div className="section-label">TRACK WAY</div>
                          <div className="mt-3 text-sm font-black uppercase">{history.length} points</div>
                          <div className="muted">
                            {latest?.recorded_at ? `Last update: ${new Date(latest.recorded_at).toLocaleString()}` : 'Waiting for GPS update.'}
                            {typeof latest?.speed === 'number' ? ` | Speed: ${Number(latest.speed).toFixed(1)}` : ''}
                          </div>
                        </div>
                        <div className="message-card">
                          <div className="section-label">UPDATE STATUS</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {milestoneSteps.map((step) => (
                              <button
                                key={step}
                                type="button"
                                disabled={savingMilestone}
                                onClick={() => handleMilestoneUpdate(step)}
                                className={`pill ${activeBooking.current_milestone === step ? 'pill--active' : 'pill--muted'} uppercase`}
                              >
                                {step.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="message-card">
                          <div className="section-label">PROOF LINKS</div>
                          <div className="mt-3 space-y-3">
                            <input
                              className="text-field"
                              placeholder="Loading proof URL"
                              value={loadingProofUrl}
                              onChange={(e) => setLoadingProofUrl(e.target.value)}
                            />
                            <input
                              className="text-field"
                              placeholder="Delivery proof URL"
                              value={deliveryProofUrl}
                              onChange={(e) => setDeliveryProofUrl(e.target.value)}
                            />
                            <button
                              type="button"
                              className="primary-button"
                              onClick={handleProofSave}
                            >
                              Save proofs
                            </button>
                          </div>
                        </div>
                        {milestoneHistory.length > 0 && (
                          <div className="message-card">
                            <div className="section-label">MILESTONE HISTORY</div>
                            <div className="mt-3 space-y-2">
                              {milestoneHistory.slice().reverse().map((entry, index) => (
                                <div key={`${entry.stage}-${index}`} className="row-sub">
                                  <span className="font-black uppercase">{entry.stage.replace('_', ' ')}</span>
                                  <span>{new Date(entry.at).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                </div>

                <div className={`${mobileView === 'fleet' ? '' : 'hidden xl:block'}`}>
                {visibleShipments.length > 0 && (
                  <div className="space-y-3 mt-2">
                    <div className="flex items-center justify-between px-2 mb-2">
                      <div className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">{t('tracking:flow.switch_terminal', 'Fleet Terminal')}</div>
                      <div className="text-[9px] font-black text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-full uppercase tracking-widest">{visibleShipments.length} Nodes</div>
                    </div>
                    {visibleShipments.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setSelectedShipmentId(s.id);
                          setMobileView('details');
                        }}
                        className={`p-4 rounded-[22px] border cursor-pointer group transition-all duration-340 relative overflow-hidden ${
                          selectedShipmentId === s.id
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]/[0.08] shadow-[0_10px_20px_rgba(70,127,227,0.1)]'
                            : 'border-[var(--border)] bg-[var(--surface-soft)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        {selectedShipmentId === s.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)]" />}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={selectedShipmentId === s.id ? 'live-dot' : 'w-2 h-2 rounded-full bg-[var(--muted)] opacity-30'} />
                            <span className="text-[10px] font-black text-[var(--text)] uppercase">Terminal {s.id.split('-')[0].toUpperCase()}</span>
                          </div>
                          <StatusBadge status={s.status} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[var(--muted)] font-black uppercase tracking-wider truncate gap-2">
                          <span className="truncate">{s.pickup_address.split(',')[0]} <LucideHistory size={10} className="inline rotate-180" /> {s.drop_address.split(',')[0]}</span>
                          <span className="font-mono text-[var(--text)] text-right">
                            {'\u20B9'}{Math.round(s.bookings?.[0]?.agreed_price ?? s.price).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
