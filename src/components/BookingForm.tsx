import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  LucideMapPin, 
  LucideNavigation, 
  LucideChevronRight, 
  LucideTruck, 
  LucideZap,
  LucideShieldCheck,
  LucideLoader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { geocodingService } from '../services/geocodingService';
import { toast } from 'sonner';

interface BookingFormProps {
  onSuccess: (shipmentId: string) => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation(['booking', 'common']);
  const { profile } = useAuthStore();
  const [loadType, setLoadType] = useState<'FTL' | 'LTL'>('FTL');
  const [weight, setWeight] = useState(12.5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) {
      toast.error(t('booking:toast.login_required'));
      return;
    }
    
    setIsSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const pickupAddress = fd.get('pickup') as string;
    const dropAddress = fd.get('drop') as string;
    const weightKg = weight * 1000;

    try {
      const [pickupLocation, dropLocation] = await Promise.all([
        geocodingService.geocodeAddress(pickupAddress),
        geocodingService.geocodeAddress(dropAddress),
      ]);

      const distanceKm = Math.sqrt(
        Math.pow((pickupLocation.coordinates[1] - dropLocation.coordinates[1]) * 111, 2) +
          Math.pow((pickupLocation.coordinates[0] - dropLocation.coordinates[0]) * 111, 2)
      );
      const price = Math.max(3500, Math.round(distanceKm * 40 + (weightKg / 1000) * 800));

      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          business_id: profile.id,
          pickup_address: pickupAddress,
          drop_address: dropAddress,
          weight_kg: weightKg,
          pickup_location: geocodingService.formatToWKT(pickupLocation.coordinates[0], pickupLocation.coordinates[1]) as any,
          drop_location: geocodingService.formatToWKT(dropLocation.coordinates[0], dropLocation.coordinates[1]) as any,
          is_partial: loadType === 'LTL',
          price,
          status: 'pending'
        })
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      if (shipment) {
        toast.success(t('booking:toast.request_published'));
        onSuccess(shipment.id);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t('booking:toast.failed_create'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10 text-left">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Pickup Location */}
        <div className="space-y-4">
          <label className="block text-[10px] font-black text-[var(--muted)] uppercase tracking-widest pl-1">Pickup Location</label>
          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--accent)] group-focus-within:scale-110 transition-transform">
              <LucideMapPin size={20} />
            </div>
            <input 
              required
              name="pickup"
              type="text" 
              placeholder="Search address or industrial hub..." 
              className="premium-input pl-14 h-16 text-sm bg-[var(--surface-soft)] border-[var(--border)] focus:border-[var(--accent)]/50 focus:bg-[var(--surface-solid)]"
            />
          </div>
        </div>

        {/* Drop Location */}
        <div className="space-y-4">
          <label className="block text-[10px] font-black text-[var(--muted)] uppercase tracking-widest pl-1">Drop-off Destination</label>
          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-accent group-focus-within:scale-110 transition-transform">
              <LucideNavigation size={20} />
            </div>
            <input 
              required
              name="drop"
              type="text" 
              placeholder="Enter warehouse or port address..." 
              className="premium-input pl-14 h-16 text-sm bg-[var(--surface-soft)] border-[var(--border)] focus:border-[var(--accent)]/50 focus:bg-[var(--surface-solid)]"
            />
          </div>
        </div>

        {/* Load Type Toggle */}
        <div className="col-span-1 md:col-span-2 space-y-4">
          <label className="block text-[10px] font-black text-[var(--muted)] uppercase tracking-widest pl-1">Shipment Load Type</label>
          <div className="grid grid-cols-2 gap-4 p-1.5 bg-[var(--bg-deep)] rounded-2xl border border-[var(--border)] h-16">
            <button 
              type="button"
              onClick={() => setLoadType('FTL')}
              className={cn(
                "flex items-center justify-center gap-3 rounded-xl transition-all font-black uppercase text-[10px] tracking-[0.2em]",
                loadType === 'FTL' ? "bg-[var(--accent)] shadow-xl text-white shadow-[var(--accent)]/20" : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-soft)]"
              )}
            >
              Full Load (FTL)
            </button>
            <button 
              type="button"
              onClick={() => setLoadType('LTL')}
              className={cn(
                "flex items-center justify-center gap-3 rounded-xl transition-all font-black uppercase text-[10px] tracking-[0.2em]",
                loadType === 'LTL' ? "bg-[var(--accent)] shadow-xl text-white shadow-[var(--accent)]/20" : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-soft)]"
              )}
            >
              Part Load (LTL)
            </button>
          </div>
        </div>

        {/* Weight & Volume */}
        <div className="space-y-4">
          <label className="block text-[10px] font-black text-[var(--muted)] uppercase tracking-widest pl-1">
             Estimated Weight • <span className="text-[var(--accent-bright)]">{weight} TONS</span>
          </label>
          <div className="flex items-center gap-6 p-6 rounded-2xl bg-[var(--bg-deep)] border border-[var(--border)]">
            <input 
              type="range" 
              min="1" 
              max="50" 
              step="0.5" 
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-[var(--surface-soft)] rounded-full appearance-none cursor-pointer accent-[var(--accent)]"
            />
            <LucideTruck className="text-[var(--muted)] opacity-30" size={24} />
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-[10px] font-black text-[var(--muted)] uppercase tracking-widest pl-1">Cargo Dimensions (m)</label>
          <div className="grid grid-cols-3 gap-3">
            {['Length', 'Width', 'Height'].map((dim) => (
              <div key={dim} className="bg-[var(--bg-deep)] px-4 py-4 rounded-xl text-center border border-[var(--border)] group hover:border-[var(--accent)]/30 transition-colors">
                <span className="text-[9px] font-black block text-[var(--muted)] uppercase mb-1 tracking-tighter">{dim}</span>
                <span className="font-bold text-[var(--text)] text-sm">2.4</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 flex items-center justify-between pt-8 border-t border-[var(--border)]">
        <button type="button" className="text-[10px] tracking-[0.2em] font-black text-[var(--muted)] uppercase hover:text-[var(--text)] transition-colors">Save as Template</button>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="primary-button h-16 px-12 group shadow-[0_0_30px_rgba(var(--brand-primary-rgb),0.2)]"
        >
          {isSubmitting ? (
            <>
              <LucideLoader2 size={20} className="animate-spin" />
              <span>SCANNING ROUTES...</span>
            </>
          ) : (
            <>
              <span className="text-[10px] tracking-[0.2em]">CALCULATE ROUTES</span>
              <LucideChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};
