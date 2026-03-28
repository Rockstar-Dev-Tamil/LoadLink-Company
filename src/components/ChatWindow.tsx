import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMessages } from '../hooks/useMessages';
import { useAuthStore } from '../stores/authStore';
import { X, Send, User, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ChatWindowProps {
  shipmentId: string;
  driverId: string;
  driverName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatWindow({ shipmentId, driverId, driverName, isOpen, onClose }: ChatWindowProps) {
  const { profile } = useAuthStore();
  const { messages, sendMessage, loading } = useMessages(shipmentId);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !profile) return;

    try {
      await sendMessage(driverId, inputValue.trim());
      setInputValue('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to send message right now.';
      toast.error(message);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 xl:hidden"
          />

          {/* Chat Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-bg-base/95 backdrop-blur-2xl border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{driverName}</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Online · Driver</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center text-text-muted transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-40">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-black uppercase tracking-widest">Securing Connection...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-text-muted">
                    <MessageSquare size={32} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white mb-1">No messages yet</h4>
                    <p className="text-[10px] uppercase tracking-wider">Start the conversation with your driver</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.sender_id === profile?.id;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] space-y-1`}>
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isMe
                              ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-600/20'
                              : 'bg-white/10 text-white rounded-tl-none border border-white/5'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <div className={`text-[9px] font-black text-text-muted uppercase tracking-tighter ${isMe ? 'text-right' : 'text-left'}`}>
                          {format(new Date(msg.created_at), 'hh:mm a')}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-white/10 bg-white/5">
              <form onSubmit={handleSend} className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-bg-base border border-white/10 rounded-2xl px-6 py-4 pr-16 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="absolute right-2 top-2 bottom-2 w-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Send size={18} />
                </button>
              </form>
              <p className="mt-3 text-[9px] text-center text-text-muted uppercase tracking-widest font-black opacity-30">
                End-to-End Encrypted via LoadLink Secure
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
