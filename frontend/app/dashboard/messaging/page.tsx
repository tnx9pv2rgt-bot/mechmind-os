'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Pagination } from '@/components/ui/pagination';
import { AppleButton } from '@/components/ui/apple-button';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import {
  MessageSquare,
  Send,
  Search,
  Loader2,
  ArrowLeft,
  User,
  Phone,
  AlertCircle,
  Mail,
  Plus,
  Check,
  CheckCheck,
  Eye,
  Filter,
} from 'lucide-react';

interface Conversation {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
}

interface Message {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  body: string;
  createdAt: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  channel: string;
}

const CHANNEL_CONFIG: Record<string, { label: string; icon: typeof MessageSquare; color: string }> = {
  SMS: { label: 'SMS', icon: MessageSquare, color: 'var(--status-info)' },
  WHATSAPP: { label: 'WhatsApp', icon: MessageSquare, color: 'var(--status-success)' },
  EMAIL: { label: 'Email', icon: Mail, color: 'var(--status-warning)' },
};

const STATUS_ICONS: Record<string, typeof Check> = {
  SENT: Check,
  DELIVERED: CheckCheck,
  READ: Eye,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const statsCardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export default function MessagingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 20;

  const queryParams = new URLSearchParams();
  if (channelFilter) queryParams.set('channel', channelFilter);
  if (unreadOnly) queryParams.set('unread', 'true');

  const {
    data: convsData,
    error: convsError,
    isLoading: convsLoading,
    mutate: mutateConvs,
  } = useSWR<{ data?: Conversation[] } | Conversation[]>(
    `/api/dashboard/messaging/conversations?${queryParams.toString()}`,
    fetcher
  );

  const {
    data: msgsData,
    isLoading: msgsLoading,
    mutate: mutateMsgs,
  } = useSWR<{ data?: Message[] } | Message[]>(
    selectedConvId ? `/api/dashboard/messaging/conversations/${selectedConvId}/messages` : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  const conversations: Conversation[] = (() => {
    if (!convsData) return [];
    const list = (convsData as { data?: Conversation[] }).data || convsData;
    return Array.isArray(list) ? list : [];
  })();

  const messages: Message[] = (() => {
    if (!msgsData) return [];
    const list = (msgsData as { data?: Message[] }).data || msgsData;
    return Array.isArray(list) ? list : [];
  })();

  const filteredConvs = conversations.filter(c => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.customerName?.toLowerCase().includes(q) && !c.customerPhone?.includes(q)) return false;
    }
    return true;
  });

  const selectedConv = conversations.find(c => c.id === selectedConvId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConvId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/dashboard/messaging/conversations/${selectedConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newMessage }),
      });
      if (!res.ok) throw new Error('Errore nell\'invio');
      setNewMessage('');
      mutateMsgs();
      mutateConvs();
      toast.success('Messaggio inviato');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'invio del messaggio');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className='bg-[var(--surface-tertiary)]'>
      {/* Header */}
      <header>
        <div className='px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div>
            <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Messaggistica</h1>
            <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
              Gestisci le conversazioni con i clienti
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <AppleButton variant='primary' icon={<Plus className='h-4 w-4' />}>
              Nuovo Messaggio
            </AppleButton>
          </div>
        </div>
      </header>

      <div className='p-4 sm:p-8'>
        <AppleCard hover={false}>
          <div className='flex h-[calc(100vh-280px)] min-h-[500px]'>
            {/* Conversation List */}
            <div className={`${selectedConvId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r border-[var(--border-default)]`}>
              {/* Search & Filters */}
              <div className='p-4 border-b border-[var(--border-default)] space-y-3'>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]' />
                  <input
                    placeholder='Cerca conversazione...'
                    aria-label='Cerca conversazioni'
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className='w-full pl-10 pr-4 h-10 rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)]/5 text-body text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--border-default)]/30'
                  />
                </div>
                <div className='flex items-center gap-2'>
                  <select
                    value={channelFilter}
                    onChange={e => setChannelFilter(e.target.value)}
                    className='text-footnote h-8 px-3 rounded-full border border-[var(--border-default)] bg-[var(--surface-secondary)]/5 text-[var(--text-primary)] outline-none'
                  >
                    <option value=''>Tutti i canali</option>
                    <option value='SMS'>SMS</option>
                    <option value='WHATSAPP'>WhatsApp</option>
                    <option value='EMAIL'>Email</option>
                  </select>
                  <AppleButton
                    variant={unreadOnly ? 'primary' : 'ghost'}
                    size='sm'
                    onClick={() => setUnreadOnly(!unreadOnly)}
                  >
                    Solo non letti
                  </AppleButton>
                </div>
              </div>

              {/* Thread Items */}
              <div className='flex-1 overflow-y-auto'>
                {convsError ? (
                  <div className='flex flex-col items-center justify-center py-12 text-center px-4'>
                    <AlertCircle className='h-12 w-12 text-[var(--status-error)]/40 mb-4' />
                    <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Impossibile caricare le conversazioni</p>
                    <AppleButton
                      variant='ghost'
                      className='mt-4'
                      onClick={() => mutateConvs()}
                    >
                      Riprova
                    </AppleButton>
                  </div>
                ) : convsLoading ? (
                  <div className='flex items-center justify-center py-12'>
                    <Loader2 className='h-8 w-8 animate-spin text-[var(--brand)]' />
                  </div>
                ) : filteredConvs.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-12 text-center px-4'>
                    <MessageSquare className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                    <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                      Nessuna conversazione. I messaggi appariranno qui.
                    </p>
                  </div>
                ) : (
                  <motion.div variants={containerVariants} initial='hidden' animate='visible'>
                    {filteredConvs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(conv => {
                      const channelCfg = CHANNEL_CONFIG[conv.channel] || CHANNEL_CONFIG.SMS;
                      const ChannelIcon = channelCfg.icon;
                      const isSelected = selectedConvId === conv.id;
                      return (
                        <motion.div
                          key={conv.id}
                          variants={listItemVariants}
                          onClick={() => setSelectedConvId(conv.id)}
                          whileHover={{ scale: 1.005, x: 4 }}
                          transition={{ duration: 0.2 }}
                          className={`flex items-center gap-3 p-4 cursor-pointer transition-all duration-300 rounded-2xl mx-2 my-1 ${
                            isSelected ? 'bg-[var(--surface-secondary)]/50 dark:bg-[var(--surface-active)]' : 'bg-[var(--surface-secondary)]/30 dark:bg-[var(--surface-hover)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-active)] hover:shadow-apple'
                          }`}
                        >
                          <div className='w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--status-info)]/10'>
                            <User className='h-5 w-5 text-[var(--status-info)]' />
                          </div>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center justify-between'>
                              <p className='text-body font-semibold truncate text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                                {conv.customerName}
                              </p>
                              <div className='flex items-center gap-1.5'>
                                <ChannelIcon className='h-3 w-3' style={{ color: channelCfg.color }} />
                                {conv.unreadCount > 0 && (
                                  <span className='px-2 py-0.5 rounded-full text-footnote font-bold bg-[var(--text-primary)] text-[var(--surface-tertiary)]'>
                                    {conv.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className='text-footnote truncate text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>
                              {conv.lastMessage}
                            </p>
                            <p className='text-footnote mt-0.5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] opacity-70'>
                              {new Date(conv.lastMessageAt).toLocaleDateString('it-IT', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
                <div className='p-3'>
                  <Pagination page={page} totalPages={Math.ceil(filteredConvs.length / PAGE_SIZE) || 1} onPageChange={setPage} />
                </div>
              </div>
            </div>

            {/* Chat Panel */}
            <div className={`${selectedConvId ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-[var(--surface-tertiary)]`}>
              {selectedConvId && selectedConv ? (
                <>
                  {/* Thread Header */}
                  <div className='flex items-center gap-3 p-4 border-b border-[var(--border-default)]'>
                    <AppleButton
                      variant='ghost'
                      size='sm'
                      className='md:hidden'
                      onClick={() => setSelectedConvId(null)}
                      icon={<ArrowLeft className='h-4 w-4' />}
                    >
                      {''}
                    </AppleButton>
                    <div className='w-10 h-10 rounded-full flex items-center justify-center bg-[var(--status-info)]/10'>
                      <User className='h-5 w-5 text-[var(--status-info)]' />
                    </div>
                    <div className='flex-1'>
                      <p className='text-body font-medium text-[var(--text-primary)]'>
                        {selectedConv.customerName}
                      </p>
                      <p className='text-footnote flex items-center gap-2 text-[var(--text-tertiary)]'>
                        <Phone className='h-3 w-3' />
                        {selectedConv.customerPhone}
                        <span
                          className='text-footnote px-1.5 py-0.5 rounded-full font-medium'
                          style={{
                            backgroundColor: `${CHANNEL_CONFIG[selectedConv.channel]?.color || 'var(--status-info)'}18`,
                            color: CHANNEL_CONFIG[selectedConv.channel]?.color || 'var(--status-info)',
                          }}
                        >
                          {selectedConv.channel}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className='flex-1 overflow-y-auto p-4 space-y-3'>
                    {msgsLoading ? (
                      <div className='flex items-center justify-center py-12'>
                        <Loader2 className='h-8 w-8 animate-spin text-[var(--brand)]' />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className='flex items-center justify-center py-12'>
                        <p className='text-body text-[var(--text-tertiary)]'>
                          Nessun messaggio in questa conversazione.
                        </p>
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
                            <div
                              className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                                msg.direction === 'OUTBOUND'
                                  ? 'bg-[var(--text-primary)] text-[var(--surface-tertiary)] rounded-br-md'
                                  : 'bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-bl-md'
                              }`}
                            >
                              <p className='text-body'>{msg.body}</p>
                              <div className={`flex items-center gap-1 mt-1 ${msg.direction === 'OUTBOUND' ? 'justify-end' : ''}`}>
                                <p className='text-footnote opacity-60'>
                                  {new Date(msg.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                {msg.direction === 'OUTBOUND' && StatusIcon && (
                                  <StatusIcon className='h-3 w-3 opacity-60' />
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className='p-4 border-t border-[var(--border-default)]'>
                    <div className='flex items-center gap-3'>
                      <input
                        placeholder='Scrivi un messaggio...'
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className='flex-1 h-10 px-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)]/5 text-body text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--border-default)]/30'
                      />
                      <AppleButton
                        variant='primary'
                        icon={sending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Send className='h-4 w-4' />}
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        loading={false}
                      >
                        Invia
                      </AppleButton>
                    </div>
                  </div>
                </>
              ) : (
                <div className='flex-1 flex flex-col items-center justify-center text-center'>
                  <MessageSquare className='h-12 w-12 text-[var(--text-tertiary)]/40 mb-4' />
                  <p className='text-title-2 font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Seleziona una conversazione
                  </p>
                  <p className='text-body text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-1'>
                    Scegli una conversazione dalla lista per visualizzare i messaggi
                  </p>
                </div>
              )}
            </div>
          </div>
        </AppleCard>
      </div>
    </div>
  );
}
