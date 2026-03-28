import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Booking } from '@/types/app.types'

export function useBookings() {
  const { user, initialized } = useAuthStore()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const mountedRef              = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchBookings = useCallback(async () => {
    if (!initialized) return
    if (!user?.id) {
      setBookings([])
      setError(null)
      setLoading(false)
      return
    }
    if (!bookings.length) setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('bookings')
      .select(`
        *,
        driver:profiles!driver_id(id, name, email),
        payments(*)
      `)
      .eq('business_id', user.id)
      .order('created_at', { ascending: false })

    if (!mountedRef.current) return
    if (err) { setError(err.message); setLoading(false); return }

    setBookings((data as unknown as Booking[]) ?? [])
    setLoading(false)
  }, [initialized, user?.id])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  useEffect(() => {
    if (!initialized || !user?.id) return
    const ch = supabase
      .channel(`rt_bookings_full_${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bookings',
        filter: `business_id=eq.${user.id}`
      }, (payload) => {
        if (!mountedRef.current) return
        setBookings(prev => {
          switch (payload.eventType) {
            case 'INSERT':
              if (prev.some(b => b.id === payload.new.id)) return prev
              return [payload.new as Booking, ...prev]
            case 'UPDATE':
              return prev.map(b => b.id === payload.new.id ? { ...b, ...payload.new } : b)
            case 'DELETE':
              return prev.filter(b => b.id !== payload.old.id)
            default:
              return prev
          }
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [initialized, user?.id])

  return { bookings, loading, error, refetch: fetchBookings }
}
