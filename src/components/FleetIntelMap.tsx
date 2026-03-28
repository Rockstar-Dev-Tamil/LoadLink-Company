import React, { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Location = { lat: number; lng: number };

export type FleetMapShipment = {
  id: string;
  origin: Location;
  destination: Location;
  driverId?: string | null;
};

type Props = {
  shipments: FleetMapShipment[];
  liveByDriverId: Record<string, { lat: number; lng: number; updated_at: string }>;
};

const COLORS = ['#467fe3', '#44c48d', '#f0bd66', '#ef747b', '#8b5cf6', '#06b6d4'];

const createCircleIcon = (color: string, size: number, border: string) =>
  L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid ${border};box-shadow:0 0 10px ${color}55;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const createTruckIcon = (color: string, connected: boolean) =>
  L.divIcon({
    className: `truck-marker-wrapper${connected ? '' : ' is-offline'}`,
    html: `
      <div style="width:46px;height:46px;border-radius:999px;display:grid;place-items:center;background:${connected ? color : 'rgba(148,163,184,0.9)'};border:2px solid rgba(255,255,255,0.85);box-shadow:0 18px 34px rgba(0,0,0,0.35);">
        <svg viewBox="0 0 24 24" fill="white" style="width:22px;height:22px;opacity:${connected ? 1 : 0.75}">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5zm-14 10.5c-.83 0-1.5-.67-1.5-1.5S5.17 15.5 6 15.5s1.5.67 1.5 1.5S6.83 18.5 6 18.5zm9-9h3.5l1.96 2.5H15V9.5zm2 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"></path>
        </svg>
      </div>
    `,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
  });

function FitAll({ points }: { points: Location[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [44, 44] });
  }, [map, points]);
  return null;
}

export function FleetIntelMap({ shipments, liveByDriverId }: Props) {
  const points = useMemo(() => {
    const out: Location[] = [];
    shipments.forEach((s) => {
      out.push(s.origin, s.destination);
      if (s.driverId) {
        const live = liveByDriverId[s.driverId];
        if (live) out.push({ lat: live.lat, lng: live.lng });
      }
    });
    return out;
  }, [shipments, liveByDriverId]);

  const center = points[0] ? [points[0].lat, points[0].lng] as [number, number] : [20.5937, 78.9629] as [number, number];

  return (
    <MapContainer
      center={center}
      zoom={5}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      attributionControl
    >
      <ZoomControl position="bottomright" />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {points.length > 0 && <FitAll points={points} />}

      {shipments.map((s, idx) => {
        const color = COLORS[idx % COLORS.length];
        const driverId = s.driverId ?? null;
        const live = driverId ? liveByDriverId[driverId] : null;
        const updatedAtMs = live?.updated_at ? Date.parse(live.updated_at) : Number.NaN;
        const connected = Number.isFinite(updatedAtMs) ? (Date.now() - updatedAtMs) <= 120_000 : false;

        const truckPoint = live ? { lat: live.lat, lng: live.lng } : null;

        return (
          <React.Fragment key={s.id}>
            <Polyline
              positions={[
                [s.origin.lat, s.origin.lng],
                [s.destination.lat, s.destination.lng],
              ]}
              pathOptions={{ color, weight: 3, opacity: 0.55 }}
            />

            <Marker position={[s.origin.lat, s.origin.lng]} icon={createCircleIcon(color, 12, 'white')} />
            <Marker position={[s.destination.lat, s.destination.lng]} icon={createCircleIcon('#10b981', 12, 'white')} />

            {truckPoint && (
              <Marker
                position={[truckPoint.lat, truckPoint.lng]}
                icon={createTruckIcon(color, connected)}
                zIndexOffset={1000}
              />
            )}
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
}

