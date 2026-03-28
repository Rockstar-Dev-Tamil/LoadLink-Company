import { useEffect, useMemo, useState } from 'react';
import { LucideRadio, LucideSquare, LucideTruck, LucideRefreshCw, LucideMapPin, LucideCheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useGeolocationBroadcast } from '@/hooks/useGeolocationBroadcast';
import { useDriverBookings } from '@/hooks/useDriverBookings';
import { supabase } from '@/lib/supabase';

const MILESTONES = [
  'started',
  'arrived_pickup',
  'loaded',
  'in_transit',
  'arrived_destination',
  'delivered',
] as const;

type Milestone = typeof MILESTONES[number];

function shortId(id: string) {
  return id ? id.split('-')[0].toUpperCase() : '--';
}

export default function DriverBroadcast() {
  const { user, profile, refreshProfile, signOut } = useAuthStore();
  const driverId = user?.id ?? null;
  const broadcast = useGeolocationBroadcast(driverId);
  const { bookings, activeBooking, loading, error } = useDriverBookings(driverId);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (selectedBookingId) return;
    if (activeBooking?.id) setSelectedBookingId(activeBooking.id);
  }, [activeBooking?.id, selectedBookingId]);

  const selectedBooking = useMemo(() => {
    if (!selectedBookingId) return activeBooking;
    return bookings.find((b) => b.id === selectedBookingId) ?? activeBooking;
  }, [bookings, selectedBookingId, activeBooking]);

  const currentMilestone = (selectedBooking?.current_milestone ?? 'started') as Milestone;

  const updateMilestone = async (stage: Milestone) => {
    if (!selectedBooking?.id) return;
    setSaving(true);
    try {
      const { data: current, error: readErr } = await supabase
        .from('bookings')
        .select('milestone_history')
        .eq('id', selectedBooking.id)
        .maybeSingle();

      if (readErr) throw readErr;

      const prev = (current as any)?.milestone_history;
      const history: Array<{ stage: string; at: string }> = Array.isArray(prev) ? prev : [];
      const nextHistory = [...history, { stage, at: new Date().toISOString() }];

      const { error } = await supabase
        .from('bookings')
        .update({ current_milestone: stage, milestone_history: nextHistory })
        .eq('id', selectedBooking.id);

      if (error) throw error;
      toast.success('Status updated');
    } catch (err: any) {
      toast.error(err?.message || 'Unable to update status');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.3em]">
              Driver Console
            </div>
            <div className="mt-2 text-[36px] leading-[1.05] font-black tracking-tight">
              Live Broadcast
            </div>
            <div className="mt-2 text-[13px] text-[var(--muted)] font-bold max-w-[72ch]">
              This page sends your device GPS to Supabase `public.user_locations` using your account id as
              `device_id`. Your business dashboard can then track you by booking.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refreshProfile()}
              className="secondary-button h-11 px-4 text-[10px] font-black tracking-[0.2em] uppercase"
            >
              <LucideRefreshCw size={16} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              className="secondary-button h-11 px-4 text-[10px] font-black tracking-[0.2em] uppercase"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-12 gap-6">
          <div className="col-span-7">
            <div className="message-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="section-label">DEVICE</div>
                  <div className="mt-2 text-[20px] font-black tracking-tight flex items-center gap-2">
                    <LucideTruck size={18} className="text-[var(--accent)]" />
                    {profile?.name ?? 'Driver'}
                    <span className="text-[11px] font-black text-[var(--muted)] uppercase tracking-widest">
                      ID {shortId(driverId ?? '')}
                    </span>
                  </div>
                </div>

                {!broadcast.enabled ? (
                  <button
                    type="button"
                    onClick={() => broadcast.start()}
                    className="primary-button h-12 px-5 text-[10px] font-black tracking-[0.2em] uppercase"
                  >
                    <LucideRadio size={18} />
                    Start
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => broadcast.stop()}
                    className="secondary-button h-12 px-5 text-[10px] font-black tracking-[0.2em] uppercase"
                  >
                    <LucideSquare size={18} />
                    Stop
                  </button>
                )}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="stat-tile">
                  <div className="stat-label">LAST FIX</div>
                  <div className="stat-value font-mono">
                    {broadcast.lastLatLng
                      ? `${broadcast.lastLatLng.lat.toFixed(5)}, ${broadcast.lastLatLng.lng.toFixed(5)}`
                      : '--'}
                  </div>
                </div>
                <div className="stat-tile">
                  <div className="stat-label">LAST SENT</div>
                  <div className="stat-value">
                    {broadcast.lastSentAt ? new Date(broadcast.lastSentAt).toLocaleTimeString() : '--'}
                  </div>
                </div>
                <div className="stat-tile">
                  <div className="stat-label">STATUS</div>
                  <div className="stat-value flex items-center gap-2">
                    {broadcast.enabled ? (
                      <>
                        <span className="live-dot" />
                        LIVE
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[var(--muted)] opacity-40" />
                        OFF
                      </>
                    )}
                  </div>
                </div>
              </div>

              {broadcast.lastError && (
                <div className="mt-4 text-[12px] font-bold text-[var(--danger)]">
                  {broadcast.lastError}
                </div>
              )}

              <div className="mt-4 flex items-center gap-2 text-[12px] font-bold text-[var(--muted)]">
                <LucideMapPin size={14} />
                Keep this tab open while driving.
              </div>
            </div>
          </div>

          <div className="col-span-5">
            <div className="message-card">
              <div className="flex items-center justify-between">
                <div className="section-label">ASSIGNED BOOKINGS</div>
                {loading && <div className="text-[11px] font-bold text-[var(--muted)]">Loading…</div>}
              </div>

              {!loading && bookings.length === 0 && (
                <div className="mt-4 text-[12px] font-bold text-[var(--muted)]">
                  No bookings assigned to this driver id yet.
                </div>
              )}

              {bookings.length > 0 && (
                <div className="mt-4 space-y-3">
                  <select
                    className="text-field"
                    value={selectedBookingId ?? ''}
                    onChange={(e) => setSelectedBookingId(e.target.value || null)}
                  >
                    {bookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        BOOKING {shortId(b.id)} · {b.status ?? 'unknown'}
                      </option>
                    ))}
                  </select>

                  {selectedBooking && (
                    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-[12px] font-black uppercase tracking-widest">
                          BOOKING {shortId(selectedBooking.id)}
                        </div>
                        <div className="text-[11px] font-black text-[var(--muted)] uppercase tracking-widest">
                          {selectedBooking.status ?? 'unknown'}
                        </div>
                      </div>

                      <div className="mt-3 text-[11px] font-black text-[var(--muted)] uppercase tracking-widest">
                        Current milestone
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {MILESTONES.map((m) => (
                          <button
                            key={m}
                            type="button"
                            disabled={saving}
                            onClick={() => updateMilestone(m)}
                            className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${
                              currentMilestone === m
                                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'
                            }`}
                          >
                            {m.replace('_', ' ')}
                          </button>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center gap-2 text-[12px] font-bold text-[var(--muted)]">
                        <LucideCheckCircle2 size={14} className="text-[var(--accent)]" />
                        Business Tracking reads your `device_id` from `bookings.driver_id`.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 text-[12px] font-bold text-[var(--muted)] max-w-[92ch]">
          If your business dashboard still shows &quot;Signal lost&quot;, it usually means:
          1) this page is not running on the driver device, 2) geolocation permission was denied, or
          3) Supabase RLS is blocking `INSERT/UPDATE` on `public.user_locations`.
        </div>
      </div>
    </div>
  );
}

