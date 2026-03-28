import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

type NotificationType = 'message' | 'booking' | 'payment';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  href: string;
  unread: boolean;
};

const formatRelative = (value: string) => {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 'now';
  const diffMinutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (diffMinutes < 1) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

export function useNotifications() {
  const { user, initialized } = useAuthStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!initialized) return;
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [messagesRes, bookingsRes, paymentsRes] = await Promise.all([
      supabase
        .from('messages')
        .select('id, shipment_id, content, is_read, created_at, receiver_id')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('bookings')
        .select('id, shipment_id, status, current_milestone, created_at')
        .eq('business_id', user.id)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('payments')
        .select('id, amount, payment_status, created_at, booking:bookings!inner(id, business_id)')
        .eq('booking.business_id', user.id)
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    if (!mountedRef.current) return;

    const next: AppNotification[] = [];

    (messagesRes.data ?? []).forEach((message) => {
      if (!message.shipment_id) return;
      next.push({
        id: `message-${message.id}`,
        type: 'message',
        title: 'New shipment message',
        body: message.content || 'A partner sent an update on your shipment.',
        createdAt: message.created_at,
        href: `/messages?shipmentId=${message.shipment_id}`,
        unread: !message.is_read,
      });
    });

    (bookingsRes.data ?? []).forEach((booking: any) => {
      next.push({
        id: `booking-${booking.id}`,
        type: 'booking',
        title: 'Booking updated',
        body: booking.current_milestone
          ? `Milestone moved to ${String(booking.current_milestone).replace(/_/g, ' ')}.`
          : `Booking status is now ${booking.status ?? 'updated'}.`,
        createdAt: booking.created_at,
        href: `/tracking?shipment=${booking.shipment_id}`,
        unread: booking.status !== 'completed',
      });
    });

    (paymentsRes.data ?? []).forEach((payment: any) => {
      next.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        title: payment.payment_status === 'paid' ? 'Payment settled' : 'Payment requires action',
        body: `${payment.payment_status === 'paid' ? 'Settlement received' : 'Status'} for ₹${Number(payment.amount || 0).toLocaleString()}.`,
        createdAt: payment.created_at,
        href: '/payments',
        unread: payment.payment_status === 'pending' || payment.payment_status === 'failed',
      });
    });

    next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setNotifications(next.slice(0, 12));
    setLoading(false);
  }, [initialized, user?.id]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!initialized || !user?.id) return;

    const messagesChannel = supabase
      .channel(`rt_notifications_messages_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, () => void fetchNotifications())
      .subscribe();

    const bookingsChannel = supabase
      .channel(`rt_notifications_bookings_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `business_id=eq.${user.id}`,
      }, () => void fetchNotifications())
      .subscribe();

    const paymentsChannel = supabase
      .channel(`rt_notifications_payments_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments',
      }, () => void fetchNotifications())
      .subscribe();

    return () => {
      void supabase.removeChannel(messagesChannel);
      void supabase.removeChannel(bookingsChannel);
      void supabase.removeChannel(paymentsChannel);
    };
  }, [initialized, user?.id, fetchNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => notification.unread).length,
    [notifications],
  );

  return {
    notifications,
    unreadCount,
    loading,
    refetch: fetchNotifications,
    formatRelative,
  };
}
