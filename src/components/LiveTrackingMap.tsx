import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { LucideTruck } from 'lucide-react';

// Fix for Leaflet default icon issues in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Location {
  lng: number;
  lat: number;
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

export interface TrackedShipment {
  id: string;
  origin: Location;
  destination: Location;
  truckLocation?: Location;
  // Optional override for OSRM routing origin (for example, live truck position when navigating).
  routeOrigin?: Location;
  truckStatus?: {
    speed?: number | null;
    recordedAt?: string | null;
    bookingStatus?: string | null;
    milestone?: string | null;
  };
  trackPath?: Location[];
  status?: string;
  color?: string;
  routeData?: {
    distance: number;
    duration: number;
    steps: RouteStep[];
  };
}

interface LiveTrackingMapProps {
  shipments: TrackedShipment[];
  onSelectShipment?: (id: string) => void;
  onRouteDataUpdate?: (id: string, data: any) => void;
  activeShipmentId?: string | null;
  candidates?: Array<{
    id: string;
    location: Location;
    label?: string;
  }>;
  followShipmentId?: string | null;
  followMode?: boolean;
  overviewKey?: number;
  onMapReady?: (map: L.Map) => void;
}

const shipmentColors = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
];

const calculateBearing = (start: { lat: number, lng: number }, end: { lat: number, lng: number }) => {
  const startLat = (start.lat * Math.PI) / 180;
  const startLng = (start.lng * Math.PI) / 180;
  const endLat = (end.lat * Math.PI) / 180;
  const endLng = (end.lng * Math.PI) / 180;

  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
  
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
};

const formatDistance = (meters: number) => {
  if (!Number.isFinite(meters)) return '--';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.max(0, Math.round(meters))} m`;
};

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '--';
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
  }
  return `${totalMinutes} min`;
};

const haversineMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371e3;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

const resolveDriverStatus = (remainingDistanceMeters: number) => {
  if (!Number.isFinite(remainingDistanceMeters)) return 'Driver en route';
  if (remainingDistanceMeters <= 200) return 'Driver arrived';
  if (remainingDistanceMeters <= 800) return 'Driver nearby';
  if (remainingDistanceMeters <= 2500) return 'Driver arriving';
  return 'Driver en route';
};

const createTruckIcon = (color: string, bearing: number, connected: boolean) => {
  return L.divIcon({
    className: `truck-marker-wrapper${connected ? '' : ' is-offline'}`,
    html: `
      <div class="driver-marker">
        <div class="truck-pin" style="transform: rotate(${bearing}deg)">
          <svg viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="0.5">
            <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5zm-14 10.5c-.83 0-1.5-.67-1.5-1.5S5.17 15.5 6 15.5s1.5.67 1.5 1.5S6.83 18.5 6 18.5zm9-9h3.5l1.96 2.5H15V9.5zm2 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"></path>
          </svg>
        </div>
        <div class="marker-pulse" style="background-color: ${color}"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

const createDestinationIcon = (color: string) => {
  return L.divIcon({
    className: 'destination-marker-wrapper',
    html: `
      <div class="pickup-marker">
        <div class="pickup-pin" style="border-color: ${color}"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  });
};

// Helper to create custom circle markers using DivIcon
const createCircleIcon = (color: string, size: number = 12, border: string = 'white') => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid ${border}; box-shadow: 0 0 10px ${color}66;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

// Note: We used to fetch OSRM JSON manually for steps/maneuvers.
// We now use Leaflet Routing Machine for the polyline + instruction extraction.

// Leaflet Routing Machine control: draws the route line and exposes instructions.
// Also decorates the route with waypoint dots + a maneuver marker (inspired by webpage map/script.js).
const RoutingControl = ({
  shipmentId,
  start,
  end,
  color,
  truckLocation,
  onRouteFound,
}: {
  shipmentId: string;
  start: Location;
  end: Location;
  color: string;
  truckLocation?: Location;
  onRouteFound?: (id: string, data: any) => void;
}) => {
  const map = useMap();
  const routingControlRef = useRef<L.Routing.Control | null>(null);
  const decoLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    const decoLayer = L.layerGroup().addTo(map);
    decoLayerRef.current = decoLayer;
    const router = L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' });

    const routingControl = L.Routing.control({
      waypoints: [L.latLng(start.lat, start.lng), L.latLng(end.lat, end.lng)],
      router,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: false,
      show: false,
      createMarker: () => null as any,
      lineOptions: {
        styles: [
          { color: 'rgba(55, 115, 255, 0.22)', weight: 12, opacity: 1 },
          { color, opacity: 0.85, weight: 4 },
        ],
      },
    }).on('routesfound', (e: any) => {
      const route = e?.routes?.[0];
      if (!route) return;

      // Clear previous markers
      try { decoLayer.clearLayers(); } catch {}

      const distance = Number(route?.summary?.totalDistance ?? 0);
      const duration = Number(route?.summary?.totalTime ?? 0);
      const instructions = Array.isArray(route?.instructions) ? route.instructions : [];
      const steps = instructions.map((inst: any) => ({
        instruction: String(inst.text ?? 'Continue'),
        distance: Number(inst.distance ?? 0),
        duration: Number(inst.time ?? 0),
      }));

      onRouteFound?.(shipmentId, { distance, duration, steps });

      const coords: Array<{ lat: number; lng: number }> = Array.isArray(route?.coordinates)
        ? route.coordinates.map((c: any) => ({ lat: c.lat, lng: c.lng }))
        : [];

      // Way-marker dots
      const markerCount = Math.min(12, Math.max(0, Math.floor(coords.length / 25)));
      if (markerCount > 0) {
        for (let i = 1; i <= markerCount; i += 1) {
          const idx = Math.round((i / (markerCount + 1)) * (coords.length - 1));
          const pt = coords[idx];
          if (!pt) continue;
          L.circleMarker([pt.lat, pt.lng], {
            radius: 3.2,
            color: 'rgba(255,255,255,0.75)',
            weight: 1,
            fillColor: color,
            fillOpacity: 0.25,
          }).addTo(decoLayer);
        }
      }

      // Maneuver marker
      const firstInst = instructions[0];
      const instIndex = Number(firstInst?.index ?? NaN);
      const maneuverPoint = Number.isFinite(instIndex) && coords[instIndex]
        ? coords[instIndex]
        : (truckLocation ? coords.reduce((best, p) => {
            const d = haversineMeters(truckLocation, p);
            return d < best.d ? { p, d } : best;
          }, { p: coords[0], d: Number.POSITIVE_INFINITY }).p : coords[0]);

      if (maneuverPoint) {
        L.circleMarker([maneuverPoint.lat, maneuverPoint.lng], {
          radius: 9,
          color: '#ffffff',
          weight: 2,
          fillColor: '#2f7cff',
          fillOpacity: 0.78,
        }).addTo(decoLayer);
      }
    }).addTo(map);

    routingControlRef.current = routingControl;

    return () => {
      try { map.removeControl(routingControl); } catch {}
      try { decoLayer.remove(); } catch {}
    };
  }, [map, shipmentId, color, onRouteFound]); // Removed start/end/truckLocation to prevent recreation

  // Update waypoints dynamically when start/end changes
  useEffect(() => {
    if (routingControlRef.current) {
      routingControlRef.current.setWaypoints([
        L.latLng(start.lat, start.lng),
        L.latLng(end.lat, end.lng),
      ]);
    }
  }, [start.lat, start.lng, end.lat, end.lng]);

  return null;
};

const MapFocusController = ({ center, shipments }: { center: [number, number], shipments: TrackedShipment[] }) => {
  const map = useMap();

  useEffect(() => {
    if (shipments.length > 0) {
      const bounds = L.latLngBounds([]);
      shipments.forEach(s => {
        bounds.extend([s.origin.lat, s.origin.lng]);
        bounds.extend([s.destination.lat, s.destination.lng]);
      });
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(center, 6);
    }
  }, [map, center, shipments]);

  return null;
};

const FollowController = ({
  center,
  shipments,
  followShipmentId,
  followMode,
  overviewKey,
}: {
  center: [number, number];
  shipments: TrackedShipment[];
  followShipmentId?: string | null;
  followMode?: boolean;
  overviewKey?: number;
}) => {
  const map = useMap();

  useEffect(() => {
    if (followMode && followShipmentId) {
      const target = shipments.find(s => s.id === followShipmentId);
      if (target?.truckLocation) {
        map.setView([target.truckLocation.lat, target.truckLocation.lng], Math.max(map.getZoom(), 13), { animate: true });
        return;
      }
    }

    if (shipments.length > 0) {
      const bounds = L.latLngBounds([]);
      shipments.forEach(s => {
        bounds.extend([s.origin.lat, s.origin.lng]);
        bounds.extend([s.destination.lat, s.destination.lng]);
        if (s.truckLocation) bounds.extend([s.truckLocation.lat, s.truckLocation.lng]);
      });
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(center, 6);
    }
  }, [map, center, shipments, followMode, followShipmentId, overviewKey]);

  return null;
};

export function LiveTrackingMap({
  shipments,
  onSelectShipment,
  onRouteDataUpdate,
  activeShipmentId = null,
  candidates = [],
  followShipmentId = null,
  followMode = false,
  overviewKey = 0,
  onMapReady,
}: LiveTrackingMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  const center = useMemo(() => {
    if (shipments.length === 0) return [12.9716, 77.5946] as [number, number]; // Bengaluru
    
    let latSum = 0;
    let lngSum = 0;
    let count = 0;
    shipments.forEach(s => {
      latSum += s.origin.lat + s.destination.lat;
      lngSum += s.origin.lng + s.destination.lng;
      count += 2;
    });
    
    return [latSum / count, lngSum / count] as [number, number];
  }, [shipments]);

  const activeShipment = useMemo(() => {
    if (!activeShipmentId) return null;
    return shipments.find((s) => s.id === activeShipmentId) ?? null;
  }, [activeShipmentId, shipments]);

  const activeTruckLatLng = useMemo<[number, number] | null>(() => {
    if (!activeShipment) return null;
    const lastKnown = activeShipment.truckLocation ?? activeShipment.trackPath?.[0] ?? null;
    if (!lastKnown) return null;
    return [lastKnown.lat, lastKnown.lng];
  }, [activeShipment]);

  return (
    <div className="w-full h-full relative group">
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom={true}
        zoomControl={false}
        whenCreated={(map) => {
          mapRef.current = map;
          onMapReady?.(map);
        }}
        className="w-full h-full bg-[#1e1e2d] z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <ZoomControl position="bottomright" />

        <FollowController
          center={center}
          shipments={shipments}
          followShipmentId={followShipmentId}
          followMode={followMode}
          overviewKey={overviewKey}
        />

        {shipments.map((shipment, index) => {
          const color = shipment.color || shipmentColors[index % shipmentColors.length];
          const routeOrigin = shipment.routeOrigin ?? shipment.origin;
          const isActive = activeShipmentId ? shipment.id === activeShipmentId : false;
          const recordedAtMs = shipment.truckStatus?.recordedAt ? Date.parse(shipment.truckStatus.recordedAt) : Number.NaN;
          const isConnected = Number.isFinite(recordedAtMs) ? (Date.now() - recordedAtMs) <= 120_000 : false;

          const lastKnown = shipment.truckLocation ?? shipment.trackPath?.[0] ?? null;
          const markerLoc = lastKnown ?? shipment.origin;

          const remainingToDest = markerLoc
            ? haversineMeters(markerLoc, shipment.destination)
            : Number.NaN;
          const driverStatus = resolveDriverStatus(remainingToDest);
          return (
            <React.Fragment key={shipment.id}>
              {isActive && (
                <RoutingControl
                  shipmentId={shipment.id}
                  start={routeOrigin}
                  end={shipment.destination}
                  color={color}
                  truckLocation={markerLoc ?? undefined}
                  onRouteFound={onRouteDataUpdate}
                />
              )}
              
              {/* Origin Marker */}
              <Marker 
                position={[shipment.origin.lat, shipment.origin.lng]} 
                icon={createCircleIcon('white', 10, color)}
                eventHandlers={{ click: () => onSelectShipment?.(shipment.id) }}
              />
              
              {/* Destination Marker */}
              <Marker 
                position={[shipment.destination.lat, shipment.destination.lng]} 
                icon={createCircleIcon(color, 14, 'white')}
                eventHandlers={{ click: () => onSelectShipment?.(shipment.id) }}
              />

              {/* Track Way (polyline of recorded GPS points) */}
              {shipment.trackPath && shipment.trackPath.length > 1 && (
                <Polyline
                  positions={shipment.trackPath.map((p) => [p.lat, p.lng] as [number, number])}
                  pathOptions={{ color, weight: 4, opacity: 0.65 }}
                />
              )}

              {/* Truck Marker: always show (live if connected, pinned at last known if offline) */}
              {markerLoc && (
                <Marker
                  position={[markerLoc.lat, markerLoc.lng]}
                  icon={createTruckIcon(isConnected ? color : 'rgba(148,163,184,0.92)', calculateBearing(markerLoc, shipment.destination), isConnected)}
                  zIndexOffset={1000}
                >
                  {isActive && (
                    <Tooltip direction="top" offset={[0, -18]} opacity={1} sticky>
                      {(() => {
                        const speedKmh = shipment.truckStatus?.speed ?? null;
                        const etaSeconds = speedKmh && speedKmh > 1
                          ? remainingToDest / ((speedKmh * 1000) / 3600)
                          : Number.NaN;
                        const updatedMins = Number.isFinite(recordedAtMs) ? Math.max(0, Math.round((Date.now() - recordedAtMs) / 60000)) : null;

                        return (
                          <div style={{ minWidth: 232 }}>
                            <div style={{ fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>
                              Live Truck Status
                            </div>
                            <div style={{ fontWeight: 900, fontSize: 16, marginTop: 4 }}>
                              {Number.isFinite(recordedAtMs) ? (isConnected ? driverStatus : 'Signal lost') : 'Awaiting GPS'}
                            </div>
                            <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                              <div>
                                <div style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>Speed</div>
                                <div style={{ fontWeight: 800, color: '#fff' }}>{speedKmh ?? '--'} km/h</div>
                              </div>
                              <div>
                                <div style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>Remaining</div>
                                <div style={{ fontWeight: 800, color: '#fff' }}>{formatDistance(remainingToDest)}</div>
                              </div>
                            </div>
                            <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                              ETA: <span style={{ fontWeight: 800, color: '#fff' }}>{formatDuration(etaSeconds)}</span>
                              {shipment.truckStatus?.milestone ? (
                                <span style={{ marginLeft: 10 }}>
                                  Stage:{' '}
                                  <span style={{ fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>
                                    {shipment.truckStatus.milestone.replace(/_/g, ' ')}
                                  </span>
                                </span>
                              ) : null}
                            </div>
                            <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
                              Updated: <span style={{ fontWeight: 800, color: '#fff' }}>{updatedMins === null ? '--' : `${updatedMins} min ago`}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </Tooltip>
                  )}
                </Marker>
              )}
            </React.Fragment>
          );
        })}

        {candidates.map((candidate) => (
          <Marker 
            key={candidate.id} 
            position={[candidate.location.lat, candidate.location.lng]} 
            icon={createCircleIcon('#f59e0b', 12, 'white')}
          />
        ))}
      </MapContainer>

      {/* Map Overlays */}
      <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-3 pointer-events-none">
        <div className="glass-panel bg-bg-base/80 border-white/10 px-4 py-2 flex items-center gap-3 shadow-2xl backdrop-blur-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">
            {shipments.length} Active Nodes Monitored
          </span>
        </div>
      </div>

      {/* Locate Truck Button */}
      <div className="absolute bottom-6 left-6 z-[1000] pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            if (!mapRef.current) return;
            if (!activeTruckLatLng) return;
            mapRef.current.setView(activeTruckLatLng, Math.max(mapRef.current.getZoom(), 14), { animate: true });
          }}
          disabled={!activeTruckLatLng}
          className="w-12 h-12 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl backdrop-blur-xl flex items-center justify-center text-[var(--text)] hover:border-[var(--border-strong)] disabled:opacity-40 disabled:cursor-not-allowed transition"
          title="Locate truck"
          aria-label="Locate truck"
        >
          <LucideTruck size={18} />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }
        .leaflet-control-attribution { 
          background: rgba(0,0,0,0.5) !important; 
          color: #9ca3af !important; 
          font-size: 8px !important;
          text-transform: uppercase;
        }
        .leaflet-control-attribution a { color: #6366f1 !important; }
        .leaflet-tooltip {
          background: rgba(18, 18, 18, 0.94) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          color: white !important;
          box-shadow: 0 18px 40px rgba(0,0,0,0.5) !important;
          padding: 10px 12px !important;
          border-radius: 14px !important;
          backdrop-filter: blur(14px);
        }
        .leaflet-tooltip:before { display: none !important; }

        /* Truck marker styles (webpage-map inspired) */
        .truck-marker-wrapper { background: transparent !important; border: none !important; }
        .truck-marker-wrapper .driver-marker { width: 60px; height: 60px; display: grid; place-items: center; position: relative; }
        .truck-marker-wrapper .truck-pin {
          width: 54px; height: 54px; border-radius: 999px;
          display: grid; place-items: center;
          border: 2px solid rgba(219, 234, 254, 0.92);
          box-shadow: 0 20px 34px rgba(27, 86, 255, 0.34);
          transition: transform 0.9s linear, filter 200ms ease;
        }
        .truck-marker-wrapper .truck-pin svg { width: 24px; height: 24px; }
        .truck-marker-wrapper .marker-pulse {
          position: absolute;
          width: 58px;
          height: 58px;
          border-radius: 999px;
          opacity: 0.22;
          filter: blur(1px);
          animation: ll_pulse 1.8s ease-out infinite;
        }
        @keyframes ll_pulse {
          0% { transform: scale(0.65); opacity: 0.28; }
          80% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        .truck-marker-wrapper.is-offline .marker-pulse { display: none; }
        .truck-marker-wrapper.is-offline .truck-pin {
          border-color: rgba(148, 163, 184, 0.75);
          box-shadow: 0 18px 30px rgba(2, 6, 23, 0.55);
          filter: grayscale(0.2) saturate(0.7);
        }
      `}} />
    </div>
  );
}
