import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Truck, MapPin, Play, Square, RefreshCcw, Navigation } from 'lucide-react';
import { toast } from 'sonner';

export default function Simulator() {
  const [deviceId, setDeviceId] = useState('driver_001');
  const [lat, setLat] = useState(12.9716);
  const [lng, setLng] = useState(77.5946);
  const [isDriving, setIsDriving] = useState(false);
  const driveIntervalRef = useRef<number | null>(null);

  const updateLocation = async (newLat: number, newLng: number) => {
    try {
      const { error } = await supabase
        .from('user_locations')
        .upsert({
          device_id: deviceId,
          latitude: newLat,
          longitude: newLng,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'device_id' });

      if (error) throw error;
      setLat(newLat);
      setLng(newLng);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const simulateRoute = async () => {
    setIsDriving(true);
    const points = [
      { lat: 12.971, lng: 77.591 },
      { lat: 12.972, lng: 77.592 },
      { lat: 12.973, lng: 77.593 },
      { lat: 12.975, lng: 77.595 },
      { lat: 12.978, lng: 77.598 },
      { lat: 12.980, lng: 77.600 },
    ];

    for (const p of points) {
      if (!mountedRef.current) break;
      await updateLocation(p.lat, p.lng);
      await new Promise(r => setTimeout(r, 2000));
    }
    setIsDriving(false);
  };

  const startDriving = () => {
    setIsDriving(true);
    let currentLat = lat;
    let currentLng = lng;
    
    driveIntervalRef.current = window.setInterval(() => {
      currentLat += 0.0002;
      currentLng += 0.0002;
      updateLocation(currentLat, currentLng);
    }, 1000);
  };

  const stopDriving = () => {
    setIsDriving(false);
    if (driveIntervalRef.current) {
      clearInterval(driveIntervalRef.current);
      driveIntervalRef.current = null;
    }
  };

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { 
      mountedRef.current = false;
      stopDriving();
    };
  }, []);

  return (
    <div className="flex flex-col h-full p-8 space-y-8 max-w-2xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight">GPS Simulator</h1>
        <p className="text-[var(--muted)] font-medium">Use this to test the "Live Tracking" map without a driver device.</p>
      </div>

      <div className="card space-y-6">
        <div className="space-y-4">
          <label className="section-label">Device Settings</label>
          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <span className="text-[10px] font-black uppercase text-[var(--muted)]">Device ID</span>
              <input 
                className="text-field" 
                value={deviceId} 
                onChange={e => setDeviceId(e.target.value)}
                placeholder="e.g. demo_unit"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-[var(--muted)]">Latitude</span>
            <input 
              className="text-field" 
              type="number"
              step="0.0001"
              value={lat} 
              onChange={e => setLat(parseFloat(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-[var(--muted)]">Longitude</span>
            <input 
              className="text-field" 
              type="number"
              step="0.0001"
              value={lng} 
              onChange={e => setLng(parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            className="primary-button flex-1"
            onClick={() => updateLocation(lat, lng)}
          >
            <RefreshCcw size={16} /> Broadcast Once
          </button>
          
          <button 
            className="secondary-button flex-1 !bg-indigo-600 hover:!bg-indigo-700 text-white"
            onClick={simulateRoute}
            disabled={isDriving}
          >
            <Play size={16} /> Simulate Route
          </button>
          
          {!isDriving ? (
            <button 
              className="secondary-button flex-1"
              onClick={startDriving}
            >
              <Navigation size={16} /> Start Drift
            </button>
          ) : (
            <button 
              className="ghost-button flex-1 !text-rose-500 !border-rose-500/20"
              onClick={stopDriving}
            >
              <Square size={16} /> Stop
            </button>
          )
        }
        </div>
      </div>

      <div className="message-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white">
            <Navigation size={20} />
          </div>
          <div>
            <div className="section-label">How to use</div>
            <div className="text-sm font-black">Live Verification Pro</div>
          </div>
        </div>
        <ul className="space-y-2 text-[11px] font-bold text-[var(--muted)] list-disc pl-4">
          <li>Ensure a booking exists where the <code className="text-[var(--accent)]">driver_id</code> matches your <code className="text-[var(--accent)]">device_id</code>.</li>
          <li>Open the <strong>Tracking</strong> page in another tab.</li>
          <li>Click "Start Auto-Drive" here.</li>
          <li>Watch the truck marker move and the blue line shrink in real-time.</li>
        </ul>
      </div>
    </div>
  );
}
