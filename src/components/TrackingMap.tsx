import React from 'react';

export function TrackingMap() {
  return (
    <div className="w-full h-full min-h-[500px] relative rounded-2xl overflow-hidden glass-panel border-white/5">
      <iframe 
        src="/tracking-map/index.html" 
        className="w-full h-full border-none"
        title="Live Tracking Map"
        style={{ filter: 'grayscale(0.2) contrast(1.1) brightness(0.9)' }}
      />
    </div>
  );
}
