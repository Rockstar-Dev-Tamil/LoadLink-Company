import { supabase } from '../lib/supabase';

export const BOOKING_VERIFICATION_BUCKET = 'booking-verifications';
export type BookingProofType = 'loading' | 'delivery';
export type ProofVerificationStatus = 'pending' | 'accepted' | 'declined';

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

export type ProofVerificationEntry = {
  kind: 'proof_verification';
  proofType: BookingProofType;
  status: ProofVerificationStatus;
  imagePath?: string | null;
  uploadedAt?: string;
  verifiedAt?: string;
  reviewerId?: string;
  reviewerName?: string;
  note?: string;
};

type BookingHistoryEntry = MilestoneHistoryEntry | ProofVerificationEntry;

const normalizeHistory = (raw: unknown): BookingHistoryEntry[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as BookingHistoryEntry[];
  return [];
};

const isProofVerificationEntry = (entry: BookingHistoryEntry): entry is ProofVerificationEntry => {
  return typeof entry === 'object' && entry !== null && 'kind' in entry && entry.kind === 'proof_verification';
};

export function getLatestProofVerification(
  history: unknown,
  proofType: BookingProofType,
  imagePath?: string | null,
) {
  const events = normalizeHistory(history).filter(isProofVerificationEntry);
  const scoped = events.filter((entry) => {
    if (entry.proofType !== proofType) return false;
    if (!imagePath) return true;
    return entry.imagePath === imagePath || !entry.imagePath;
  });

  const latest = scoped.at(-1) ?? null;
  if (!latest) {
    if (!imagePath) return null;
    return {
      proofType,
      status: 'pending' as ProofVerificationStatus,
      imagePath,
      uploadedAt: undefined,
      verifiedAt: undefined,
      reviewerId: undefined,
      reviewerName: undefined,
      note: undefined,
    };
  }

  return latest;
}

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

export async function uploadBookingVerificationPhoto(
  bookingId: string,
  proofType: BookingProofType,
  file: File,
  history?: unknown,
) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExtension = extension.replace(/[^a-z0-9]/g, '') || 'jpg';
  const filePath = `${bookingId}/${proofType}-${Date.now()}.${safeExtension}`;

  const { error: uploadError } = await supabase.storage
    .from(BOOKING_VERIFICATION_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });

  if (uploadError) throw uploadError;

  const uploadedAt = new Date().toISOString();
  const nextHistory = [
    ...normalizeHistory(history),
    {
      kind: 'proof_verification',
      proofType,
      status: 'pending',
      imagePath: filePath,
      uploadedAt,
    } satisfies ProofVerificationEntry,
  ];

  const updates =
    proofType === 'loading'
      ? {
          loading_proof_url: filePath,
          loading_proof_status: 'pending',
          loading_proof_uploaded_at: uploadedAt,
          loading_proof_verified_at: null,
          loading_proof_verified_by: null,
          loading_proof_review_note: null,
          milestone_history: nextHistory,
        }
      : {
          delivery_proof_url: filePath,
          delivery_proof_status: 'pending',
          delivery_proof_uploaded_at: uploadedAt,
          delivery_proof_verified_at: null,
          delivery_proof_verified_by: null,
          delivery_proof_review_note: null,
          milestone_history: nextHistory,
        };

  await updateBookingProofs(bookingId, updates);

  return {
    bucket: BOOKING_VERIFICATION_BUCKET,
    path: filePath,
    uploadedAt,
  };
}

export async function verifyBookingProof(
  bookingId: string,
  history: unknown,
  input: {
    proofType: BookingProofType;
    decision: Exclude<ProofVerificationStatus, 'pending'>;
    imagePath?: string | null;
    reviewerId: string;
    reviewerName?: string | null;
    note?: string;
  },
) {
  const verifiedAt = new Date().toISOString();
  const nextHistory = [
    ...normalizeHistory(history),
    {
      kind: 'proof_verification',
      proofType: input.proofType,
      status: input.decision,
      imagePath: input.imagePath ?? null,
      verifiedAt,
      reviewerId: input.reviewerId,
      reviewerName: input.reviewerName ?? undefined,
      note: input.note?.trim() || undefined,
    } satisfies ProofVerificationEntry,
  ];

  const proofUpdates = input.proofType === 'loading'
    ? {
        loading_proof_status: input.decision,
        loading_proof_verified_at: verifiedAt,
        loading_proof_verified_by: input.reviewerId,
        loading_proof_review_note: input.note?.trim() || null,
      }
    : {
        delivery_proof_status: input.decision,
        delivery_proof_verified_at: verifiedAt,
        delivery_proof_verified_by: input.reviewerId,
        delivery_proof_review_note: input.note?.trim() || null,
      };

  const statusUpdates = input.proofType === 'delivery' && input.decision === 'accepted'
    ? { current_milestone: 'delivered', status: 'completed' }
    : input.proofType === 'loading' && input.decision === 'accepted'
      ? { current_milestone: 'loaded', status: 'in_progress' }
      : {};

  const { data, error } = await supabase
    .from('bookings')
    .update({
      milestone_history: nextHistory,
      ...proofUpdates,
      ...statusUpdates,
    } as any)
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function isSupabaseStoragePath(value: string | null | undefined) {
  if (!value) return false;
  return !/^https?:\/\//i.test(value);
}

export async function getSignedVerificationUrl(pathOrUrl: string, expiresIn = 3600) {
  if (!isSupabaseStoragePath(pathOrUrl)) return pathOrUrl;

  const { data, error } = await supabase.storage
    .from(BOOKING_VERIFICATION_BUCKET)
    .createSignedUrl(pathOrUrl, expiresIn);

  if (error) throw error;
  if (!data?.signedUrl) {
    throw new Error('Unable to generate a signed verification URL.');
  }

  return data.signedUrl;
}

export async function getVerificationPreviewUrl(pathOrUrl: string, expiresIn = 3600) {
  if (!isSupabaseStoragePath(pathOrUrl)) return pathOrUrl;

  try {
    return await getSignedVerificationUrl(pathOrUrl, expiresIn);
  } catch {
    const { data, error } = await supabase.storage
      .from(BOOKING_VERIFICATION_BUCKET)
      .download(pathOrUrl);

    if (error) throw error;
    return URL.createObjectURL(data);
  }
}

export async function findLatestVerificationPath(
  bookingId: string,
  proofType: BookingProofType,
) {
  const { data, error } = await supabase.storage
    .from(BOOKING_VERIFICATION_BUCKET)
    .list(bookingId, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) throw error;

  const match = (data ?? []).find((file) => file.name.startsWith(`${proofType}-`));
  if (!match?.name) return null;
  return `${bookingId}/${match.name}`;
}
