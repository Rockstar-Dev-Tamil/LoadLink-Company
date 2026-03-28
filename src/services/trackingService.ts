import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';

type TrackingRow = Database['public']['Tables']['tracking']['Row'];

export interface TrackingUpdate {
  booking_id: string;
  current_lat: number;
  current_lng: number;
  speed: number;
  status: string;
}

export const trackingService = {
  subscribe(bookingId: string, callback: (update: TrackingUpdate) => void) {
    // Initial fetch for the latest position
    supabase
      .from('tracking')
      .select('*')
      .eq('booking_id', bookingId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          const loc = data.location;
          callback({
            booking_id: data.booking_id,
            current_lat: loc?.coordinates[1] || 19.0760,
            current_lng: loc?.coordinates[0] || 72.8777,
            speed: data.speed || 0,
            status: 'In Transit'
          });
        }
      });

    // Subscribe to new tracking points
    const channel = supabase
      .channel(`tracking:${bookingId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'tracking', filter: `booking_id=eq.${bookingId}` }, 
        (payload) => {
          const newPoint = payload.new as TrackingRow;
          const loc = newPoint.location;
          callback({
            booking_id: newPoint.booking_id,
            current_lat: loc?.coordinates[1],
            current_lng: loc?.coordinates[0],
            speed: newPoint.speed || 0,
            status: 'In Transit'
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
