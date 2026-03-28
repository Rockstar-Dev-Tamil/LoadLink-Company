import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tracking, Match } from '@/types/app.types'
import type { PostgisPoint } from '@/types/database.types'

export interface MatchedVehicle {
  truckId: string
  matchScore: number
  location: { lat: number; lng: number } | null
  registrationNumber: string | null
  driverId: string
  status: string
}

export function useMatchedVehicles(shipmentId: string | null) {
  const [vehicles, setVehicles] = useState<MatchedVehicle[]>([])
  const [loading, setLoading]   = useState(false)
  const mountedRef              = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchMatchedVehicles = useCallback(async () => {
    if (!shipmentId) return
    setLoading(true)

    try {
      // 1. Fetch matches with explicit hints
      const { data: matches, error: matchError } = await supabase
        .from('matches')
        .select(`
          match_score, status,
          route:routes!inner (
            truck:trucks!inner (id, vehicle_number, driver_id)
          )
        `)
        .eq('shipment_id', shipmentId)

      if (matchError) throw matchError
      if (!mountedRef.current) return

      if (!matches?.length) {
        setVehicles([])
        return
      }

      const truckIds = matches.map(m => (m.route as any).truck.id)

      // 2. Fetch latest tracking for these trucks
      const { data: rawTracking, error: trackingError } = await supabase
        .from('tracking')
        .select(`
          location, recorded_at,
          booking:bookings!inner (
            id, status,
            route:routes!inner (
              id, truck_id
            )
          )
        `)
        .in('booking.route.truck_id', truckIds)
        .order('recorded_at', { ascending: false })

      if (trackingError) throw trackingError
      if (!mountedRef.current) return

      // 3. Map it all together
      const mapped: MatchedVehicle[] = (matches as any[]).map(m => {
        const truck = m.route.truck
        const truckId = truck.id
        const latest = rawTracking?.find(t => (t as any).booking.route.truck_id === truckId)
        
        let loc = null
        if (latest?.location) {
          const pt = latest.location as unknown as PostgisPoint
          loc = { lat: pt.coordinates[1], lng: pt.coordinates[0] }
        }

        return {
          truckId,
          matchScore: Number(m.match_score),
          location: loc,
          registrationNumber: truck.vehicle_number,
          driverId: truck.driver_id,
          status: m.status || 'suggested'
        }
      })

      setVehicles(mapped)
    } catch (err) {
      console.error('Error fetching matched vehicles:', err)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [shipmentId])

  useEffect(() => { fetchMatchedVehicles() }, [fetchMatchedVehicles])

  useEffect(() => {
    if (!shipmentId) return
    const ch = supabase
      .channel(`rt_matched_vehicles_${shipmentId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'matches',
        filter: `shipment_id=eq.${shipmentId}`
      }, () => {
        fetchMatchedVehicles()
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [shipmentId, fetchMatchedVehicles])

  return { vehicles, loading, refresh: fetchMatchedVehicles }
}
