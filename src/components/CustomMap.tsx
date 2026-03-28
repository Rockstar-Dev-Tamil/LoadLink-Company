import React from 'react';

/**
 * CustomMap: A React bridge for the high-fidelity Google Maps demo.
 * This component hosts the standalone tracking map in an iframe.
 */
export function CustomMap() {
  return (
    <div className="w-full h-full relative overflow-hidden rounded-[32px] bg-[var(--surface-strong)]">
      <iframe
        src="/tracking-map/index.html"
        title="Tracking Map Demo"
        className="w-full h-full border-0"
        allow="geolocation"
      />
    </div>
  );
}
