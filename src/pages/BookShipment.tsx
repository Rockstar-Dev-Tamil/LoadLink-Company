import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LucideTruck, 
  LucideUsers, 
  LucideCreditCard, 
  LucideShieldCheck, 
  LucideZap, 
  LucideMapPin,
  LucideCheckCircle2,
  LucideSearch,
  LucideArrowRight,
  LucideLoader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { BookingForm } from '../components/BookingForm';
import { useAuthStore } from '../stores/authStore';
import { useMatches } from '../hooks/useMatches';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export default function BookShipment() {
  const navigate = useNavigate();
  const { t } = useTranslation(['booking', 'common']);
  const [step, setStep] = useState<1 | 2>(1);
  const [currentShipmentId, setCurrentShipmentId] = useState<string | null>(null);
  const [acceptingMatchId, setAcceptingMatchId] = useState<string | null>(null);
  const { profile } = useAuthStore();
  const { matches, loading: matchesLoading } = useMatches(currentShipmentId);

  const steps = [
    { id: 1, name: 'SHIPMENT DETAILS', icon: LucideTruck },
    { id: 2, name: 'CARRIER SELECTION', icon: LucideUsers },
    { id: 3, name: 'CONFIRM & PAY', icon: LucideCreditCard }
  ];

  const handleAcceptMatch = async (match: any) => {
    if (!profile || !currentShipmentId) return;
    setAcceptingMatchId(match.id);

    try {
      const { error: matchError } = await supabase
        .from('matches')
        .update({ status: 'accepted' })
        .eq('id', match.id);
      if (matchError) throw matchError;

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          shipment_id: currentShipmentId,
          driver_id: match.route.truck.driver_id,
          business_id: profile.id,
          route_id: match.route_id,
          agreed_price: match.route.price || 5000,
          status: 'requested'
        })
        .select()
        .single();
      if (bookingError) throw bookingError;

      await supabase
        .from('payments')
        .insert({
          booking_id: booking.id,
          amount: booking.agreed_price,
          payment_status: 'pending'
        });

      await supabase
        .from('shipments')
        .update({ status: 'matched' })
        .eq('id', currentShipmentId);

      toast.success(t('booking:toast.match_accepted'));
      navigate('/shipments');
    } catch (err: any) {
      toast.error(err.message || t('booking:toast.failed_accept'));
    } finally {
      setAcceptingMatchId(null);
    }
  };

  return (
    <div className="space-y-10 pb-20 overflow-visible p-8 max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter font-display uppercase">Book Shipment</h1>
          <p className="text-[var(--muted)] font-bold tracking-tight">AI-OPTIMIZED ROUTING & REAL-TIME QUOTING</p>
        </div>
        
        {/* Step Indicator */}
        <div className="flex items-center gap-2 bg-[var(--surface-soft)] p-2 rounded-3xl border border-[var(--border)] backdrop-blur-md">
          {steps.map((s, i) => (
            <React.Fragment key={s.id}>
              <div 
                className={cn(
                  "flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-500",
                  step === s.id 
                    ? "bg-[var(--accent)] text-white shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.3)] scale-105" 
                    : "text-[var(--muted)] hover:text-[var(--text)] cursor-default"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm",
                  step === s.id ? "bg-white/20" : "bg-[var(--bg-deep)] border border-[var(--border)]"
                )}>
                  <s.icon size={16} />
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-[9px] font-black uppercase tracking-widest leading-none mb-1 opacity-70">Step 0{s.id}</div>
                  <div className="text-[11px] font-black uppercase tracking-tight leading-none">{s.name}</div>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="w-6 h-[1px] bg-[var(--border)] hidden lg:block" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start"
          >
            <div className="lg:col-span-8 space-y-10 text-left">
              <div className="glass-card rounded-[3rem] p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <LucideTruck size={120} className="rotate-12" />
                </div>
                <BookingForm onSuccess={(id) => {
                  setCurrentShipmentId(id);
                  setStep(2);
                }} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card rounded-[2.5rem] p-8 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <LucideShieldCheck size={24} />
                  </div>
                  <h3 className="text-lg font-black text-white font-display uppercase">SafeTrans Escrow</h3>
                  <p className="text-sm text-[var(--muted)] font-medium leading-relaxed">
                    Your payment is held securely in escrow and only released to the carrier after successful delivery confirmation.
                  </p>
                </div>
                <div className="glass-card rounded-[2.5rem] p-8 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <LucideZap size={24} />
                  </div>
                  <h3 className="text-lg font-black text-white font-display uppercase">Instant Matching</h3>
                  <p className="text-sm text-[var(--muted)] font-medium leading-relaxed">
                    Connect with ULIP-verified carriers instantly. Our AI optimizes routes to reduce empty miles by up to 40%.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-8 text-left">
              <div className="glass-card rounded-[3rem] p-8 space-y-8 sticky top-8">
                <h3 className="text-xl font-black text-white font-display uppercase tracking-tight">Shipment Summary</h3>
                
                <div className="space-y-6">
                  {[
                    { label: 'ROUTE', value: 'Not Set', icon: LucideMapPin },
                    { label: 'WEIGHT', value: 'Not Set', icon: LucideTruck },
                    { label: 'EST. PRICE', value: '---', icon: LucideZap, highlight: true }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-5 p-4 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)]">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-deep)] flex items-center justify-center text-[var(--accent)]">
                        <item.icon size={18} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">{item.label}</div>
                        <div className={cn(
                          "text-sm font-black uppercase tracking-tight",
                          item.highlight ? "text-[var(--accent-bright)]" : "text-white"
                        )}>{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-[var(--muted)] font-bold uppercase tracking-widest text-[10px]">Tax & Fees Included</span>
                    <span className="text-white font-black text-lg">---</span>
                  </div>
                  <button disabled className="w-full h-16 rounded-2xl border border-[var(--border)] text-[var(--muted)] font-black uppercase tracking-[0.2em] text-[10px] cursor-not-allowed">
                    PROCEED TO STEP 2
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10 text-left"
          >
            <div className="flex items-center justify-between">
               <h2 className="text-2xl font-black text-white font-display uppercase tracking-tight">Available Carrier Matches</h2>
               <button onClick={() => setStep(1)} className="text-[10px] font-black text-[var(--muted)] uppercase hover:text-[var(--text)] transition-colors">← Back to Details</button>
            </div>

            {matchesLoading ? (
              <div className="glass-card rounded-[3rem] p-20 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-[var(--accent)]/20 border-t-[var(--accent)] animate-spin" />
                  <LucideSearch className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--accent)]" size={30} />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-black text-white font-display uppercase tracking-tight mb-2">Scanning Network</h3>
                  <p className="text-[var(--muted)] font-medium">Finding ULIP-verified carriers for your route...</p>
                </div>
              </div>
            ) : matches.length === 0 ? (
              <div className="glass-card rounded-[3rem] p-20 flex flex-col items-center justify-center space-y-6 border-dashed">
                <div className="w-20 h-20 rounded-full bg-[var(--surface-soft)] flex items-center justify-center text-[var(--muted)]">
                   <LucideTruck size={40} />
                </div>
                <div className="text-center max-w-md">
                   <h3 className="text-xl font-black text-white font-display uppercase tracking-tight mb-2">No Instant Matches</h3>
                   <p className="text-[var(--muted)] font-medium mb-8">We've published your request to our carrier network. You'll be notified as soon as a match is found.</p>
                   <button onClick={() => navigate('/shipments')} className="primary-button px-10">VIEW MY REQUESTS</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {matches.map((match) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={match.id} 
                    className="glass-card rounded-[2.5rem] p-8 space-y-6 group hover:border-[var(--accent)]/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)]">
                            <LucideTruck size={28} />
                         </div>
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                               <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">98% Match</span>
                               <div className="w-1 h-1 bg-[var(--border)] rounded-full" />
                               <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">ULIP Verified</span>
                            </div>
                            <h4 className="text-lg font-black text-white font-display uppercase tracking-tight">{match.route.truck.truck_type}</h4>
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-1">FIRM RATE</div>
                         <div className="text-2xl font-black text-white">₹{match.route.price?.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)]">
                       <div className="space-y-1">
                          <span className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest block">CARRIER RATING</span>
                          <div className="flex items-center gap-1 text-[var(--accent-bright)]">
                             <span className="text-sm font-black">4.9</span>
                             <span className="text-xs">★★★★★</span>
                          </div>
                       </div>
                       <div className="space-y-1">
                          <span className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest block">TRANSIT TIME</span>
                          <span className="text-sm font-black text-white italic">~14 HOURS</span>
                       </div>
                    </div>

                    <button 
                      onClick={() => handleAcceptMatch(match)}
                      disabled={!!acceptingMatchId}
                      className="primary-button w-full h-14 text-[10px] font-black uppercase tracking-[0.2em]"
                    >
                      {acceptingMatchId === match.id ? (
                        <>
                          <LucideLoader2 size={16} className="animate-spin" />
                          <span>SECURING LOCK...</span>
                        </>
                      ) : (
                        <>
                          <span>ACCEPT & BOOK MATCH</span>
                          <LucideArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
