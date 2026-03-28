import { supabase } from '../lib/supabase';

export type BookingMilestone =
  | 'started'
  | 'arrived_pickup'
  | 'loaded'
  | 'in_transit'
  | 'arrived_destination'
  | 'delivered';

export type MilestoneHistoryEntry = {
  stage: BookingMilestone;
  at: string;
  note?: string;
};

const normalizeHistory = (raw: unknown): MilestoneHistoryEntry[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as MilestoneHistoryEntry[];
  return [];
};

export async function updateBookingMilestone(
  bookingId: string,
  milestone: BookingMilestone,
  history: unknown,
) {
  const nextHistory = [
    ...normalizeHistory(history),
    { stage: milestone, at: new Date().toISOString() },
  ];

  const status = milestone === 'delivered' ? 'completed' : 'in_progress';

  const { data, error } = await supabase
    .from('bookings')
    .update({
      current_milestone: milestone,
      status,
      milestone_history: nextHistory,
    } as any)
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBookingProofs(
  bookingId: string,
  updates: { loading_proof_url?: string | null; delivery_proof_url?: string | null },
) {
  const { data, error } = await supabase
    .from('bookings')
    .update(updates as any)
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
