import React from 'react';
import { Star, MoreHorizontal } from 'lucide-react';
import { motion } from 'motion/react';

interface MatchCardProps {
  provider: string;
  rating: number;
  shipments: string;
  price: string;
  eta: string;
  matchScore: number;
  route: string;
}

export const MatchCard: React.FC<MatchCardProps> = ({ provider, rating, shipments, price, eta, matchScore }) => {
  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      className="backdrop-blur-md bg-white/10 border border-white/20 shadow-xl rounded-[2rem] p-6 transition-all duration-500 group"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-surface-highest flex items-center justify-center">
            <div className="w-8 h-8 signature-gradient rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">T</span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-black font-display text-white">{provider}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Star className="text-amber-400 fill-amber-400" size={14} />
              <span className="text-sm text-text-secondary">{rating} • {shipments} shipments</span>
            </div>
          </div>
        </div>
        <div className="px-4 py-2 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></span>
          <span className="text-brand-accent text-xs font-black uppercase tracking-widest">{matchScore}% Match</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="col-span-3 h-32 rounded-2xl overflow-hidden bg-surface-low relative border border-white/5">
          <img 
            src={`https://picsum.photos/seed/${provider}/400/200`} 
            alt="Route map" 
            className="w-full h-full object-cover opacity-40 grayscale"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="px-3 py-1 bg-bg-base/80 backdrop-blur-md rounded-full border border-white/10 text-[10px] text-brand-accent font-black tracking-widest uppercase">
              Optimized Route
            </div>
          </div>
        </div>
        <div className="col-span-2 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-widest font-black">Price</p>
              <p className="text-xl font-black font-display text-white">{price}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-widest font-black">ETA</p>
              <p className="text-xl font-black font-display text-brand-primary">{eta}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex-1 py-4 rounded-2xl bg-brand-primary text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40 transition-all active:scale-95">
          Book Now
        </button>
        <button className="p-4 rounded-2xl bg-surface-high text-white/40 hover:text-white transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>
    </motion.div>
  );
};
