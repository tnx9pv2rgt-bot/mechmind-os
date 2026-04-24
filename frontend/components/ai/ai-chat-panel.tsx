'use client';

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Loader2,
  Bot,
  User,
  Trash2,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface SuggestedAction {
  label: string;
  prompt: string;
}

// ─── Suggested Actions ──────────────────────────────────────────────
const SUGGESTED_ACTIONS: SuggestedAction[] = [
  { label: 'Fatture non pagate', prompt: 'Quali fatture sono scadute e non ancora pagate?' },
  { label: 'Clienti inattivi', prompt: 'Quali clienti non vengono da più di 6 mesi?' },
  { label: 'Ricavi del mese', prompt: 'Quanto abbiamo fatturato questo mese rispetto al mese scorso?' },
  { label: 'Prenotazioni oggi', prompt: 'Quante prenotazioni ci sono per oggi e qual è il carico di lavoro?' },
  { label: 'Veicoli in scadenza', prompt: 'Quali veicoli hanno la revisione in scadenza nei prossimi 30 giorni?' },
  { label: 'Top servizi', prompt: 'Quali sono i servizi più richiesti negli ultimi 3 mesi?' },
];

// ─── Component ──────────────────────────────────────────────────────
export function AiChatPanel(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create assistant placeholder
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      },
    ]);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: content.trim(),
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          context: {
            currentPath: window.location.pathname,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Errore ${response.status}`);
      }

      // Handle streaming or JSON response
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
        // Stream response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            fullContent += chunk;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: fullContent } : m
              )
            );
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m
          )
        );
      } else {
        // JSON response
        const data = await response.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: data.response ?? data.message ?? 'Nessuna risposta', isStreaming: false }
              : m
          )
        );
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `Mi dispiace, si è verificato un errore. Riprova tra un momento. (${(error as Error).message})`,
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]);

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = (): void => {
    setMessages([]);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-[9000] w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--status-info)] to-[var(--brand)] text-[var(--text-on-brand)] shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center group"
            aria-label="Apri assistente AI"
          >
            <Sparkles className="h-6 w-6 group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              'fixed z-[9000] bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] rounded-2xl shadow-2xl border border-[var(--border-default)] dark:border-[var(--border-default)] flex flex-col overflow-hidden',
              isExpanded
                ? 'bottom-4 right-4 left-4 top-4 sm:left-auto sm:top-4 sm:w-[560px]'
                : 'bottom-6 right-6 w-[400px] h-[560px]'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] dark:border-[var(--border-default)] bg-gradient-to-r from-[var(--status-info)] to-[var(--brand)] text-[var(--text-on-brand)] rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--surface-secondary)]/20 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">MechMind AI</h3>
                  <p className="text-[11px] text-[var(--text-on-brand)]/70">Assistente intelligente</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-secondary)]/20 transition-colors"
                  aria-label="Pulisci chat"
                  title="Pulisci chat"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-secondary)]/20 transition-colors"
                  aria-label={isExpanded ? 'Riduci' : 'Espandi'}
                >
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-secondary)]/20 transition-colors"
                  aria-label="Chiudi"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--status-info)]/10 to-[var(--brand)]/10 dark:from-[var(--status-info)]/40/30 dark:to-[var(--brand)]/40/30 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-[var(--brand)] dark:text-[var(--brand)]" />
                  </div>
                  <div className="text-center">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1">
                      Ciao! Come posso aiutarti?
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
                      Chiedimi informazioni su clienti, fatture, prenotazioni e altro.
                    </p>
                  </div>

                  {/* Suggested Actions */}
                  <div className="grid grid-cols-2 gap-2 w-full mt-2">
                    {SUGGESTED_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => sendMessage(action.prompt)}
                        className="text-left px-3 py-2.5 rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)] transition-colors"
                      >
                        <span className="text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
                          {action.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-2.5',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--status-info)] to-[var(--brand)] flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-[var(--text-on-brand)]" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                      message.role === 'user'
                        ? 'bg-[var(--brand)] text-[var(--text-on-brand)] rounded-br-md'
                        : 'bg-[var(--surface-hover)] dark:bg-[var(--surface-elevated)] text-[var(--text-primary)] dark:text-[var(--text-primary)] rounded-bl-md'
                    )}
                  >
                    {message.content || (
                      <span className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Sto pensando...
                      </span>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-[var(--border-default)] dark:bg-[var(--surface-hover)] flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-3.5 w-3.5 text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-[var(--border-default)] dark:border-[var(--border-default)] p-3"
            >
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Scrivi un messaggio..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] transition-all"
                  style={{ maxHeight: '120px' }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="shrink-0 w-10 h-10 rounded-xl bg-[var(--brand)] text-[var(--text-on-brand)] flex items-center justify-center hover:bg-[var(--brand)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Invia messaggio"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5 text-center">
                MechMind AI analizza i dati della tua officina per aiutarti.
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
