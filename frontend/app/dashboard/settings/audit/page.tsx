'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  FileText,
  Loader2,
  AlertTriangle,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  User,
  Activity,
} from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, unknown> | null;
  ipAddress: string;
}

interface AuditResponse {
  data?: AuditEntry[];
  logs?: AuditEntry[];
  total?: number;
  page?: number;
  pageSize?: number;
}

const ACTION_TYPES = [
  { value: 'CREATE', label: 'Creazione' },
  { value: 'UPDATE', label: 'Modifica' },
  { value: 'DELETE', label: 'Eliminazione' },
  { value: 'LOGIN', label: 'Accesso' },
  { value: 'LOGOUT', label: 'Uscita' },
  { value: 'EXPORT', label: 'Esportazione' },
];

const RESOURCE_TYPES = [
  { value: 'customer', label: 'Clienti' },
  { value: 'vehicle', label: 'Veicoli' },
  { value: 'work-order', label: 'Ordini di Lavoro' },
  { value: 'invoice', label: 'Fatture' },
  { value: 'booking', label: 'Prenotazioni' },
  { value: 'user', label: 'Utenti' },
  { value: 'settings', label: 'Impostazioni' },
];

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterResource, setFilterResource] = useState('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', '20');
    if (filterUser) params.set('user', filterUser);
    if (filterAction !== 'all') params.set('action', filterAction);
    if (filterResource !== 'all') params.set('resource', filterResource);
    if (filterFrom) params.set('from', filterFrom);
    if (filterTo) params.set('to', filterTo);
    return `/api/dashboard/settings/audit?${params.toString()}`;
  }, [page, filterUser, filterAction, filterResource, filterFrom, filterTo]);

  const fetcher = (url: string): Promise<AuditResponse> =>
    fetch(url).then(async (res) => {
      if (!res.ok) throw new Error('Errore caricamento');
      return res.json() as Promise<AuditResponse>;
    });

  const { data, isLoading, error } = useSWR<AuditResponse>(
    buildUrl(),
    fetcher,
    { onError: () => toast.error('Errore caricamento audit log') }
  );

  const entries = data?.data || data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      LOGIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      LOGOUT: 'bg-apple-light-gray dark:bg-[var(--surface-hover)] text-apple-gray dark:text-[var(--text-secondary)]',
      EXPORT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    };
    const label = ACTION_TYPES.find((a) => a.value === action)?.label || action;
    return <Badge className={`${colors[action] || colors.UPDATE} border-0`}>{label}</Badge>;
  };

  // Loading
  if (isLoading && entries.length === 0) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-apple-blue' />
      </div>
    );
  }

  // Error
  if (error && entries.length === 0) {
    return (
      <div className='min-h-screen flex items-center justify-center p-8'>
        <AppleCard className='max-w-md w-full'>
          <AppleCardContent className='text-center py-12'>
            <AlertTriangle className='w-12 h-12 text-red-400 mx-auto mb-4' />
            <h3 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-2'>
              Errore di caricamento
            </h3>
            <p className='text-body text-apple-gray dark:text-[var(--text-secondary)]'>
              Impossibile caricare il registro di audit.
            </p>
          </AppleCardContent>
        </AppleCard>
      </div>
    );
  }

  return (
    <div className='min-h-screen'>
      <header>
        <div className='px-4 sm:px-8 py-5'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <div>
              <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>Registro Audit</h1>
              <p className='text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1'>
                Traccia tutte le azioni effettuate nel sistema
              </p>
            </div>
            <AppleButton variant='secondary'>
              <Download className='w-4 h-4 mr-2' />
              Esporta
            </AppleButton>
          </div>
        </div>
      </header>

      <div className='p-4 sm:p-8 max-w-7xl mx-auto space-y-6'>
        {/* Filters */}
        <AppleCard>
          <AppleCardContent>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-apple-gray' />
                <Input
                  placeholder='Filtra per utente...'
                  value={filterUser}
                  onChange={(e) => { setFilterUser(e.target.value); setPage(1); }}
                  className='pl-10 h-11 rounded-xl'
                  aria-label='Filtra per utente'
                />
              </div>
              <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPage(1); }}>
                <SelectTrigger className='h-11 rounded-xl'>
                  <SelectValue placeholder='Tipo azione' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Tutte le azioni</SelectItem>
                  {ACTION_TYPES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterResource} onValueChange={(v) => { setFilterResource(v); setPage(1); }}>
                <SelectTrigger className='h-11 rounded-xl'>
                  <SelectValue placeholder='Tipo risorsa' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Tutte le risorse</SelectItem>
                  {RESOURCE_TYPES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type='date'
                value={filterFrom}
                onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
                className='h-11 rounded-xl'
                aria-label='Data inizio'
              />
              <Input
                type='date'
                value={filterTo}
                onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
                className='h-11 rounded-xl'
                aria-label='Data fine'
              />
            </div>
          </AppleCardContent>
        </AppleCard>

        {/* Audit Table */}
        <AppleCard>
          <AppleCardHeader>
            <div className='flex items-center gap-3'>
              <FileText className='h-5 w-5 text-apple-blue' />
              <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]'>
                Log ({total})
              </h2>
            </div>
          </AppleCardHeader>
          <AppleCardContent>
            {entries.length > 0 ? (
              <>
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead>
                      <tr className='border-b border-apple-border/30 dark:border-[var(--border-default)]'>
                        <th className='text-left py-3 px-4 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'>Data/Ora</th>
                        <th className='text-left py-3 px-4 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'>Utente</th>
                        <th className='text-left py-3 px-4 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'>Azione</th>
                        <th className='text-left py-3 px-4 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'>Risorsa</th>
                        <th className='text-right py-3 px-4 text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'>Dettagli</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry, index) => (
                        <motion.tr
                          key={entry.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className='border-b border-apple-border/20 dark:border-[var(--border-default)]/50 hover:bg-apple-light-gray/30 dark:hover:bg-[var(--surface-hover)] transition-colors'
                        >
                          <td className='py-3 px-4'>
                            <div className='flex items-center gap-2'>
                              <Calendar className='w-3 h-3 text-apple-gray flex-shrink-0' />
                              <span className='text-body text-apple-dark dark:text-[var(--text-primary)] whitespace-nowrap'>
                                {new Date(entry.timestamp).toLocaleString('it-IT')}
                              </span>
                            </div>
                          </td>
                          <td className='py-3 px-4'>
                            <div className='flex items-center gap-2'>
                              <User className='w-3 h-3 text-apple-gray flex-shrink-0' />
                              <span className='text-body text-apple-dark dark:text-[var(--text-primary)]'>
                                {entry.userName}
                              </span>
                            </div>
                          </td>
                          <td className='py-3 px-4'>{getActionBadge(entry.action)}</td>
                          <td className='py-3 px-4'>
                            <div className='flex items-center gap-2'>
                              <Activity className='w-3 h-3 text-apple-gray flex-shrink-0' />
                              <span className='text-body text-apple-dark dark:text-[var(--text-primary)]'>
                                {RESOURCE_TYPES.find((r) => r.value === entry.resource)?.label || entry.resource}
                              </span>
                            </div>
                          </td>
                          <td className='py-3 px-4 text-right'>
                            <AppleButton
                              variant='ghost'
                              size='sm'
                              className='min-w-[44px] min-h-[44px]'
                              onClick={() => setSelectedEntry(entry)}
                            >
                              <Eye className='w-4 h-4' />
                            </AppleButton>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className='flex items-center justify-between mt-4 pt-4 border-t border-apple-border/20 dark:border-[var(--border-default)]/50'>
                    <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                      Pagina {page} di {totalPages}
                    </p>
                    <div className='flex gap-2'>
                      <AppleButton
                        variant='ghost'
                        size='sm'
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className='min-w-[44px] min-h-[44px]'
                      >
                        <ChevronLeft className='w-4 h-4' />
                      </AppleButton>
                      <AppleButton
                        variant='ghost'
                        size='sm'
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className='min-w-[44px] min-h-[44px]'
                      >
                        <ChevronRight className='w-4 h-4' />
                      </AppleButton>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className='text-center py-12'>
                <FileText className='w-12 h-12 text-apple-gray/30 mx-auto mb-4' />
                <h3 className='text-body font-medium text-apple-dark dark:text-[var(--text-primary)] mb-1'>
                  Nessun evento trovato
                </h3>
                <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                  Non ci sono eventi che corrispondono ai filtri selezionati.
                </p>
              </div>
            )}
          </AppleCardContent>
        </AppleCard>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>Dettagli Evento</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className='space-y-4 py-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>Data/Ora</p>
                  <p className='text-body text-apple-dark dark:text-[var(--text-primary)]'>
                    {new Date(selectedEntry.timestamp).toLocaleString('it-IT')}
                  </p>
                </div>
                <div>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>Utente</p>
                  <p className='text-body text-apple-dark dark:text-[var(--text-primary)]'>{selectedEntry.userName}</p>
                </div>
                <div>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>Azione</p>
                  {getActionBadge(selectedEntry.action)}
                </div>
                <div>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>Risorsa</p>
                  <p className='text-body text-apple-dark dark:text-[var(--text-primary)]'>
                    {selectedEntry.resource} ({selectedEntry.resourceId})
                  </p>
                </div>
                <div>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>IP</p>
                  <p className='text-body text-apple-dark dark:text-[var(--text-primary)] font-mono text-sm'>
                    {selectedEntry.ipAddress}
                  </p>
                </div>
              </div>
              {selectedEntry.details && (
                <div>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] mb-2'>Dettagli</p>
                  <pre className='p-4 bg-apple-light-gray/50 dark:bg-[var(--surface-hover)] rounded-xl text-sm overflow-auto max-h-60 text-apple-dark dark:text-[var(--text-primary)]'>
                    {JSON.stringify(selectedEntry.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
