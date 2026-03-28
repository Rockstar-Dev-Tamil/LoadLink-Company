import { useRouteError, useNavigate } from 'react-router-dom';
import { LucideAlertTriangle, LucideRefreshCw, LucideHome } from 'lucide-react';
import { useEffect } from 'react';

export function RootError() {
  const error = useRouteError() as any;
  const navigate = useNavigate();

  // Automatically attempt to reload if it's a chunk loading error
  useEffect(() => {
    const isChunkError = 
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.name === 'ChunkLoadError' ||
      (typeof error === 'string' && error.includes('Failed to fetch dynamically imported module'));

    if (isChunkError) {
      console.warn('Chunk load error detected, attempting auto-reload...');
      // Small delay to avoid infinite reload loops if there's a real network issue
      const timer = setTimeout(() => {
        window.location.reload();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#02060c] flex items-center justify-center p-6 text-white font-sans">
      <div className="max-w-md w-full glass-panel p-8 bg-white/5 border-white/10 rounded-[32px] text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <LucideAlertTriangle size={32} />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">System Interruption</h1>
          <p className="text-[var(--muted)] text-sm leading-relaxed">
            {error?.message?.includes('Failed to fetch dynamically imported module') 
              ? "A new version of LoadLink is available. We need to refresh your session to sync the latest updates."
              : "An unexpected runtime error occurred. Our engineers have been notified (simulated)."}
          </p>
        </div>

        {error?.message && (
          <div className="bg-black/40 rounded-xl p-4 text-left overflow-hidden">
            <code className="text-[10px] font-mono text-rose-300/70 break-all leading-tight">
              {error.message}
            </code>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleReload}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white text-black font-bold hover:bg-indigo-50 transition-colors"
          >
            <LucideRefreshCw size={18} />
            <span>Reload App</span>
          </button>
          <button
            onClick={handleGoHome}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-colors"
          >
            <LucideHome size={18} />
            <span>Go Home</span>
          </button>
        </div>
        
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
          LoadLink MSME Portal • Error Subsystem
        </p>
      </div>
    </div>
  );
}
