import { LucideBellRing, LucideMapPin, LucidePackageCheck, LucideTruck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { BookingForm } from '../components/BookingForm';
import { Topbar } from '../components/Topbar';

export default function BookShipment() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar title="Post Shipment" subtitle="Publish a load and let nearby truck drivers request it from their portal." />

      <div className="page-scroll pb-24">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_360px] gap-8">
          <section className="card premium-grid">
            <div className="section-label">NETWORK POSTING</div>
            <div className="mt-3 max-w-3xl">
              <h1 className="text-[34px] font-semibold tracking-[-0.05em] text-[var(--text)]">
                Publish a shipment and let drivers book it.
              </h1>
              <p className="mt-3 text-[15px] leading-7 text-[var(--muted)]">
                This flow now works like a live load board. Once you post, the shipment goes into the open marketplace and truck drivers can pick it from their driver portal.
              </p>
            </div>

            <div className="mt-8">
              <BookingForm
                onSuccess={() => {
                  navigate('/shipments');
                }}
              />
            </div>
          </section>

          <aside className="space-y-4">
            <div className="infocard p-6 rounded-[28px]">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)]/20 border border-[var(--border)] flex items-center justify-center text-[var(--accent-deep)]">
                <LucidePackageCheck size={22} />
              </div>
              <div className="mt-4 text-[22px] font-semibold tracking-[-0.04em] text-[var(--text)]">How it works now</div>
              <div className="mt-4 space-y-3 text-[14px] leading-6 text-[var(--muted)]">
                <div>1. Post the shipment from this screen.</div>
                <div>2. The load appears in the driver portal as an open shipment.</div>
                <div>3. A driver taps book, which creates a booking request for your business.</div>
                <div>4. The shipment moves into your shipments and tracking workflow.</div>
              </div>
            </div>

            <div className="infocard p-6 rounded-[28px]">
              <div className="flex items-center gap-3">
                <LucideMapPin size={18} className="text-[var(--accent-deep)]" />
                <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Business View</div>
              </div>
              <div className="mt-4 text-[14px] leading-6 text-[var(--muted)]">
                After posting, watch <span className="text-[var(--text)] font-semibold">Shipments</span> for a driver request and open <span className="text-[var(--text)] font-semibold">Tracking</span> once a driver is assigned.
              </div>
            </div>

            <div className="infocard p-6 rounded-[28px]">
              <div className="flex items-center gap-3">
                <LucideTruck size={18} className="text-[var(--accent-deep)]" />
                <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Driver View</div>
              </div>
              <div className="mt-4 text-[14px] leading-6 text-[var(--muted)]">
                Drivers now browse the live load board inside their portal instead of waiting for pre-matched assignments.
              </div>
            </div>

            <div className="infocard p-6 rounded-[28px]">
              <div className="flex items-center gap-3">
                <LucideBellRing size={18} className="text-[var(--accent-deep)]" />
                <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Realtime</div>
              </div>
              <div className="mt-4 text-[14px] leading-6 text-[var(--muted)]">
                Notifications, shipment cards, and driver booking lists will update automatically through Supabase realtime.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
