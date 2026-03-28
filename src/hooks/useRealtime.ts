import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

type TableName = 'shipments'|'matches'|'bookings'|'payments'|'tracking'|'reviews'|'sustainability'

export function useRealtimeTable<T extends Record<string, unknown>>(
  table: TableName,
  filter: string | null,
  callbacks: {
    onInsert?: (row: T) => void
    onUpdate?: (row: T) => void
    onDelete?: (row: Partial<T>) => void
  }
) {
  const callbackRef = useRef(callbacks);
  useEffect(() => {
    callbackRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    const channel = supabase
      .channel(`rt:${table}:${filter ?? 'global'}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table, filter: filter ?? undefined },
        (payload) => {
          if (payload.eventType === 'INSERT') callbackRef.current.onInsert?.(payload.new as T)
          if (payload.eventType === 'UPDATE') callbackRef.current.onUpdate?.(payload.new as T)
          if (payload.eventType === 'DELETE') callbackRef.current.onDelete?.(payload.old as Partial<T>)
        }
      ).subscribe()
    return () => { 
      supabase.removeChannel(channel) 
    }
  }, [table, filter])
}
