'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Pagination } from '@/components/ui/pagination';
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

const colors = {
  bg: '#1a1a1a',
  surface: '#2f2f2f',
  surfaceHover: '#383838',
  border: '#4e4e4e',
  borderSubtle: '#3a3a3a',
  textPrimary: '#ffffff',
  textSecondary: '#b4b4b4',
  textTertiary: '#888888',
  textMuted: '#666666',
  accent: '#ffffff',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',
  purple: '#a78bfa',
  glow: 'rgba(255,255,255,0.03)',
  glowStrong: 'rgba(255,255,255,0.06)',
};

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
  SMS: { label: 'SMS', icon: MessageSquare, color: colors.info },
  WHATSAPP: { label: 'WhatsApp', icon: MessageSquare, color: colors.success },
  EMAIL: { label: 'Email', icon: Mail, color: colors.warning },
};

const STATUS_ICONS: Record<string, typeof Check> = {
  SENT: Check,
  DELIVERED: CheckCheck,
  READ: Eye,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
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
    <div className='min-h-screen' style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <header
        className='sticky top-0 z-30 backdrop-blur-xl border-b'
        style={{ backgroundColor: `${colors.bg}cc`, borderColor: colors.borderSubtle }}
      >
        <div className='px-8 py-5 flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Link href='/dashboard'>
              <button
                className='w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5'
                style={{ color: colors.textSecondary }}
              >
                <ArrowLeft className='h-5 w-5' />
              </button>
            </Link>
            <div>
              <h1 className='text-[28px] font-light' style={{ color: colors.textPrimary }}>
                Messaggistica
              </h1>
              <p className='text-[13px] mt-0.5' style={{ color: colors.textTertiary }}>
                Gestisci le conversazioni con i clienti
              </p>
            </div>
          </div>
          <button
            className='h-10 px-5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors hover:opacity-90'
            style={{ backgroundColor: colors.accent, color: colors.bg }}
          >
            <Plus className='h-4 w-4' />
            Nuovo Messaggio
          </button>
        </div>
      </header>

      <div className='p-8'>
        <div
          className='rounded-2xl border overflow-hidden'
          style={{ backgroundColor: colors.surface, borderColor: colors.borderSubtle }}
        >
          <div className='flex h-[calc(100vh-280px)] min-h-[500px]'>
            {/* Conversation List */}
            <div className={`${selectedConvId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r`} style={{ borderColor: colors.borderSubtle }}>
              {/* Search & Filters */}
              <div className='p-4 border-b space-y-3' style={{ borderColor: colors.borderSubtle }}>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4' style={{ color: colors.textMuted }} />
                  <input
                    placeholder='Cerca conversazione...'
                    aria-label='Cerca conversazioni'
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className='w-full pl-10 pr-4 h-10 rounded-xl border text-sm outline-none transition-colors focus:border-white/30'
                    style={{
                      backgroundColor: colors.glowStrong,
                      borderColor: colors.borderSubtle,
                      color: colors.textPrimary,
                    }}
                  />
                </div>
                <div className='flex items-center gap-2'>
                  <select
                    value={channelFilter}
                    onChange={e => setChannelFilter(e.target.value)}
                    className='text-xs h-8 px-3 rounded-full border outline-none'
                    style={{
                      backgroundColor: colors.glowStrong,
                      borderColor: colors.borderSubtle,
                      color: colors.textPrimary,
                    }}
                  >
                    <option value=''>Tutti i canali</option>
                    <option value='SMS'>SMS</option>
                    <option value='WHATSAPP'>WhatsApp</option>
                    <option value='EMAIL'>Email</option>
                  </select>
                  <button
                    onClick={() => setUnreadOnly(!unreadOnly)}
                    className='text-xs h-8 px-3 rounded-full border transition-colors'
                    style={{
                      borderColor: unreadOnly ? colors.accent : colors.borderSubtle,
                      backgroundColor: unreadOnly ? colors.accent : 'transparent',
                      color: unreadOnly ? colors.bg : colors.textTertiary,
                    }}
                  >
                    Solo non letti
                  </button>
                </div>
              </div>

              {/* Thread Items */}
              <div className='flex-1 overflow-y-auto'>
                {convsError ? (
                  <div className='flex flex-col items-center justify-center py-12 text-center px-4'>
                    <AlertCircle className='h-10 w-10 mb-3' style={{ color: colors.borderSubtle }} />
                    <p className='text-sm' style={{ color: colors.textTertiary }}>Impossibile caricare le conversazioni</p>
                    <button
                      className='mt-3 text-sm px-4 py-2 rounded-full transition-colors hover:bg-white/5'
                      style={{ color: colors.textSecondary }}
                      onClick={() => mutateConvs()}
                    >
                      Riprova
                    </button>
                  </div>
                ) : convsLoading ? (
                  <div className='flex items-center justify-center py-12'>
                    <Loader2 className='h-6 w-6 animate-spin' style={{ color: colors.textMuted }} />
                  </div>
                ) : filteredConvs.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-12 text-center px-4'>
                    <MessageSquare className='h-10 w-10 mb-3' style={{ color: colors.borderSubtle }} />
                    <p className='text-sm' style={{ color: colors.textTertiary }}>
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
                          variants={itemVariants}
                          onClick={() => setSelectedConvId(conv.id)}
                          className='flex items-center gap-3 p-4 cursor-pointer transition-colors border-b'
                          style={{
                            borderColor: colors.borderSubtle,
                            backgroundColor: isSelected ? colors.surfaceHover : 'transparent',
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = colors.surfaceHover; }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <div
                            className='w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0'
                            style={{ backgroundColor: `${colors.info}15` }}
                          >
                            <User className='h-5 w-5' style={{ color: colors.info }} />
                          </div>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center justify-between'>
                              <p className='text-sm font-medium truncate' style={{ color: colors.textPrimary }}>
                                {conv.customerName}
                              </p>
                              <div className='flex items-center gap-1.5'>
                                <ChannelIcon className='h-3 w-3' style={{ color: channelCfg.color }} />
                                {conv.unreadCount > 0 && (
                                  <span
                                    className='px-2 py-0.5 rounded-full text-[10px] font-bold'
                                    style={{ backgroundColor: colors.accent, color: colors.bg }}
                                  >
                                    {conv.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className='text-[13px] truncate' style={{ color: colors.textTertiary }}>
                              {conv.lastMessage}
                            </p>
                            <p className='text-[10px] mt-0.5' style={{ color: colors.textMuted }}>
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
            <div className={`${selectedConvId ? 'flex' : 'hidden md:flex'} flex-col flex-1`} style={{ backgroundColor: colors.bg }}>
              {selectedConvId && selectedConv ? (
                <>
                  {/* Thread Header */}
                  <div className='flex items-center gap-3 p-4 border-b' style={{ borderColor: colors.borderSubtle }}>
                    <button
                      className='md:hidden w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5'
                      onClick={() => setSelectedConvId(null)}
                      aria-label='Indietro'
                    >
                      <ArrowLeft className='h-5 w-5' style={{ color: colors.textPrimary }} />
                    </button>
                    <div
                      className='w-10 h-10 rounded-full flex items-center justify-center'
                      style={{ backgroundColor: `${colors.info}15` }}
                    >
                      <User className='h-5 w-5' style={{ color: colors.info }} />
                    </div>
                    <div className='flex-1'>
                      <p className='text-sm font-medium' style={{ color: colors.textPrimary }}>
                        {selectedConv.customerName}
                      </p>
                      <p className='text-[13px] flex items-center gap-2' style={{ color: colors.textTertiary }}>
                        <Phone className='h-3 w-3' />
                        {selectedConv.customerPhone}
                        <span
                          className='text-[10px] px-1.5 py-0.5 rounded-full font-medium'
                          style={{
                            backgroundColor: `${CHANNEL_CONFIG[selectedConv.channel]?.color || colors.info}18`,
                            color: CHANNEL_CONFIG[selectedConv.channel]?.color || colors.info,
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
                        <Loader2 className='h-6 w-6 animate-spin' style={{ color: colors.textMuted }} />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className='flex items-center justify-center py-12'>
                        <p className='text-sm' style={{ color: colors.textTertiary }}>
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
                              className='max-w-[75%] px-4 py-2.5 rounded-2xl'
                              style={msg.direction === 'OUTBOUND'
                                ? { backgroundColor: colors.accent, color: colors.bg, borderBottomRightRadius: '6px' }
                                : { backgroundColor: colors.surface, color: colors.textPrimary, borderBottomLeftRadius: '6px' }
                              }
                            >
                              <p className='text-sm'>{msg.body}</p>
                              <div className={`flex items-center gap-1 mt-1 ${msg.direction === 'OUTBOUND' ? 'justify-end' : ''}`}>
                                <p className='text-[10px]' style={{
                                  color: msg.direction === 'OUTBOUND' ? colors.textMuted : colors.textMuted,
                                }}>
                                  {new Date(msg.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                {msg.direction === 'OUTBOUND' && StatusIcon && (
                                  <StatusIcon className='h-3 w-3' style={{ color: colors.textMuted }} />
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
                  <div className='p-4 border-t' style={{ borderColor: colors.borderSubtle }}>
                    <div className='flex items-center gap-3'>
                      <input
                        placeholder='Scrivi un messaggio...'
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className='flex-1 h-10 px-4 rounded-xl border text-sm outline-none transition-colors focus:border-white/30'
                        style={{
                          backgroundColor: colors.glowStrong,
                          borderColor: colors.borderSubtle,
                          color: colors.textPrimary,
                        }}
                      />
                      <button
                        className='h-10 px-5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-40'
                        style={{ backgroundColor: colors.accent, color: colors.bg }}
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                      >
                        {sending ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <Send className='h-4 w-4' />
                        )}
                        Invia
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className='flex-1 flex flex-col items-center justify-center text-center'>
                  <MessageSquare className='h-16 w-16 mb-4' style={{ color: colors.borderSubtle }} />
                  <p className='text-base font-medium' style={{ color: colors.textPrimary }}>
                    Seleziona una conversazione
                  </p>
                  <p className='text-sm mt-1' style={{ color: colors.textTertiary }}>
                    Scegli una conversazione dalla lista per visualizzare i messaggi
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
