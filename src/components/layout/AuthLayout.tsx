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
    <div className="min-h-screen bg-[#02060c] flex font-body selection:bg-[var(--accent)]/30 overflow-hidden relative">
      {/* Animated Background Gradients (Global) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.4, 1],
            opacity: [0.15, 0.25, 0.15],
            x: ['-10%', '10%', '-10%'],
            y: ['-10%', '10%', '-10%']
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-indigo-600/20 blur-[140px]"
        />
        <motion.div 
          animate={{ 
            scale: [1.4, 1, 1.4],
            opacity: [0.1, 0.2, 0.1],
            x: ['10%', '-10%', '10%'],
            y: ['10%', '-10%', '10%']
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[80vw] h-[80vw] rounded-full bg-blue-600/15 blur-[160px]"
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
      </div>

      {/* Left Branding Panel (Desktop Only) */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden bg-white/[0.01] border-r border-white/5 items-center justify-center p-16 z-10">
        {/* Content */}
        <div className="relative z-10 w-full max-w-md">
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "circOut" }}
          >
            <div className="flex items-center gap-4 mb-24 group">
              <motion.div 
                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent-bright)] to-[var(--accent)] flex items-center justify-center text-white font-black text-3xl shadow-[0_0_40px_rgba(70,127,227,0.5)] group-hover:shadow-[0_0_60px_rgba(70,127,227,0.7)] transition-all cursor-pointer"
              >
                L
              </motion.div>
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white tracking-tight font-display uppercase leading-none">LoadLink</span>
                <span className="text-[9px] font-black text-[var(--accent)] tracking-[0.4em] uppercase mt-1 opacity-80">Autonomous Logistics</span>
              </div>
            </div>

            <h1 className="text-6xl xl:text-8xl font-black text-white leading-[0.85] mb-12 font-display uppercase tracking-[-0.06em]">
              The Future <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-indigo-400">Moves</span> <br />
              With Us.
            </h1>
            
            <p className="text-lg text-[var(--muted-strong)] leading-relaxed mb-16 font-medium opacity-90">
              Transforming empty miles into efficient routes with our next-gen AI matching engine.
            </p>

            <div className="space-y-5">
              {[
                { icon: LucideTruck, label: 'ULIP VERIFIED', sub: 'GOVERNMENT BACKED FLEET', color: 'text-indigo-400' },
                { icon: LucideShieldCheck, label: 'SECURE ESCROW', sub: 'ZERO-RISK PAYMENTS', color: 'text-emerald-400' },
                { icon: LucideZap, label: 'LIVE PULSE', sub: 'REAL-TIME OPERATIONS', color: 'text-[var(--accent)]' }
              ].map((item, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (0.1 * i), duration: 0.6 }}
                  key={i}
                  className="flex items-center gap-6 p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 hover:translate-x-2 transition-all cursor-default group"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-[#0a111a] border border-white/5 flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform shadow-lg`}>
                    <item.icon size={22} />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] font-black text-white/40 mb-1 tracking-[0.2em] uppercase">{item.label}</div>
                    <div className="text-[13px] text-white font-black tracking-tight group-hover:text-[var(--accent)] transition-colors">{item.sub}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-20 relative z-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "circOut" }}
          className="w-full max-w-lg"
        >
          <div className="lg:hidden mb-16 flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-white font-black text-2xl shadow-[0_0_30px_rgba(70,127,227,0.3)]">L</div>
             <span className="text-3xl font-black text-white font-display tracking-tighter uppercase">LOADLINK</span>
          </div>

          <div className="mb-12 text-left px-2">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl font-black text-white mb-4 tracking-[-0.04em] font-display uppercase leading-none"
            >
              {title}
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-[var(--muted-strong)] text-lg font-bold tracking-tight opacity-70"
            >
              {subtitle}
            </motion.p>
          </div>

          <div className="relative group">
            {/* Animated Glow Behind Card */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[var(--accent)] to-indigo-500 rounded-[3.5rem] blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />
            
            <div className="relative glass-card rounded-[3.5rem] p-10 lg:p-14 border border-white/10 backdrop-blur-[40px] shadow-2xl">
               {/* Decorative Interior Accents */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2" />
               
               <div className="relative z-10">
                {children}
               </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
