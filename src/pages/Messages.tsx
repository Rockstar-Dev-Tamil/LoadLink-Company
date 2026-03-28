import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { LucideArrowRight, LucideMessageSquare, LucidePackage, LucideSend, LucideUserRound, LucideCheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Topbar } from '../components/Topbar';
import { Skeleton } from '../components/Skeleton';
import { useShipments } from '../hooks/useShipments';
import { useMessages } from '../hooks/useMessages';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { Database } from '../types/database.types';

type Message = Database['public']['Tables']['messages']['Row'];

type ConversationSummary = {
  shipmentId: string;
  pickup: string;
  drop: string;
  status: string;
  unreadCount: number;
  lastMessage: Message | null;
};

export default function Messages() {
  const [searchParams] = useSearchParams();
  const urlShipmentId = searchParams.get('shipmentId');
  const { profile } = useAuthStore();
  const { shipments, loading: shipmentsLoading } = useShipments();
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const { messages, loading: threadLoading, sendMessage } = useMessages(selectedShipmentId);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const streamRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Keep the newest message visible when a thread is open.
    if (!streamRef.current) return;
    streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [messages, selectedShipmentId]);

  useEffect(() => {
    if (!shipments.length) {
      setSelectedShipmentId(null);
      return;
    }

    setSelectedShipmentId((current) => {
      // Prioritize shipmentId from URL if present
      if (urlShipmentId && shipments.some(s => s.id === urlShipmentId)) {
        return urlShipmentId;
      }
      if (current && shipments.some((shipment) => shipment.id === current)) {
        return current;
      }
      return shipments[0]?.id ?? null;
    });
  }, [shipments, urlShipmentId]);

  useEffect(() => {
    if (!profile?.id) {
      setConversationMessages([]);
      setMessagesLoading(false);
      return;
    }

    let active = true;

    const fetchConversationMessages = async () => {
      setMessagesLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: true });

      if (error) {
        if (active) {
          toast.error(error.message);
          setConversationMessages([]);
          setMessagesLoading(false);
        }
        return;
      }

      if (active) {
        setConversationMessages((data ?? []) as Message[]);
        setMessagesLoading(false);
      }
    };

    void fetchConversationMessages();

    const channel = supabase
      .channel(`messages:overview:${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          const nextRow = (payload.new ?? payload.old) as Partial<Message>;
          if (!nextRow.shipment_id) return;
          const isRelevant = nextRow.sender_id === profile.id || nextRow.receiver_id === profile.id;
          if (!isRelevant) return;

          setConversationMessages((current) => {
            if (payload.eventType === 'INSERT') {
              return [...current, payload.new as Message];
            }

            if (payload.eventType === 'UPDATE') {
              return current.map((item) => item.id === nextRow.id ? { ...item, ...(payload.new as Message) } : item);
            }

            if (payload.eventType === 'DELETE') {
              return current.filter((item) => item.id !== nextRow.id);
            }

            return current;
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const conversations = useMemo<ConversationSummary[]>(() => {
    const shipmentSet = new Set(shipments.map((shipment) => shipment.id));

    return shipments
      .map((shipment) => {
        const thread = conversationMessages.filter((message) => message.shipment_id === shipment.id && shipmentSet.has(shipment.id));
        const sortedThread = [...thread].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const lastMessage = sortedThread[0] ?? null;
        const unreadCount = thread.filter((message) => message.receiver_id === profile?.id && !message.is_read).length;

        return {
          shipmentId: shipment.id,
          pickup: shipment.pickup_address.split(',')[0] ?? shipment.pickup_address,
          drop: shipment.drop_address.split(',')[0] ?? shipment.drop_address,
          status: shipment.status,
          unreadCount,
          lastMessage,
        };
      })
      .filter((conversation) => conversation.lastMessage || conversation.status !== 'completed')
      .sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
        const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
        return bTime - aTime;
      });
  }, [conversationMessages, profile?.id, shipments]);

  const selectedConversation = conversations.find((conversation) => conversation.shipmentId === selectedShipmentId) ?? conversations[0] ?? null;

  const receiverId = useMemo(() => {
    if (!selectedShipmentId || !profile?.id) return null;
    const shipment = shipments.find((s) => s.id === selectedShipmentId);
    if (!shipment) return null;

    const driverId = shipment.bookings?.[0]?.driver_id ?? null;
    const businessId = shipment.business_id;
    return profile.id === businessId ? driverId : businessId;
  }, [profile?.id, selectedShipmentId, shipments]);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = draft.trim();
    if (!content) return;
    if (!receiverId) {
      toast.error('No receiver available for this shipment yet.');
      return;
    }

    setSending(true);
    try {
      await sendMessage(receiverId, content);
      setDraft('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send message right now.';
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar title="Messages" />

      <div className="page-scroll space-y-6 pb-20">
        <section className="hero-card card">
          <div className="hero-copy">
            <div className="section-label">REALTIME COLLABORATION</div>
            <h1 className="hero-title">Shipment conversations synced with your live Supabase data.</h1>
            <p className="hero-description">
              The layout comes from the msme-front conversation patterns, but every thread here is wired to your active business shipments and realtime message events.
            </p>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="card space-y-4">
            <div className="section-head">
              <div>
                <div className="section-label">CONVERSATIONS</div>
                <h2>Shipment inbox</h2>
                <p>Every row maps to a real shipment_id and updates as new messages arrive.</p>
              </div>
            </div>

            {shipmentsLoading || messagesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-[1.25rem]" count={4} />
              </div>
            ) : conversations.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)]">
                  <LucideMessageSquare className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-black">No live conversations yet</h3>
                <p className="muted">Once drivers or partners message on a shipment, it will appear here automatically.</p>
              </div>
            ) : (
              <div className="stack">
                {conversations.map((conversation) => {
                  const active = conversation.shipmentId === selectedConversation?.shipmentId;

                  return (
                    <button
                      key={conversation.shipmentId}
                      type="button"
                      onClick={() => setSelectedShipmentId(conversation.shipmentId)}
                      className={`row-button ${active ? 'is-active' : ''}`}
                    >
                      <div className="row-main">
                        <strong>{conversation.pickup}</strong>
                        {conversation.unreadCount > 0 ? (
                          <span className="pill pill--active">{conversation.unreadCount} new</span>
                        ) : (
                          <span className="pill pill--muted">{conversation.status}</span>
                        )}
                      </div>
                      <div className="row-sub">
                        <span>{conversation.drop}</span>
                        {conversation.lastMessage ? (
                          <span>{formatDistanceToNow(new Date(conversation.lastMessage.created_at), { addSuffix: true })}</span>
                        ) : (
                          <span>No messages</span>
                        )}
                      </div>
                      <div className="row-sub line-clamp-2">
                        {conversation.lastMessage?.content ?? 'Open this shipment to start the conversation.'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card flex min-h-[720px] flex-col">
            {selectedConversation ? (
              <>
                <div className="glass-strip">
                  <div className="space-y-1">
                    <div className="section-label">ACTIVE THREAD</div>
                    <div className="flex items-center gap-3 text-lg font-black">
                      <span>{selectedConversation.pickup}</span>
                      <LucideArrowRight className="h-4 w-4 text-[var(--muted)]" />
                      <span>{selectedConversation.drop}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="pill pill--active">{selectedConversation.status}</span>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-right">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">Shipment</div>
                      <div className="font-mono text-xs font-black uppercase text-[var(--text)]">
                        {selectedConversation.shipmentId.split('-')[0]}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 py-6 xl:grid-cols-[minmax(0,1fr)_260px]">
                  <div className="space-y-4">
                    <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
                      <div className="section-label">MESSAGE STREAM</div>
                      <p className="muted">Incoming and outgoing messages stay aligned to the shipment thread and are marked read when you open the conversation.</p>
                    </div>

                    <div className="flex min-h-[420px] flex-1 flex-col gap-4 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-soft)] p-5 overflow-hidden">
                      {threadLoading ? (
                        <Skeleton className="h-20 w-full rounded-[1.25rem]" count={5} />
                      ) : messages.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center text-center">
                          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)]">
                            <LucidePackage className="h-7 w-7" />
                          </div>
                          <h3 className="text-xl font-black">No messages on this shipment yet</h3>
                          <p className="muted max-w-md">The UI is ready and the realtime channel is live. Send the first update to start this shipment thread.</p>
                        </div>
                      ) : (
                        <div ref={streamRef} className="flex-1 overflow-y-auto no-scrollbar pr-2">
                          <div className="stack">
                            {messages.map((message) => {
                              const isMe = message.sender_id === profile?.id;
                              const bubbleBase = isMe
                                ? 'ml-auto bg-[var(--accent)] text-white'
                                : 'mr-auto bg-[var(--surface-strong)] text-[var(--text)]';

                              return (
                                <div key={message.id} className={`max-w-[78%] rounded-[1.5rem] border border-[var(--border)] px-5 py-4 shadow-sm ${bubbleBase}`}>
                                  <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] opacity-75">
                                    {isMe ? <LucideCheckCheck className="h-3.5 w-3.5" /> : <LucideUserRound className="h-3.5 w-3.5" />}
                                    <span>{isMe ? 'You' : 'Partner'}</span>
                                  </div>
                                  <p className="text-sm font-medium leading-6">{message.content}</p>
                                  <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleSend} className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <textarea
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          placeholder="Share shipment updates, ask for ETA, or confirm drop instructions."
                          rows={3}
                          className="min-h-[88px] flex-1 resize-none rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                        />
                        <button
                          type="submit"
                          disabled={sending || !draft.trim()}
                          className="primary-button flex min-w-[150px] items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <LucideSend className="h-4 w-4" />
                          <span>{sending ? 'Sending...' : 'Send update'}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  <aside className="space-y-4">
                    <div className="message-card p-5">
                      <div className="section-label">THREAD HEALTH</div>
                      <div className="mt-3 text-3xl font-black">{messages.length}</div>
                      <div className="muted">Messages currently stored for this shipment conversation.</div>
                    </div>

                    <div className="message-card p-5">
                      <div className="section-label">UNREAD</div>
                      <div className="mt-3 text-3xl font-black">{selectedConversation.unreadCount}</div>
                      <div className="muted">Unread messages are cleared when this shipment thread is opened.</div>
                    </div>

                    <div className="message-card p-5">
                      <div className="section-label">LIVE SOURCE</div>
                      <div className="mt-3 font-mono text-xs font-black uppercase text-[var(--text)]">public.messages</div>
                      <div className="muted">Realtime events are subscribed through Supabase channels with cleanup on unmount.</div>
                    </div>
                  </aside>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-[1.75rem] border border-dashed border-[var(--border)] bg-[var(--surface-soft)] text-center">
                <div className="max-w-md p-8">
                  <div className="mb-4 flex justify-center text-[var(--muted)]">
                    <LucideMessageSquare className="h-10 w-10" />
                  </div>
                  <h2 className="text-2xl font-black">Choose a shipment thread</h2>
                  <p className="muted">The right-hand panel will show live messages and a send box once a shipment conversation is selected.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
