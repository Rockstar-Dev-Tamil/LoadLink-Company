import { LucideArrowRight, LucideBuilding2, LucideTruck } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[var(--bg-deep)] text-[var(--text)]">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(120,140,170,0.16),transparent_28%)]" />

      <div className="relative z-10 min-h-screen px-6 py-10 md:px-10 lg:px-16">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center">
          <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="card hero-card !p-8 md:!p-10 lg:!p-12">
              <div className="section-label">LOADLINK</div>
              <h1 className="mt-4 text-[42px] leading-[0.95] font-semibold tracking-[-0.06em] sm:text-[56px] lg:text-[72px]">
                Choose your portal.
              </h1>
              <p className="mt-6 max-w-2xl text-[15px] leading-7 text-[var(--muted)] sm:text-[17px]">
                One entry point, two experiences. Businesses manage shipments, tracking, payments, and proofs. Drivers continue into their own delivery portal.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => window.location.href = 'https://lorrylink.vercel.app/'}
                  className="group rounded-[28px] border border-[var(--border)] bg-[var(--surface-soft)] p-6 text-left transition hover:border-[var(--border-strong)] hover:bg-white/[0.04]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--accent-deep)]">
                    <LucideTruck size={22} />
                  </div>
                  <div className="mt-5 text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Driver Portal</div>
                  <div className="mt-2 text-[28px] font-semibold tracking-[-0.04em]">I&apos;m driver</div>
                  <div className="mt-3 flex items-center gap-2 text-[13px] font-medium text-[var(--muted)]">
                    Continue to delivery login
                    <LucideArrowRight size={16} className="transition group-hover:translate-x-1" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => window.location.href = 'https://load-link-company.vercel.app/'}
                  className="group rounded-[28px] border border-[var(--border)] bg-[var(--surface-soft)] p-6 text-left transition hover:border-[var(--border-strong)] hover:bg-white/[0.04]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--accent-deep)]">
                    <LucideBuilding2 size={22} />
                  </div>
                  <div className="mt-5 text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Business Portal</div>
                  <div className="mt-2 text-[28px] font-semibold tracking-[-0.04em]">I&apos;m MSME</div>
                  <div className="mt-3 flex items-center gap-2 text-[13px] font-medium text-[var(--muted)]">
                    Open business workspace
                    <LucideArrowRight size={16} className="transition group-hover:translate-x-1" />
                  </div>
                </button>
              </div>
            </section>

            <section className="card !p-8 md:!p-10 lg:!p-12">
              <div className="section-label">PLATFORM OVERVIEW</div>
              <div className="mt-5 space-y-4">
                <div className="infocard rounded-[24px] p-5">
                  <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">For MSMEs</div>
                  <div className="mt-2 text-[24px] font-semibold tracking-[-0.04em]">Post, track, verify.</div>
                  <p className="mt-3 text-[14px] leading-6 text-[var(--muted)]">
                    Publish loads, review live tracking, approve proof photos, manage payments, and communicate with the assigned driver.
                  </p>
                </div>

                <div className="infocard rounded-[24px] p-5">
                  <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">For Drivers</div>
                  <div className="mt-2 text-[24px] font-semibold tracking-[-0.04em]">Drive, update, deliver.</div>
                  <p className="mt-3 text-[14px] leading-6 text-[var(--muted)]">
                    Continue into the driver-side workflow to manage assigned bookings, share live device location, and update milestones on the road.
                  </p>
                </div>

                <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-white/[0.02] p-5 text-[13px] leading-6 text-[var(--muted)]">
                  If you already have an account, choose your side and sign in. If you are a new MSME user, continue from the MSME login screen to create your account.
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
