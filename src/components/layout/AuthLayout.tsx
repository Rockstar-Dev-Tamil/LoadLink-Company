import React from 'react';
import { motion } from 'framer-motion';
import { LucideTruck, LucideShieldCheck, LucideZap } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-bg-base flex font-body selection:bg-indigo-500/30">
      {/* Left Branding Panel (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-bg-surface border-r border-white/5 items-center justify-center p-12">
        {/* Animated Background Glows */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
              x: [-20, 20, -20],
              y: [-20, 20, -20]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px]"
          />
          <motion.div 
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.05, 0.1, 0.05],
              x: [20, -20, 20],
              y: [20, -20, 20]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[150px]"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-lg">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center gap-4 mb-20 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--accent-bright)] to-[var(--accent)] flex items-center justify-center text-white font-black text-2xl shadow-[0_0_30px_rgba(70,127,227,0.4)] group-hover:scale-110 transition-transform">
                L
              </div>
              <span className="text-3xl font-black text-white tracking-tighter font-display uppercase">LoadLink</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-black text-white leading-[0.9] mb-10 font-display uppercase tracking-tighter">
              30-40% of <br />
              <span className="text-[var(--accent)]">Trucks</span> <br />
              Run Empty.
            </h1>
            <p className="text-xl text-[var(--muted)] leading-relaxed mb-16 font-medium max-w-md">
              We're bridging the gap with real-time AI matching and sustainable routing for modern logistics.
            </p>

            <div className="grid grid-cols-1 gap-4">
              {[
                { icon: LucideTruck, label: 'ULIP VERIFIED', sub: 'GOVERNMENT BACKED FLEET' },
                { icon: LucideShieldCheck, label: 'SECURE ESCROW', sub: 'ZERO-RISK PAYMENTS' },
                { icon: LucideZap, label: 'LIVE PULSE', sub: 'REAL-TIME OPERATIONS' }
              ].map((item, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 * i }}
                  key={i}
                  className="flex items-center gap-5 p-5 rounded-3xl bg-[var(--surface-soft)] border border-[var(--border)] backdrop-blur-md group hover:bg-[var(--surface-strong)] hover:border-[var(--accent-soft)] transition-all cursor-default"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[var(--bg-deep)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-all shadow-sm">
                    <item.icon size={22} />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] font-black text-[var(--accent)] mb-0.5 tracking-widest uppercase">{item.label}</div>
                    <div className="text-[11px] text-[var(--muted)] font-bold tracking-wider">{item.sub}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-12 flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white font-black text-lg">L</div>
             <span className="text-2xl font-black text-white font-display tracking-tighter">LOADLINK</span>
          </div>

          <div className="mb-10 text-left">
            <h2 className="text-4xl font-black text-white mb-3 tracking-tighter font-display uppercase">{title}</h2>
            <p className="text-[var(--muted)] font-bold tracking-tight">{subtitle}</p>
          </div>

          <div className="glass-card rounded-[3rem] p-10 lg:p-12 relative overflow-hidden">
             {/* Decorative Elements */}
             <div className="absolute -top-20 -right-20 w-40 h-40 bg-[var(--accent-soft)] blur-[60px] rounded-full opacity-50" />
             <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[var(--glow-2)] blur-[60px] rounded-full opacity-30" />
             {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
