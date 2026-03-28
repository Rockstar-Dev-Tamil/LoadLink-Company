import { useMemo, useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Bot, Sparkles } from 'lucide-react';
import './Chatbot.css';
import { getDeterministicReply, askAI, checkOllama, type ChatState } from './chatbotLogic';
import { useAuthStore } from '../../stores/authStore';
import { useShipments } from '../../hooks/useShipments';
import { usePayments } from '../../hooks/usePayments';
import { useTranslation } from 'react-i18next';

type ChatMessage = {
  role: 'assistant' | 'user';
  text: string;
};

export function Chatbot() {
  const { t, i18n } = useTranslation(['chatbot', 'common']);
  const { profile } = useAuthStore();
  const { shipments } = useShipments();
  const { stats: paymentStats } = usePayments();
  
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ online: boolean; model: string | null }>({ online: false, model: null });
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [chatState, setChatState] = useState<ChatState>({
    pendingIntent: null,
    pendingLabel: null,
    lastRoute: null,
  });
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: t('chatbot:welcome', 'Operations help. Ask me about delivery status, ETA, tracking, or a specific shipment ID.'),
    },
  ]);

  useEffect(() => {
    checkOllama().then(setAiStatus);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, open]);

  const canSend = useMemo(() => input.trim().length > 0 && !isTyping, [input, isTyping]);

  const handleSend = async (overrideText?: string) => {
    const question = (overrideText || input).trim();
    if (!question) return;

    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setInput('');
    setIsTyping(true);

    try {
      let reply: string;
      let newState = chatState;

      if (aiStatus.online && aiStatus.model) {
        reply = await askAI(
          question, 
          aiStatus.model, 
          {
            activeShipments: shipments.length,
            pendingPayments: paymentStats.totalRevenue,
            userRole: profile?.role || 'user'
          },
          messages.slice(-5).map(m => ({ role: m.role, text: m.text }))
        );
      } else {
        const result = getDeterministicReply(question, chatState);
        reply = result.reply;
        newState = result.newState;
      }

      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
      setChatState(newState);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: t('chatbot:errors.connectivity', "I'm having trouble connecting to my brain right now. Please try again.") }]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickActions = [
    { label: t('chatbot:actions.who_are_you', 'Who are you?'), question: 'Who are you?' },
    { label: t('chatbot:actions.track_truck', 'Track truck'), question: 'How do I track my truck?' },
    { label: t('chatbot:actions.payment_help', 'Payment help'), question: 'Help with payments' },
  ];

  return (
    <div className="chatbot-root">
      {open ? (
        <section className="assistant-panel">
          <div className="assistant-header">
            <div>
              <div className="assistant-status-pill !m-0 !mb-3">
                <span className={`live-dot ${aiStatus.online ? '' : '!bg-amber-500 !shadow-[0_0_12px_rgba(245,158,11,0.5)]'}`} />
                <span>{aiStatus.online ? `SECURED AI: ${aiStatus.model}` : 'BASIC MODE'}</span>
              </div>
              <h3 className="text-[var(--text)]">{t('chatbot:title', 'LoadLink Assistant')}</h3>
              <p>{t('chatbot:subtitle', 'Operations intelligence & lane support agent.')}</p>
            </div>
            <button className="assistant-close" onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="quick-row mt-4">
            {quickActions.map((action) => (
              <button
                key={action.question}
                className="quick-button"
                onClick={() => handleSend(action.question)}
              >
                {action.label}
              </button>
            ))}
          </div>

          <div className="assistant-messages" ref={scrollRef}>
            {messages.map((message, index) => (
              <div className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}>
                {message.text}
              </div>
            ))}

            {isTyping && (
              <div className="assistant-message assistant">
                <div className="typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          <form
            className="assistant-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <textarea
              className="assistant-input no-scrollbar"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chatbot:input_placeholder', 'Ask about ETA, tracking, or lane help...')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button 
              className={`primary-button !min-h-[42px] ${!canSend ? 'opacity-50 cursor-not-allowed' : ''}`} 
              type="submit"
              disabled={!canSend}
            >
              <Send size={16} />
            </button>
          </form>
        </section>
      ) : null}

      <button
        className="assistant-launcher"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="relative">
           <Bot className={`w-5 h-5 transition-all duration-300 ${open ? 'rotate-90 opacity-0 scale-0' : 'rotate-0 opacity-100 scale-100'}`} />
           <X className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${open ? 'rotate-0 opacity-100 scale-100' : '-rotate-90 opacity-0 scale-0'}`} />
        </div>
        <span>{open ? t('common:actions.close', 'Close') : t('chatbot:title', 'Help')}</span>
      </button>
    </div>
  );
}
