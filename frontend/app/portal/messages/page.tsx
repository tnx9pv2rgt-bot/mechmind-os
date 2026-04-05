'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import {
  Send,
  Paperclip,
  AlertCircle,
  MessageCircle,
  Wrench,
  User,
} from 'lucide-react';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';

interface Message {
  id: string;
  content: string;
  sender: 'customer' | 'shop';
  senderName: string;
  createdAt: string;
  readAt: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
}

export default function PortalMessagesPage(): React.ReactElement {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    data: rawData,
    error: swrError,
    isLoading,
    mutate,
  } = useSWR<{ data: Message[] }>('/api/portal/messages', fetcher, {
    refreshInterval: 10000,
  });

  const messages = rawData?.data || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (): Promise<void> => {
    if (!newMessage.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      if (!res.ok) throw new Error('Errore nell\'invio del messaggio');
      setNewMessage('');
      await mutate();
      toast.success('Messaggio inviato');
    } catch {
      toast.error('Errore nell\'invio del messaggio');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-apple-dark dark:text-[var(--text-primary)]'>Messaggi</h1>
          <p className='text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
            Comunica con la tua officina
          </p>
        </div>
        <div className='flex items-center justify-center h-64'>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className='w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full'
          />
        </div>
      </div>
    );
  }

  if (swrError) {
    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-apple-dark dark:text-[var(--text-primary)]'>Messaggi</h1>
          <p className='text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
            Comunica con la tua officina
          </p>
        </div>
        <div className='text-center py-16'>
          <AlertCircle className='h-12 w-12 text-apple-red/40 mx-auto mb-4' />
          <p className='text-apple-gray dark:text-[var(--text-secondary)] mb-4'>
            Impossibile caricare i messaggi
          </p>
          <button onClick={() => mutate()} className='text-apple-blue hover:underline'>
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-apple-dark dark:text-[var(--text-primary)]'>Messaggi</h1>
        <p className='text-apple-gray dark:text-[var(--text-secondary)] mt-1'>
          Comunica con la tua officina
        </p>
      </div>

      <AppleCard className='overflow-hidden'>
        <AppleCardContent className='p-0'>
          {/* Chat area */}
          <div className='h-[500px] overflow-y-auto p-4 sm:p-6 space-y-4 bg-apple-light-gray/30 dark:bg-[var(--surface-tertiary)]'>
            {messages.length === 0 ? (
              <div className='flex flex-col items-center justify-center h-full text-center'>
                <MessageCircle className='h-16 w-16 text-apple-gray/30 mb-4' />
                <h3 className='text-lg font-medium text-apple-dark dark:text-[var(--text-primary)] mb-2'>
                  Nessun messaggio
                </h3>
                <p className='text-apple-gray dark:text-[var(--text-secondary)] max-w-sm'>
                  Inizia una conversazione con la tua officina. Puoi chiedere informazioni su
                  preventivi, riparazioni o prenotazioni.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isCustomer = msg.sender === 'customer';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex items-end gap-2 max-w-[80%] ${
                        isCustomer ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                          isCustomer
                            ? 'bg-apple-blue'
                            : 'bg-apple-orange'
                        }`}
                      >
                        {isCustomer ? (
                          <User className='h-4 w-4 text-white' />
                        ) : (
                          <Wrench className='h-4 w-4 text-white' />
                        )}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          isCustomer
                            ? 'bg-apple-blue text-white rounded-br-sm'
                            : 'bg-white dark:bg-[var(--surface-elevated)] text-apple-dark dark:text-[var(--text-primary)] rounded-bl-sm shadow-sm'
                        }`}
                      >
                        <p className={`text-xs font-medium mb-1 ${
                          isCustomer ? 'text-white/70' : 'text-apple-gray dark:text-[var(--text-secondary)]'
                        }`}>
                          {msg.senderName}
                        </p>
                        <p className='text-sm whitespace-pre-wrap'>{msg.content}</p>

                        {msg.attachmentUrl && (
                          <a
                            href={msg.attachmentUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            className={`inline-flex items-center gap-1 mt-2 text-xs underline ${
                              isCustomer ? 'text-white/80' : 'text-apple-blue'
                            }`}
                          >
                            <Paperclip className='h-3 w-3' />
                            {msg.attachmentName || 'Allegato'}
                          </a>
                        )}

                        <p
                          className={`text-[10px] mt-1 ${
                            isCustomer ? 'text-white/50' : 'text-apple-gray/50 dark:text-[var(--text-secondary)]/50'
                          }`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString('it-IT', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className='border-t border-apple-border/20 dark:border-[var(--border-default)] p-4 bg-white dark:bg-[var(--surface-elevated)]'>
            <div className='flex items-end gap-3'>
              <div className='flex-1'>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder='Scrivi un messaggio...'
                  rows={1}
                  className='w-full resize-none rounded-xl border border-apple-border/30 dark:border-[var(--border-default)] bg-apple-light-gray/50 dark:bg-[var(--surface-hover)] px-4 py-3 text-sm text-apple-dark dark:text-[var(--text-primary)] placeholder:text-apple-gray focus:outline-none focus:ring-2 focus:ring-apple-blue/50 min-h-[44px] max-h-32'
                  style={{ height: 'auto', overflow: 'hidden' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                  }}
                />
              </div>
              <AppleButton
                onClick={handleSend}
                loading={isSending}
                disabled={!newMessage.trim()}
                className='min-w-[44px] min-h-[44px]'
                aria-label='Invia messaggio'
              >
                <Send className='h-4 w-4' />
              </AppleButton>
            </div>
            <p className='text-[10px] text-apple-gray dark:text-[var(--text-secondary)] mt-2'>
              Premi Invio per inviare, Shift+Invio per andare a capo
            </p>
          </div>
        </AppleCardContent>
      </AppleCard>
    </div>
  );
}
