import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tracking } from '@/types/app.types'

// Geography point parser — handles WKT and GeoJSON
export const parseGeoPoint = (loc: unknown): [number, number] => {
  if (!loc) return [20.5937, 78.9629]
  if (typeof loc === 'string') {
    const m = loc.match(/POINT\(([^ ]+) ([^ ]+)\)/)
    if (m) return [parseFloat(m[2]), parseFloat(m[1])]
  }
  if (typeof loc === 'object' && loc !== null) {
    const g = loc as { coordinates?: [number, number] }
    if (g.coordinates?.length === 2)
      return [g.coordinates[1], g.coordinates[0]]
  }
  return [20.5937, 78.9629]
}

export function useTracking(bookingIds: string | string[] | null | undefined) {
  const [history, setHistory]     = useState<Tracking[]>([])
  const [loading, setLoading]     = useState(true)
  const mountedRef                = useRef(true)
  
  const ids = useMemo(() => {
    if (!bookingIds) return []
    return Array.isArray(bookingIds) ? bookingIds : [bookingIds]
  }, [bookingIds])

  const idsKey = ids.sort().join(',')

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!ids.length) { 
      setLoading(false)
      setHistory([])
      return 
    }

    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('tracking')
        .select('id, booking_id, location, speed, recorded_at')
        .in('booking_id', ids)
        .order('recorded_at', { ascending: false })

      if (!mountedRef.current) return
      setHistory((data as unknown as Tracking[]) ?? [])
      setLoading(false)
    }
    fetch()
  }, [idsKey])

  useEffect(() => {
    if (!ids.length) return
    const idSet = new Set(ids)

    const ch = supabase
      .channel(`rt_tracking_${idsKey}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'tracking'
      }, ({ new: n }) => {
        if (!mountedRef.current) return
        const t = n as unknown as Tracking
        if (!idSet.has(t.booking_id)) return
        setHistory(prev => [t, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [idsKey])

  // Computed values for convenience
  const latest = history[0] || null
  const location = latest?.location || null
  
  // Map for dashboard multi-truck support
  const locations = useMemo(() => {
    const m = new Map<string, Tracking>()
    history.forEach(t => {
      if (!m.has(t.booking_id)) m.set(t.booking_id, t)
    })
    return m
  }, [history])

  return { 
    history, 
    latest, 
    location, 
    locations, 
    loading, 
    parseGeoPoint 
  }
}
