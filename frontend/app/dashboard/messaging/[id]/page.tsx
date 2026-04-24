'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Send,
  Loader2,
  AlertCircle,
  User,
  Phone,
  Check,
  CheckCheck,
  Eye,
} from 'lucide-react';

interface Message {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  body: string;
  createdAt: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
}

interface ConversationDetail {
  id: string;
  customerName: string;
  customerPhone: string;
  channel: string;
  messages: Message[];
}

const STATUS_ICONS: Record<string, typeof Check> = {
  SENT: Check,
  DELIVERED: CheckCheck,
  READ: Eye,
};

export default function MessagingThreadPage() {
  const params = useParams();
  const id = params.id as string;
  const bottomRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const { data: rawData, error, isLoading, mutate } = useSWR<{ data?: ConversationDetail } | ConversationDetail>(
    `/api/dashboard/messaging/conversations/${id}/messages`,
    fetcher,
    { refreshInterval: 5000 }
  );

  const conversation: ConversationDetail | null = (() => {
    if (!rawData) return null;
    return (rawData as { data?: ConversationDetail }).data || (rawData as ConversationDetail);
  })();

  const messages: Message[] = (() => {
    if (!conversation) return [];
    if (Array.isArray(conversation)) return conversation as unknown as Message[];
    return conversation.messages || [];
  })();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/dashboard/messaging/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newMessage }),
      });
      if (!res.ok) throw new Error('Errore invio messaggio');
      setNewMessage('');
      mutate();
      toast.success('Messaggio inviato');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore invio messaggio');
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <Loader2 className='h-8 w-8 animate-spin text-[var(--brand)]' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] text-center'>
        <AlertCircle className='h-12 w-12 text-[var(--status-error)]/40 mb-4' />
        <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-4'>Conversazione non trovata</p>
        <Link href='/dashboard/messaging'>
          <AppleButton variant='secondary'>Torna ai messaggi</AppleButton>
        </Link>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto w-full sm:px-4 lg:px-0'>
      <header className='px-8 py-4'>
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Messaggistica', href: '/dashboard/messaging' },
            { label: conversation?.customerName || 'Conversazione' },
          ]}
        />
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 rounded-full bg-[var(--brand)]/10 flex items-center justify-center'>
            <User className='h-5 w-5 text-[var(--brand)]' />
          </div>
          <div>
            <h1 className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
              {conversation?.customerName || 'Conversazione'}
            </h1>
            <p className='text-footnote text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] flex items-center gap-1'>
              <Phone className='h-3 w-3' />
              {conversation?.customerPhone}
              {conversation?.channel && (
                <span className='ml-2 text-footnote px-1.5 py-0.5 rounded-full bg-[var(--brand)]/10 text-[var(--brand)]'>
                  {conversation.channel}
                </span>
              )}
            </p>
          </div>
        </div>
      </header>

      <div className='flex-1 overflow-y-auto p-8 space-y-4'>
        {messages.length === 0 ? (
          <div className='text-center py-12'>
            <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Nessun messaggio. Invia il primo messaggio.</p>
          </div>
        ) : (
          messages.map(msg => {
            const StatusIcon = STATUS_ICONS[msg.status];
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                  msg.direction === 'OUTBOUND'
                    ? 'bg-[var(--brand)] text-[var(--text-on-brand)] rounded-br-md'
                    : 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-hover)] text-[var(--text-primary)] dark:text-[var(--text-primary)] rounded-bl-md'
                }`}>
                  <p className='text-body'>{msg.body}</p>
                  <div className={`flex items-center gap-1 mt-1 ${msg.direction === 'OUTBOUND' ? 'justify-end' : ''}`}>
                    <p className={`text-footnote ${msg.direction === 'OUTBOUND' ? 'text-[var(--text-on-brand)]/60' : 'text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {msg.direction === 'OUTBOUND' && StatusIcon && (
                      <StatusIcon className='h-3 w-3 text-[var(--text-on-brand)]/60' />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className='border-t border-[var(--border-default)]/20 dark:border-[var(--border-default)]/50 bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] px-8 py-4'>
        <div className='flex gap-3'>
          <Input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder='Scrivi un messaggio...'
            className='flex-1'
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          <AppleButton
            icon={<Send className='h-4 w-4' />}
            onClick={sendMessage}
            loading={sending}
            disabled={!newMessage.trim() || sending}
          >
            Invia
          </AppleButton>
        </div>
      </div>
    </div>
  );
}
