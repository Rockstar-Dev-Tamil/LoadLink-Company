import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Message } from '@/types/app.types'

export function useMessages(shipmentId: string | null) {
  const { user }              = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading]   = useState(true)
  const [unread, setUnread]     = useState(0)
  const mountedRef              = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Fetch messages for this shipment
  useEffect(() => {
    if (!user?.id || !shipmentId) { setLoading(false); return }
    setLoading(true)

    const fetch = async () => {
      const { data } = await supabase
        .from('messages')
        .select(`
          id, shipment_id, content, type, metadata,
          is_read, created_at, sender_id, receiver_id,
          sender:profiles!sender_id(id, name),
          receiver:profiles!receiver_id(id, name)
        `)
        .eq('shipment_id', shipmentId)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true })

      if (!mountedRef.current) return
      setMessages((data as unknown as Message[]) ?? [])
      setUnread(data?.filter(m => m.receiver_id === user.id && !m.is_read).length ?? 0)
      setLoading(false)
    }
    fetch()

    // Mark messages as read when this chat is open
    supabase
      .from('messages')
      .update({ is_read: true })
      .eq('shipment_id', shipmentId)
      .eq('receiver_id', user.id)
      .eq('is_read', false)
      .then(() => { if (mountedRef.current) setUnread(0) })

    // Realtime: new messages
    const ch = supabase
      .channel(`rt_messages_${shipmentId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `shipment_id=eq.${shipmentId}`
      }, ({ new: n }) => {
        if (!mountedRef.current) return
        const msg = n as unknown as Message
        if (msg.sender_id !== user.id && msg.receiver_id !== user.id) return
        
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        
        // Auto-mark as read if receiver is viewing
        if (msg.receiver_id === user.id) {
          supabase.from('messages').update({ is_read: true }).eq('id', msg.id)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [user?.id, shipmentId])

  const sendMessage = useCallback(async (
    receiverId: string,
    content: string,
    type: string = 'text',
    metadata: Record<string, unknown> = {}
  ) => {
    if (!user?.id || !shipmentId || !content.trim()) return
    const { error } = await supabase.from('messages').insert({
      shipment_id:  shipmentId,
      sender_id:    user.id,
      receiver_id:  receiverId,
      content:      content.trim(),
      type,
      metadata:     metadata as any,
      is_read:      false,
    })
    if (error) throw error
  }, [user?.id, shipmentId])

  return { messages, loading, unread, sendMessage }
}

// Global unread count across ALL shipments
export function useTotalUnread() {
  const { user }          = useAuthStore()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user?.id) return

    // Initial count
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false)
      .then(({ count: c }) => setCount(c ?? 0))

    // Realtime: increment/recount
    const ch = supabase
      .channel(`rt_unread_${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      }, () => {
         supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false)
          .then(({ count: c }) => setCount(c ?? 0))
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [user?.id])

  return count
}
