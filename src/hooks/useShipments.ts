import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Shipment, Match, Booking } from '@/types/app.types'
import type { PostgisPoint } from '@/types/database.types'

export function useShipments() {
  const { user, initialized } = useAuthStore()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const mountedRef                = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchShipments = useCallback(async () => {
    if (!initialized) return
    if (!user?.id) { 
      setShipments([])
      setLoading(false)
      setError(null)
      return
    }
    if (!shipments.length) setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('shipments')
      .select(`
        id, business_id, pickup_address, drop_address,
        pickup_location, drop_location,
        weight_kg, price, is_partial, status, created_at,
        matches(
          id, route_id, match_score, detour_km, status, created_at,
          route:routes(
            id, origin, destination, departure_time, expected_arrival,
            available_capacity_kg, is_return_trip, status,
            truck:trucks(
              id, vehicle_number, vehicle_type, capacity_kg, ulip_verified,
              driver_id
            )
          )
        ),
        bookings(
          id, agreed_price, status, driver_id, route_id, created_at,
          current_milestone, loading_proof_url, delivery_proof_url, milestone_history,
          loading_proof_status, loading_proof_uploaded_at, loading_proof_verified_at, loading_proof_verified_by, loading_proof_review_note,
          delivery_proof_status, delivery_proof_uploaded_at, delivery_proof_verified_at, delivery_proof_verified_by, delivery_proof_review_note,
          driver:profiles!driver_id(id, name, email),
          payments(id, amount, payment_status, payment_method, created_at),
          biltys(id, consignee_name, weight_kg, total_price, document_url, created_at)
        )
      `)
      .eq('business_id', user.id)
      .order('created_at', { ascending: false })

    if (!mountedRef.current) return
    if (err) { setError(err.message); setLoading(false); return }

    setShipments((data as unknown as Shipment[]) ?? [])
    setLoading(false)
  }, [initialized, user?.id])

  useEffect(() => { fetchShipments() }, [fetchShipments])

  // Realtime: shipment row changes
  useEffect(() => {
    if (!initialized || !user?.id) return
    const ch = supabase
      .channel(`rt_shipments_${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'shipments',
        filter: `business_id=eq.${user.id}`
      }, ({ eventType, new: n, old: o }) => {
        if (!mountedRef.current) return
        setShipments(prev => {
          if (eventType === 'INSERT') {
            if (prev.some(s => s.id === (n as Shipment).id)) return prev
            return [n as Shipment, ...prev]
          }
          if (eventType === 'UPDATE')
            return prev.map(s => s.id === (n as Shipment).id ? { ...s, ...n } : s)
          if (eventType === 'DELETE')
            return prev.filter(s => s.id !== (o as Shipment).id)
          return prev
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user?.id])

  // Realtime: matches for my shipments (client-side filter)
  useEffect(() => {
    if (!initialized || !user?.id || !shipments.length) return
    const myIds = new Set(shipments.map(s => s.id))

    const ch = supabase
      .channel(`rt_matches_${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'matches'
      }, ({ eventType, new: n, old: o }) => {
        if (!mountedRef.current) return
        const row = (n ?? o) as Match
        if (!myIds.has(row.shipment_id)) return

        setShipments(prev => prev.map(s => {
          if (s.id !== row.shipment_id) return s
          const matches = s.matches ?? []
          if (eventType === 'INSERT') {
            if (matches.some(m => m.id === row.id)) return s
            return { ...s, matches: [row, ...matches] }
          }
          if (eventType === 'UPDATE')
            return { ...s, matches: matches.map(m => m.id === row.id ? { ...m, ...row } : m) }
          if (eventType === 'DELETE')
            return { ...s, matches: matches.filter(m => m.id !== row.id) }
          return s
        }))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user?.id, shipments.length])

  // Realtime: booking updates
  useEffect(() => {
    if (!initialized || !user?.id) return
    const ch = supabase
      .channel(`rt_bookings_${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'bookings',
        filter: `business_id=eq.${user.id}`
      }, ({ new: n }) => {
        if (!mountedRef.current) return
        const row = n as Booking
        setShipments(prev => prev.map(s => ({
          ...s,
          bookings: s.bookings?.map(b => b.id === row.id ? { ...b, ...row } : b)
        })))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user?.id])

  const createShipment = useCallback(async (input: {
    pickup_address: string
    drop_address: string
    pickup_location: { lat: number; lng: number }
    drop_location:   { lat: number; lng: number }
    weight_kg: number
    price: number
    is_partial: boolean
  }) => {
    if (!user?.id) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('shipments')
      .insert({
        business_id:     user.id,
        status:          'pending',
        pickup_address:  input.pickup_address,
        drop_address:    input.drop_address,
        pickup_location: { type: 'Point', coordinates: [input.pickup_location.lng, input.pickup_location.lat] } as PostgisPoint,
        drop_location:   { type: 'Point', coordinates: [input.drop_location.lng, input.drop_location.lat] } as PostgisPoint,
        weight_kg:       input.weight_kg,
        price:           input.price,
        is_partial:      input.is_partial,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }, [user?.id])

  const acceptMatch = useCallback(async (match: Match, shipment: Shipment) => {
    if (!user?.id) throw new Error('Not authenticated')
    
    const driverId = match.route?.truck?.driver_id;
    if (!driverId) throw new Error('Invalid match data: driver not found');

    const [bookingRes] = await Promise.all([
      supabase.from('bookings').insert({
        shipment_id:  shipment.id,
        driver_id:    driverId,
        business_id:  user.id,
        route_id:     match.route_id,
        agreed_price: shipment.price,
        status:       'requested'
      }).select().single(),
    ])
    if (bookingRes.error) throw bookingRes.error

    await Promise.all([
      supabase.from('matches').update({ status: 'accepted' }).eq('id', match.id),
      supabase.from('shipments').update({ status: 'matched' }).eq('id', shipment.id),
    ])
    return bookingRes.data
  }, [user?.id])

  const rejectMatch = useCallback(async (matchId: string) => {
    const { error } = await supabase
      .from('matches').update({ status: 'rejected' }).eq('id', matchId)
    if (error) throw error
  }, [])

  return {
    shipments,
    loading,
    error,
    refetch: fetchShipments,
    createShipment,
    acceptMatch,
    rejectMatch,
  }
}
