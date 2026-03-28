import { supabase } from '../lib/supabase';

export const paymentService = {
  async createPayment(data: {
    booking_id: string;
    amount: number;
    payment_status?: 'pending' | 'paid' | 'failed';
    payment_method?: string;
    transaction_id?: string | null;
  }) {
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        booking_id: data.booking_id,
        amount: data.amount,
        payment_status: data.payment_status ?? 'pending',
        payment_method: data.payment_method ?? 'bank_transfer',
        transaction_id: data.transaction_id ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return payment;
  },

  async updatePaymentStatus(paymentId: string, status: 'pending' | 'paid' | 'failed') {
    const { data, error } = await supabase
      .from('payments')
      .update({ payment_status: status })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getDetailedPayments(businessId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        booking:bookings!inner (
          id, 
          status, 
          business_id,
          agreed_price,
          shipment:shipments (
            id,
            pickup_address,
            drop_address
          )
        )
      `)
      .eq('booking.business_id', businessId)
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  },

  async getPaymentSummary(businessId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('amount, payment_status, bookings!inner(business_id)')
      .eq('bookings.business_id', businessId);

    if (error || !data) return { stats: { totalRevenue: 0, pendingPayments: 0, completedPayments: 0, failedCount: 0 }, error };

    const stats = {
      totalRevenue: data.filter(p => p.payment_status === 'paid').reduce((acc, p) => acc + (Number(p.amount) || 0), 0),
      pendingPayments: data.filter(p => p.payment_status === 'pending').reduce((acc, p) => acc + (Number(p.amount) || 0), 0),
      completedPayments: data.filter(p => p.payment_status === 'paid').reduce((acc, p) => acc + (Number(p.amount) || 0), 0),
      failedCount: data.filter(p => p.payment_status === 'failed').length
    };

    return { stats, error: null };
  }
};
