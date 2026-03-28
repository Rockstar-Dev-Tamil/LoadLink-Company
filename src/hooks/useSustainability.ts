import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Sustainability } from '@/types/app.types'

export function useSustainability() {
  const { user } = useAuthStore()
  const [data, setData]       = useState<Sustainability[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const mountedRef              = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchData = useCallback(async () => {
    if (!user?.id) return
    if (!data.length) setLoading(true)
    setError(null)

    const { data: result, error: err } = await supabase
      .from('sustainability')
      .select(`*`)
      .order('created_at', { ascending: false })

    if (!mountedRef.current) return
    if (err) { setError(err.message); setLoading(false); return }

    setData((result as unknown as Sustainability[]) ?? [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!user?.id) return
    const ch = supabase
      .channel(`rt_sustainability_${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'sustainability'
      }, (payload) => {
        if (!mountedRef.current) return
        setData(prev => {
          switch (payload.eventType) {
            case 'INSERT':
              if (prev.some(item => item.id === payload.new.id)) return prev
              return [payload.new as Sustainability, ...prev]
            case 'UPDATE':
              return prev.map(item => item.id === payload.new.id ? { ...item, ...payload.new } : item)
            case 'DELETE':
              return prev.filter(item => item.id !== payload.old.id)
            default:
              return prev
          }
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user?.id])

  // Aggregate stats for Insights and Dashboard components
  const stats = useMemo(() => {
    return data.reduce((acc, curr) => ({
      co2_reduction_kg:   acc.co2_reduction_kg + (curr.co2_reduction_kg || 0),
      fuel_saved_liters:  acc.fuel_saved_liters + (curr.fuel_saved_liters || 0),
      distance_saved_km:  acc.distance_saved_km + (curr.distance_saved_km || 0),
      trips_consolidated: acc.trips_consolidated + (curr.trips_consolidated || 0),
    }), {
      co2_reduction_kg: 0,
      fuel_saved_liters: 0,
      distance_saved_km: 0,
      trips_consolidated: 0,
    })
  }, [data])

  return { data, stats, loading, error, refetch: fetchData }
}
