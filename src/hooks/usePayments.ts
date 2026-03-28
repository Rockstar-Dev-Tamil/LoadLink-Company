import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { PaymentWithRelations } from '@/types/app.types'

export function usePayments() {
  const { user, initialized } = useAuthStore()
  const [payments, setPayments] = useState<PaymentWithRelations[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [filter, setFilter]     = useState({
    status: 'all',
    dateRange: 'all'
  })
  
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchPayments = useCallback(async () => {
    if (!initialized) return
    if (!user?.id) {
      setPayments([])
      setError(null)
      setLoading(false)
      return
    }
    if (!payments.length) setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('payments')
      .select(`
        *,
        booking:bookings!inner (
          id,
          business_id,
          shipment:shipments!inner (
            pickup_address,
            drop_address
          )
        )
      `)
      .eq('booking.business_id', user.id)
      .order('created_at', { ascending: false })

    if (!mountedRef.current) return
    if (err) { setError(err.message); setLoading(false); return }

    setPayments((data as unknown as PaymentWithRelations[]) ?? [])
    setLoading(false)
  }, [initialized, user?.id])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  // Realtime subscription
  useEffect(() => {
    if (!initialized || !user?.id) return

    const channel = supabase
      .channel(`rt_payments_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments'
      }, (payload) => {
        if (!mountedRef.current) return
        
        // Since payments are joined with bookings/shipments, 
        // a simple local update might be missing those joined fields.
        // It's safer to refetch or we can try to find the item in local state
        // and only update the payment fields, but if it's an INSERT we definitely need to refetch
        // to get the joined data.
        if (payload.eventType === 'INSERT') {
          fetchPayments()
        } else {
          setPayments(prev => {
            switch (payload.eventType) {
              case 'UPDATE':
                return prev.map(item =>
                  item.id === payload.new.id
                    ? { ...item, ...payload.new }
                    : item
                )
              case 'DELETE':
                return prev.filter(item => item.id !== payload.old.id)
              default:
                return prev
            }
          })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [initialized, user?.id, fetchPayments])

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchStatus = filter.status === 'all' || p.payment_status === filter.status;
      let matchDate = true;
      if (filter.dateRange !== 'all') {
        const pDate = new Date(p.created_at);
        const now = new Date();
        const diffDays = (now.getTime() - pDate.getTime()) / (1000 * 3600 * 24);
        if (filter.dateRange === '7d') matchDate = diffDays <= 7;
        else if (filter.dateRange === '30d') matchDate = diffDays <= 30;
        else if (filter.dateRange === '90d') matchDate = diffDays <= 90;
      }
      return matchStatus && matchDate;
    });
  }, [payments, filter]);

  const stats = useMemo(() => {
    const paid = payments.filter(p => p.payment_status === 'paid');
    const pending = payments.filter(p => p.payment_status === 'pending');

    return {
      totalRevenue: paid.reduce((acc, p) => acc + p.amount, 0),
      pendingPayments: pending.reduce((acc, p) => acc + p.amount, 0),
      completedPayments: paid.length,
      failedCount: payments.filter(p => p.payment_status === 'failed').length
    };
  }, [payments]);

  return { 
    payments: filteredPayments, 
    stats,
    loading, 
    error, 
    filter,
    setFilter,
    refetch: fetchPayments 
  }
}
