import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  LucideExternalLink,
  LucideFilter,
  LucideGauge,
  LucideHistory,
  LucideImage,
  LucideLocateFixed,
  LucideMapPin,
  LucideRoute,
  LucideShip,
  LucideTruck,
  LucideZap,
  Package,
} from 'lucide-react';

import { Topbar } from '@/components/Topbar';
import { Skeleton } from '@/components/Skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { LiveTrackingMap, type TrackedShipment } from '@/components/LiveTrackingMap';
import { useShipments } from '@/hooks/useShipments';
import { useMatchedVehicles } from '@/hooks/useMatchedVehicles';
import { useTracking, parseGeoPoint } from '@/hooks/useTracking';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useAuthStore } from '@/stores/authStore';
import {
  BOOKING_VERIFICATION_BUCKET,
  findLatestVerificationPath,
  getLatestProofVerification,
  getVerificationPreviewUrl,
  updateBookingMilestone,
  verifyBookingProof,
  type BookingMilestone,
  type BookingProofType,
  type ProofVerificationStatus,
} from '@/services/bookingService';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

type StatusFilter = 'all' | 'active' | 'requested' | 'matched' | 'in_progress' | 'completed' | 'cancelled';

const MILESTONES: BookingMilestone[] = [
  'started',
  'arrived_pickup',
  'loaded',
  'in_transit',
  'arrived_destination',
  'delivered',
];

const formatDistance = (m: number) => {
  if (!Number.isFinite(m) || m <= 0) return '--';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
};

const formatDuration = (s: number) => {
  if (!Number.isFinite(s) || s <= 0) return '--';
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const verificationPillClass = (status?: ProofVerificationStatus | null) => {
  switch (status) {
    case 'accepted':
      return 'pill--success';
    case 'declined':
      return 'pill--warning';
    default:
      return 'pill--muted';
  }
};

const getProofCardState = (booking: NonNullable<ReturnType<typeof useShipments>['shipments'][number]['bookings']>[number] | null | undefined, proofType: BookingProofType) => {
  if (!booking) return null;

  return proofType === 'loading'
    ? {
        status: (booking.loading_proof_status as ProofVerificationStatus | null) ?? null,
        uploadedAt: booking.loading_proof_uploaded_at,
        verifiedAt: booking.loading_proof_verified_at,
        reviewerId: booking.loading_proof_verified_by,
        note: booking.loading_proof_review_note,
      }
    : {
        status: (booking.delivery_proof_status as ProofVerificationStatus | null) ?? null,
        uploadedAt: booking.delivery_proof_uploaded_at,
        verifiedAt: booking.delivery_proof_verified_at,
        reviewerId: booking.delivery_proof_verified_by,
        note: booking.delivery_proof_review_note,
      };
};

export default function Tracking() {
  const { t } = useTranslation(['tracking', 'common']);
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuthStore();

  const { shipments, loading, error } = useShipments();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [routeDetails, setRouteDetails] = useState<Record<string, any>>({});
  const [followMode, setFollowMode] = useState(true);
  const [overviewKey, setOverviewKey] = useState(0);
  const [mobileView, setMobileView] = useState<'details' | 'fleet'>('details');

  const [savingMilestone, setSavingMilestone] = useState(false);
  const [loadingProofViewUrl, setLoadingProofViewUrl] = useState<string | null>(null);
  const [deliveryProofViewUrl, setDeliveryProofViewUrl] = useState<string | null>(null);
  const [loadingProofResolvedPath, setLoadingProofResolvedPath] = useState<string | null>(null);
  const [deliveryProofResolvedPath, setDeliveryProofResolvedPath] = useState<string | null>(null);
  const [proofReviewNotes, setProofReviewNotes] = useState<Record<BookingProofType, string>>({ loading: '', delivery: '' });
  const [savingProofDecision, setSavingProofDecision] = useState<BookingProofType | null>(null);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const visibleShipments = useMemo(() => {
    if (statusFilter === 'all') return shipments;
    if (statusFilter === 'active') {
      return shipments.filter((s) => ['requested', 'matched', 'in_progress'].includes(s.status));
    }
    return shipments.filter((s) => s.status === statusFilter);
  }, [shipments, statusFilter]);

  useEffect(() => {
    const id = searchParams.get('shipment');
    if (!id) return;
    setSelectedShipmentId(id);
    setMobileView('details');
  }, [searchParams]);

  useEffect(() => {
    if (!visibleShipments.length) {
      setSelectedShipmentId(null);
      return;
    }
    const exists = selectedShipmentId ? visibleShipments.some((s) => s.id === selectedShipmentId) : false;
    if (!selectedShipmentId || !exists) setSelectedShipmentId(visibleShipments[0].id);
  }, [selectedShipmentId, visibleShipments]);

  const activeShipment = useMemo(() => {
    if (!visibleShipments.length) return null;
    if (!selectedShipmentId) return visibleShipments[0];
    return visibleShipments.find((s) => s.id === selectedShipmentId) ?? visibleShipments[0];
  }, [visibleShipments, selectedShipmentId]);

  const activeBooking = activeShipment?.bookings?.[0] ?? null;
  const loadingVerification = useMemo(() => {
    const schemaState = getProofCardState(activeBooking, 'loading');
    const historyState = getLatestProofVerification(activeBooking?.milestone_history, 'loading', activeBooking?.loading_proof_url);
    return {
      status: schemaState?.status ?? historyState?.status ?? 'pending',
      uploadedAt: schemaState?.uploadedAt ?? historyState?.uploadedAt,
      verifiedAt: schemaState?.verifiedAt ?? historyState?.verifiedAt,
      reviewerId: schemaState?.reviewerId ?? historyState?.reviewerId,
      reviewerName: historyState?.reviewerName,
      note: schemaState?.note ?? historyState?.note,
    };
  }, [activeBooking]);
  const deliveryVerification = useMemo(() => {
    const schemaState = getProofCardState(activeBooking, 'delivery');
    const historyState = getLatestProofVerification(activeBooking?.milestone_history, 'delivery', activeBooking?.delivery_proof_url);
    return {
      status: schemaState?.status ?? historyState?.status ?? 'pending',
      uploadedAt: schemaState?.uploadedAt ?? historyState?.uploadedAt,
      verifiedAt: schemaState?.verifiedAt ?? historyState?.verifiedAt,
      reviewerId: schemaState?.reviewerId ?? historyState?.reviewerId,
      reviewerName: historyState?.reviewerName,
      note: schemaState?.note ?? historyState?.note,
    };
  }, [activeBooking]);
  const live = useUserLocation(activeBooking?.driver_id ?? null);
  const tracking = useTracking(activeBooking?.id ?? null);
  const { vehicles: matchedVehicles } = useMatchedVehicles(activeShipment?.id ?? null);

  const driverPoint = useMemo(() => {
    if (live.location) return live.location;
    if (tracking.location) {
      const [lat, lng] = parseGeoPoint(tracking.location);
      return { lat, lng };
    }
    return null;
  }, [live.location, tracking.location]);

  const liveUpdatedAtMs = useMemo(() => {
    const ts = live.latest?.updated_at ?? null;
    return ts ? Date.parse(ts) : Number.NaN;
  }, [live.latest?.updated_at]);

  const liveConnected = Number.isFinite(liveUpdatedAtMs) ? (Date.now() - liveUpdatedAtMs) <= 120_000 : false;
  const liveUpdatedMins = Number.isFinite(liveUpdatedAtMs) ? Math.max(0, Math.round((Date.now() - liveUpdatedAtMs) / 60000)) : null;

  const candidates = useMemo(() => {
    return matchedVehicles
      .filter((v) => v.location)
      .map((v) => ({ id: v.truckId, location: v.location!, label: v.registrationNumber || 'Candidate' }));
  }, [matchedVehicles]);

  const mappedShipments: TrackedShipment[] = useMemo(() => {
    return visibleShipments
      .filter((s) => s.pickup_location?.coordinates && s.drop_location?.coordinates)
      .map((s) => {
        const o = s.pickup_location!.coordinates;
        const d = s.drop_location!.coordinates;
        const isActive = s.id === activeShipment?.id;

        const trackPath = isActive
          ? (live.path.length
              ? live.path
              : (tracking.history ?? []).map((h) => {
                  const [lat, lng] = parseGeoPoint(h.location);
                  return { lat, lng };
                }))
          : [];

        const truckLocation = isActive ? driverPoint : null;

        return {
          id: s.id,
          origin: { lng: o[0], lat: o[1] },
          destination: { lng: d[0], lat: d[1] },
          truckLocation: truckLocation ?? undefined,
          trackPath: trackPath.length ? trackPath : undefined,
          routeOrigin: followMode && isActive && truckLocation ? truckLocation : undefined,
          truckStatus: isActive
            ? {
                recordedAt: live.latest?.updated_at ?? (tracking.latest as any)?.recorded_at ?? null,
                speed: (tracking.latest as any)?.speed ?? null,
                milestone: (activeBooking as any)?.current_milestone ?? null,
              }
            : undefined,
        };
      });
  }, [
    visibleShipments,
    activeShipment?.id,
    followMode,
    driverPoint,
    live.latest?.updated_at,
    live.path,
    tracking.history,
    tracking.latest,
    activeBooking,
  ]);

  const activeRoute = useMemo(() => {
    const key = activeShipment?.id ?? null;
    return key ? routeDetails[key] ?? null : null;
  }, [routeDetails, activeShipment?.id]);

  const openGoogleMaps = () => {
    if (!activeShipment) return;
    const o = activeShipment.pickup_location?.coordinates;
    const d = activeShipment.drop_location?.coordinates;
    if (!o || !d) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${o[1]},${o[0]}&destination=${d[1]},${d[0]}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleMilestoneUpdate = async (milestone: BookingMilestone) => {
    if (!activeBooking?.id) return;
    setSavingMilestone(true);
    try {
      await updateBookingMilestone(activeBooking.id, milestone, activeBooking.milestone_history);
      toast.success('Status updated');
    } catch (err: any) {
      toast.error(err?.message || 'Unable to update status');
    } finally {
      setSavingMilestone(false);
    }
  };

  const handleProofDecision = async (
    proofType: BookingProofType,
    decision: Exclude<ProofVerificationStatus, 'pending'>,
  ) => {
    if (!activeBooking?.id || !user?.id) return;
    const imagePath = proofType === 'loading'
      ? (activeBooking.loading_proof_url ?? loadingProofResolvedPath)
      : (activeBooking.delivery_proof_url ?? deliveryProofResolvedPath);
    if (!imagePath) {
      toast.error('No photo uploaded for this verification yet.');
      return;
    }

    setSavingProofDecision(proofType);
    try {
      await verifyBookingProof(activeBooking.id, activeBooking.milestone_history, {
        proofType,
        decision,
        imagePath,
        reviewerId: user.id,
        reviewerName: profile?.name ?? null,
        note: proofReviewNotes[proofType],
      });
      setProofReviewNotes((prev) => ({ ...prev, [proofType]: '' }));
      toast.success(`${proofType === 'loading' ? 'Loading' : 'Delivery'} photo ${decision}.`);
    } catch (err: any) {
      toast.error(err?.message || 'Unable to review verification photo');
    } finally {
      setSavingProofDecision(null);
    }
  };

  useEffect(() => {
    setProofReviewNotes({ loading: '', delivery: '' });
  }, [activeBooking?.id]);

  useEffect(() => {
    let cancelled = false;

    const resolveProofUrls = async () => {
      try {
        const loadingPath = activeBooking?.loading_proof_url
          ? activeBooking.loading_proof_url
          : (activeBooking?.id ? await findLatestVerificationPath(activeBooking.id, 'loading') : null);
        const deliveryPath = activeBooking?.delivery_proof_url
          ? activeBooking.delivery_proof_url
          : (activeBooking?.id ? await findLatestVerificationPath(activeBooking.id, 'delivery') : null);

        const [loadingUrl, deliveryUrl] = await Promise.all([
          loadingPath ? getVerificationPreviewUrl(loadingPath) : Promise.resolve(null),
          deliveryPath ? getVerificationPreviewUrl(deliveryPath) : Promise.resolve(null),
        ]);

        if (cancelled) return;
        setLoadingProofResolvedPath(loadingPath);
        setDeliveryProofResolvedPath(deliveryPath);
        setLoadingProofViewUrl(loadingUrl);
        setDeliveryProofViewUrl(deliveryUrl);
      } catch (err: any) {
        if (cancelled) return;
        setLoadingProofResolvedPath(null);
        setDeliveryProofResolvedPath(null);
        setLoadingProofViewUrl(null);
        setDeliveryProofViewUrl(null);
        toast.error(err?.message || 'Unable to prepare verification photos');
      }
    };

    resolveProofUrls();

    return () => {
      cancelled = true;
    };
  }, [activeBooking?.id, activeBooking?.loading_proof_url, activeBooking?.delivery_proof_url]);

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
      <Topbar title={t('tracking:header.title', 'Tracking')} subtitle="Realtime driver GPS + OSRM navigation." />

      <div className="page-scroll pb-24">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(360px,460px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] gap-6 min-w-0">
          <div className="card premium-grid !p-0 overflow-hidden bg-[var(--surface-strong)] min-w-0">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="section-label">TRACKING MAP</div>
                <div className="text-[18px] sm:text-[20px] font-semibold text-[var(--text)] tracking-[-0.03em] flex items-center gap-2">
                  <LucideTruck size={18} className="text-[var(--accent-deep)] shrink-0" />
                  <span className="truncate">Live truck navigation</span>
                  <span className="pill pill--muted font-mono shrink-0">
                    {activeShipment ? activeShipment.id.split('-')[0].toUpperCase() : '--'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`pill ${liveConnected ? 'pill--success' : 'pill--warning'}`}>
                  {liveConnected ? 'LIVE' : 'LAST KNOWN'}
                </span>
              </div>
            </div>

            <div className="relative min-w-0 h-[58dvh] min-h-[380px] sm:h-[64dvh] sm:min-h-[460px] xl:h-[calc(100dvh-300px)] xl:min-h-[540px]">
              <LiveTrackingMap
                shipments={mappedShipments}
                onSelectShipment={(id) => {
                  setSelectedShipmentId(id);
                  setMobileView('details');
                }}
                onRouteDataUpdate={(id, data) => setRouteDetails((prev) => ({ ...prev, [id]: data }))}
                candidates={candidates}
                activeShipmentId={activeShipment?.id ?? null}
                followShipmentId={activeShipment?.id ?? null}
                followMode={followMode}
                overviewKey={overviewKey}
              />

              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[1001] grid gap-3">
                <button
                  type="button"
                  onClick={() => setFollowMode((prev) => !prev)}
                  className="ghost-button !min-h-[50px] !px-6 !rounded-2xl flex items-center gap-3"
                >
                  <LucideLocateFixed size={18} />
                  <span className="text-[12px] font-semibold uppercase tracking-[0.12em]">{followMode ? 'Following Truck' : 'Free Pan'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOverviewKey((v) => v + 1)}
                  className="ghost-button !min-h-[50px] !px-6 !rounded-2xl flex items-center gap-3"
                >
                  <LucideRoute size={18} />
                  <span className="text-[12px] font-semibold uppercase tracking-[0.12em]">Route Overview</span>
                </button>
              </div>

              <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-[1001]">
                <div className="glass-panel !py-3 !px-4 rounded-2xl border border-[var(--border)] shadow-2xl">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Truck</div>
                  <div className="mt-1 text-[13px] font-semibold text-[var(--text)] font-mono">
                    {driverPoint ? `${driverPoint.lat.toFixed(5)}, ${driverPoint.lng.toFixed(5)}` : '--'}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-[1001]">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="glass-panel !py-3 !px-4 rounded-2xl border border-[var(--border)]">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] flex items-center gap-2">
                      <LucideGauge size={14} />
                      Speed
                    </div>
                    <div className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                      {tracking.latest?.speed ? `${Math.round(Number(tracking.latest.speed))} km/h` : '--'}
                    </div>
                  </div>
                  <div className="glass-panel !py-3 !px-4 rounded-2xl border border-[var(--border)]">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] flex items-center gap-2">
                      <LucideRoute size={14} />
                      Distance
                    </div>
                    <div className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                      {formatDistance(activeRoute?.distance ?? NaN)}
                    </div>
                  </div>
                  <div className="glass-panel !py-3 !px-4 rounded-2xl border border-[var(--border)]">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] flex items-center gap-2">
                      <LucideZap size={14} />
                      ETA
                    </div>
                    <div className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                      {formatDuration(activeRoute?.duration ?? NaN)}
                    </div>
                  </div>
                  <div className="glass-panel !py-3 !px-4 rounded-2xl border border-[var(--border)]">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] flex items-center gap-2">
                      <LucideMapPin size={14} />
                      Status
                    </div>
                    <div className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                      {liveConnected ? 'On route' : 'Signal lost'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col min-h-0 gap-6 min-w-0 pr-0.5 xl:h-full xl:overflow-y-auto xl:no-scrollbar">
            <div className="sticky top-0 z-30 pt-1 xl:static xl:pt-0">
              <div className="xl:hidden">
                <SegmentedControl
                  value={mobileView}
                  onChange={setMobileView}
                  options={[
                    { value: 'details', label: 'Selected' },
                    { value: 'fleet', label: 'Fleet' },
                  ]}
                />
              </div>
            </div>

            <div className={`${mobileView === 'fleet' ? '' : 'hidden xl:block'}`}>
              <div className="card premium-grid !p-0 overflow-hidden bg-[var(--surface-strong)]">
                <div className="p-7 pb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="section-label">TRACKING</div>
                    <div className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.04em] text-[var(--text)]">
                      {visibleShipments.length}{' '}Active View
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] shrink-0">
                    <LucideFilter size={16} />
                    Filters
                  </div>
                </div>
                <div className="px-7 pb-7">
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
                  <div className="card premium-grid !p-0 overflow-hidden bg-[var(--surface-strong)]">
                    <div className="p-7 pb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="section-label">SELECTED TRACK</div>
                        <div className="text-[32px] sm:text-[38px] font-semibold tracking-[-0.05em] text-[var(--text)]">
                          {activeShipment.id.split('-')[0].toUpperCase()}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <StatusBadge status={activeBooking?.status ?? activeShipment.status} />
                      </div>
                    </div>

                    <div className="px-7 space-y-7 pb-7">
                      <div className="infocard message-card">
                        <div className="section-label">DRIVER LOCATION</div>
                        <div className="mt-3 text-[18px] font-semibold tracking-[-0.02em]">
                          {activeBooking?.driver_id ? `Device: ${activeBooking.driver_id.slice(0, 8).toUpperCase()}` : 'No driver assigned yet'}
                        </div>
                        <div className="muted mt-2 text-[14px]">
                          {live.error
                            ? `Blocked: ${live.error}`
                            : (driverPoint
                                ? `Live fix: ${driverPoint.lat.toFixed(5)}, ${driverPoint.lng.toFixed(5)}`
                                : 'No live GPS row yet. Open /driver on the driver phone and press Start.')}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                          <span className={`pill ${liveConnected ? 'pill--success' : 'pill--warning'}`}>
                            {liveConnected ? 'LIVE' : (liveUpdatedMins === null ? 'AWAITING GPS' : 'OFFLINE')}
                          </span>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                            {liveUpdatedMins === null ? 'Waiting for GPS' : `Updated ${liveUpdatedMins} min ago`}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="infocard min-w-0 p-4 rounded-2xl group hover:border-[var(--border-strong)] transition-all">
                          <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[0.14em] mb-2 items-center flex gap-2">
                            <Package size={14} /> Payload
                          </div>
                          <div className="text-[24px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                            {activeShipment.weight_kg} <span className="text-[12px] opacity-40">KG</span>
                          </div>
                        </div>
                        <div className="infocard min-w-0 p-4 rounded-2xl group hover:border-[var(--border-strong)] transition-all">
                          <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[0.14em] mb-2 items-center flex gap-2">
                            <LucideZap size={14} /> Value
                          </div>
                          <div className="text-[24px] font-semibold text-rose-500 font-mono text-right tracking-[-0.03em]">
                            {'\u20B9'}{Math.round(activeBooking?.agreed_price ?? activeShipment.price).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="infocard message-card">
                        <div className="section-label">NAVIGATION</div>
                        <div className="mt-2 text-[14px] font-medium text-[var(--muted)]">
                          Distance: <span className="text-[var(--text)]">{formatDistance(activeRoute?.distance ?? NaN)}</span> · Time:{' '}
                          <span className="text-[var(--text)]">{formatDuration(activeRoute?.duration ?? NaN)}</span>
                        </div>
                        <div className="mt-3 flex gap-2 flex-wrap">
                          <button
                            type="button"
                            className="primary-button !min-h-[50px] !px-6 !rounded-2xl flex items-center gap-3"
                            onClick={openGoogleMaps}
                          >
                            <LucideExternalLink size={18} />
                            Open Google Maps
                          </button>
                        </div>
                      </div>

                      {activeBooking && (
                        <>
                          <div className="infocard message-card">
                            <div className="section-label">UPDATE STATUS</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {MILESTONES.map((step) => (
                                <button
                                  key={step}
                                  type="button"
                                  disabled={savingMilestone}
                                  onClick={() => handleMilestoneUpdate(step)}
                                  className={`pill ${(activeBooking as any)?.current_milestone === step ? 'pill--active' : 'pill--muted'} uppercase`}
                                >
                                  {step.replace(/_/g, ' ')}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="infocard message-card">
                            <div className="section-label">PHOTO VERIFICATION</div>
                            <div className="mt-3 grid grid-cols-1 gap-3">
                              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--text)]">Loading verification</div>
                                    <div className="mt-1 text-[12px] text-[var(--muted)]">Fetched from the booking record and shown here for review.</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`pill ${verificationPillClass(loadingVerification?.status)}`}>
                                      {loadingVerification?.status ?? 'pending'}
                                    </span>
                                    <LucideImage size={18} className="text-[var(--muted)] shrink-0" />
                                  </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {activeBooking.loading_proof_url ? (
                                    <button
                                      type="button"
                                      className="ghost-button"
                                      onClick={() => {
                                        if (!loadingProofViewUrl) {
                                          toast.error('Verification image is still being prepared.');
                                          return;
                                        }
                                        window.open(loadingProofViewUrl, '_blank', 'noopener,noreferrer');
                                      }}
                                    >
                                      View current
                                    </button>
                                  ) : loadingProofResolvedPath ? (
                                    <button
                                      type="button"
                                      className="ghost-button"
                                      onClick={() => {
                                        if (!loadingProofViewUrl) {
                                          toast.error('Verification image is still being prepared.');
                                          return;
                                        }
                                        window.open(loadingProofViewUrl, '_blank', 'noopener,noreferrer');
                                      }}
                                    >
                                      View fetched photo
                                    </button>
                                  ) : (
                                    <div className="text-[12px] text-[var(--muted)]">No loading photo was found for this booking.</div>
                                  )}
                                </div>
                                {loadingProofViewUrl ? (
                                  <div className="mt-4 overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--bg)]">
                                    <img
                                      src={loadingProofViewUrl}
                                      alt="Loading verification"
                                      className="h-[220px] w-full object-cover"
                                    />
                                  </div>
                                ) : null}
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                                  <div className="rounded-2xl border border-[var(--border)] bg-white/[0.03] px-3 py-2">
                                    <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">Uploaded</div>
                                    <div className="mt-1 text-[var(--text)]">
                                      {formatTimestamp(loadingVerification?.uploadedAt)}
                                    </div>
                                  </div>
                                  <div className="rounded-2xl border border-[var(--border)] bg-white/[0.03] px-3 py-2">
                                    <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">Reviewed</div>
                                    <div className="mt-1 text-[var(--text)]">
                                      {formatTimestamp(loadingVerification?.verifiedAt)}
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-3 text-[12px] text-[var(--muted)]">
                                  Reviewer: <span className="text-[var(--text)]">{loadingVerification?.reviewerName ?? loadingVerification?.reviewerId ?? '--'}</span>
                                </div>
                                {loadingVerification?.status === 'accepted' ? (
                                  <div className="mt-4 rounded-[20px] border border-emerald-500/25 bg-emerald-500/10 px-4 py-4">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">Approved</div>
                                    <div className="mt-2 text-[14px] font-medium text-emerald-50">
                                      Loading photo accepted. Booking moved to <span className="font-semibold">loaded</span>.
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <textarea
                                      value={proofReviewNotes.loading}
                                      onChange={(e) => setProofReviewNotes((prev) => ({ ...prev, loading: e.target.value }))}
                                      placeholder="Add a review note for this loading photo"
                                      className="mt-3 min-h-[96px] w-full rounded-[18px] border border-[var(--border)] bg-white/[0.02] px-4 py-3 text-[14px] text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                                    />
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        className="primary-button"
                                        disabled={!(activeBooking.loading_proof_url ?? loadingProofResolvedPath) || savingProofDecision === 'loading'}
                                        onClick={() => handleProofDecision('loading', 'accepted')}
                                      >
                                        Accept photo
                                      </button>
                                      <button
                                        type="button"
                                        className="ghost-button"
                                        disabled={!(activeBooking.loading_proof_url ?? loadingProofResolvedPath) || savingProofDecision === 'loading'}
                                        onClick={() => handleProofDecision('loading', 'declined')}
                                      >
                                        Decline photo
                                      </button>
                                    </div>
                                  </>
                                )}
                                {loadingVerification?.note ? (
                                  <div className="mt-3 rounded-2xl border border-[var(--border)] bg-white/[0.03] px-3 py-2 text-[12px] text-[var(--muted)]">
                                    Last review note: <span className="text-[var(--text)]">{loadingVerification.note}</span>
                                  </div>
                                ) : null}
                              </div>

                              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--text)]">Delivery verification</div>
                                    <div className="mt-1 text-[12px] text-[var(--muted)]">Fetched from the booking record and shown here for review.</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`pill ${verificationPillClass(deliveryVerification?.status)}`}>
                                      {deliveryVerification?.status ?? 'pending'}
                                    </span>
                                    <LucideImage size={18} className="text-[var(--muted)] shrink-0" />
                                  </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {activeBooking.delivery_proof_url ? (
                                    <button
                                      type="button"
                                      className="ghost-button"
                                      onClick={() => {
                                        if (!deliveryProofViewUrl) {
                                          toast.error('Verification image is still being prepared.');
                                          return;
                                        }
                                        window.open(deliveryProofViewUrl, '_blank', 'noopener,noreferrer');
                                      }}
                                    >
                                      View current
                                    </button>
                                  ) : deliveryProofResolvedPath ? (
                                    <button
                                      type="button"
                                      className="ghost-button"
                                      onClick={() => {
                                        if (!deliveryProofViewUrl) {
                                          toast.error('Verification image is still being prepared.');
                                          return;
                                        }
                                        window.open(deliveryProofViewUrl, '_blank', 'noopener,noreferrer');
                                      }}
                                    >
                                      View fetched photo
                                    </button>
                                  ) : (
                                    <div className="text-[12px] text-[var(--muted)]">No delivery photo was found for this booking.</div>
                                  )}
                                </div>
                                {deliveryProofViewUrl ? (
                                  <div className="mt-4 overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--bg)]">
                                    <img
                                      src={deliveryProofViewUrl}
                                      alt="Delivery verification"
                                      className="h-[220px] w-full object-cover"
                                    />
                                  </div>
                                ) : null}
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                                  <div className="rounded-2xl border border-[var(--border)] bg-white/[0.03] px-3 py-2">
                                    <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">Uploaded</div>
                                    <div className="mt-1 text-[var(--text)]">
                                      {formatTimestamp(deliveryVerification?.uploadedAt)}
                                    </div>
                                  </div>
                                  <div className="rounded-2xl border border-[var(--border)] bg-white/[0.03] px-3 py-2">
                                    <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">Reviewed</div>
                                    <div className="mt-1 text-[var(--text)]">
                                      {formatTimestamp(deliveryVerification?.verifiedAt)}
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-3 text-[12px] text-[var(--muted)]">
                                  Reviewer: <span className="text-[var(--text)]">{deliveryVerification?.reviewerName ?? deliveryVerification?.reviewerId ?? '--'}</span>
                                </div>
                                {deliveryVerification?.status === 'accepted' ? (
                                  <div className="mt-4 rounded-[20px] border border-emerald-500/25 bg-emerald-500/10 px-4 py-4">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">Approved</div>
                                    <div className="mt-2 text-[14px] font-medium text-emerald-50">
                                      Delivery photo accepted. Booking marked <span className="font-semibold">completed</span>.
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <textarea
                                      value={proofReviewNotes.delivery}
                                      onChange={(e) => setProofReviewNotes((prev) => ({ ...prev, delivery: e.target.value }))}
                                      placeholder="Add a review note for this delivery photo"
                                      className="mt-3 min-h-[96px] w-full rounded-[18px] border border-[var(--border)] bg-white/[0.02] px-4 py-3 text-[14px] text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                                    />
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        className="primary-button"
                                        disabled={!(activeBooking.delivery_proof_url ?? deliveryProofResolvedPath) || savingProofDecision === 'delivery'}
                                        onClick={() => handleProofDecision('delivery', 'accepted')}
                                      >
                                        Accept photo
                                      </button>
                                      <button
                                        type="button"
                                        className="ghost-button"
                                        disabled={!(activeBooking.delivery_proof_url ?? deliveryProofResolvedPath) || savingProofDecision === 'delivery'}
                                        onClick={() => handleProofDecision('delivery', 'declined')}
                                      >
                                        Decline photo
                                      </button>
                                    </div>
                                  </>
                                )}
                                {deliveryVerification?.note ? (
                                  <div className="mt-3 rounded-2xl border border-[var(--border)] bg-white/[0.03] px-3 py-2 text-[12px] text-[var(--muted)]">
                                    Last review note: <span className="text-[var(--text)]">{deliveryVerification.note}</span>
                                  </div>
                                ) : null}
                              </div>

                              <div className="rounded-[18px] border border-dashed border-[var(--border)] bg-white/[0.02] p-4">
                                <div className="text-[12px] font-semibold text-[var(--text)]">Supabase Storage</div>
                                <div className="mt-1 text-[12px] text-[var(--muted)]">
                                  Bucket: <span className="font-mono text-[var(--text)]">{BOOKING_VERIFICATION_BUCKET}</span> <span className="text-[10px] uppercase tracking-[0.12em]">(private)</span>
                                </div>
                                <div className="mt-1 text-[12px] text-[var(--muted)]">
                                  Stored in bookings: <span className="font-mono text-[var(--text)]">proof path + review audit</span>
                                </div>
                                <div className="mt-1 text-[12px] text-[var(--muted)]">
                                  File path pattern: <span className="font-mono text-[var(--text)]">{`{booking_id}/{loading|delivery}-{timestamp}.jpg`}</span>
                                </div>
                                <div className="mt-1 text-[12px] text-[var(--muted)]">
                                  Review data lives in <span className="font-mono text-[var(--text)]">bookings.milestone_history</span> with uploaded time, reviewer, decision, and note.
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`${mobileView === 'fleet' ? '' : 'hidden xl:block'}`}>
                  {visibleShipments.length > 0 && (
                    <div className="space-y-3 mt-2">
                      <div className="flex items-center justify-between px-2 mb-2">
                        <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[0.14em]">
                          {t('tracking:flow.switch_terminal', 'Fleet Terminal')}
                        </div>
                        <div className="text-[11px] font-semibold text-[var(--accent-ink)] bg-[var(--surface-soft)] px-3 py-1 rounded-full uppercase tracking-[0.1em]">
                          {visibleShipments.length} Nodes
                        </div>
                      </div>
                      {visibleShipments.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedShipmentId(s.id);
                            setMobileView('details');
                          }}
                          className={`infocard p-5 rounded-[22px] cursor-pointer group transition-all duration-340 relative overflow-hidden ${
                            selectedShipmentId === s.id
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)]/[0.08] shadow-[0_10px_20px_rgba(70,127,227,0.1)]'
                              : 'border-[var(--border)] bg-[var(--surface-soft)] hover:border-[var(--border-strong)]'
                          }`}
                        >
                          {selectedShipmentId === s.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)]" />}
                          <div className="flex items-center justify-between mb-2 gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={selectedShipmentId === s.id ? 'live-dot' : 'w-2 h-2 rounded-full bg-[var(--muted)] opacity-30'} />
                              <span className="text-[13px] font-semibold text-[var(--text)] uppercase truncate">
                                Terminal {s.id.split('-')[0].toUpperCase()}
                              </span>
                            </div>
                            <StatusBadge status={s.status} />
                          </div>
                          <div className="flex items-center justify-between text-[12px] text-[var(--muted)] font-medium uppercase tracking-[0.08em] gap-2">
                            <span className="truncate min-w-0">
                              {s.pickup_address.split(',')[0]} <LucideHistory size={12} className="inline rotate-180" /> {s.drop_address.split(',')[0]}
                            </span>
                            <span className="font-mono text-[15px] text-[var(--text)] text-right shrink-0">
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
