'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Building2,
  TrendingUp,
  Users,
  ArrowDownRight,
  UserPlus,
  Loader2,
  AlertTriangle,
  Search,
  MoreHorizontal,
  Ban,
  XCircle,
  RefreshCw,
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  mrr: number;
  createdAt: string;
  userCount: number;
}

interface TenantsResponse {
  data?: TenantInfo[];
  tenants?: TenantInfo[];
  stats?: {
    mrr: number;
    arr: number;
    churnRate: number;
    newSignups: number;
  };
}

const fetcher = (url: string): Promise<TenantsResponse> =>
  fetch(url).then(async (res) => {
    if (!res.ok) throw new Error('Errore caricamento');
    return res.json() as Promise<TenantsResponse>;
  });

export default function AdminSubscriptionsPage() {
  const { data, isLoading, error, mutate } = useSWR<TenantsResponse>(
    '/api/dashboard/admin/tenants',
    fetcher,
    { onError: () => toast.error('Errore caricamento tenant') }
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTenant, setSelectedTenant] = useState<TenantInfo | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'plan' | 'suspend' | 'cancel'>('plan');
  const [newPlan, setNewPlan] = useState('');
  const [processing, setProcessing] = useState(false);

  const tenants = data?.data || data?.tenants || [];
  const stats = data?.stats;

  const filteredTenants = tenants.filter((t) => {
    if (filterPlan !== 'all' && t.plan !== filterPlan) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleAction = async () => {
    if (!selectedTenant) return;
    setProcessing(true);
    try {
      const body: Record<string, string> = {};
      if (actionType === 'plan') body.plan = newPlan;
      if (actionType === 'suspend') body.status = 'SUSPENDED';
      if (actionType === 'cancel') body.status = 'CANCELLED';

      const res = await fetch(`/api/dashboard/admin/tenants`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: selectedTenant.id, ...body }),
      });
      if (!res.ok) throw new Error('Errore aggiornamento');
      toast.success('Tenant aggiornato con successo');
      setShowActionDialog(false);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore aggiornamento tenant');
    } finally {
      setProcessing(false);
    }
  };

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      FREE: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
      STARTER: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      PROFESSIONAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      ENTERPRISE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      TRIAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    };
    return <Badge className={`${colors[plan] || colors.FREE} border-0`}>{plan}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      TRIAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      SUSPENDED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      PAST_DUE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return <Badge className={`${colors[status] || colors.ACTIVE} border-0`}>{status}</Badge>;
  };

  // Loading
  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-apple-blue' />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center p-8'>
        <AppleCard className='max-w-md w-full'>
          <AppleCardContent className='text-center py-12'>
            <AlertTriangle className='w-12 h-12 text-red-400 mx-auto mb-4' />
            <h3 className='text-title-2 font-semibold text-apple-dark dark:text-[#ececec] mb-2'>
              Errore di caricamento
            </h3>
            <p className='text-body text-apple-gray dark:text-[#636366]'>
              Impossibile caricare i dati dei tenant.
            </p>
          </AppleCardContent>
        </AppleCard>
      </div>
    );
  }

  return (
    <div className='min-h-screen'>
      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-4 sm:px-8 py-5'>
          <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>Gestione Abbonamenti</h1>
          <p className='text-apple-gray dark:text-[#636366] text-body mt-1'>
            Amministrazione tenant e statistiche revenue
          </p>
        </div>
      </header>

      <div className='p-4 sm:p-8 max-w-7xl mx-auto space-y-6'>
        {/* Revenue Stats */}
        {stats && (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <AppleCard>
                <AppleCardContent>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center'>
                      <TrendingUp className='w-5 h-5 text-green-600' />
                    </div>
                    <div>
                      <p className='text-footnote text-apple-gray dark:text-[#636366]'>MRR</p>
                      <p className='text-title-2 font-bold text-apple-dark dark:text-[#ececec]'>
                        &euro;{stats.mrr.toLocaleString('it-IT')}
                      </p>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <AppleCard>
                <AppleCardContent>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center'>
                      <Building2 className='w-5 h-5 text-blue-600' />
                    </div>
                    <div>
                      <p className='text-footnote text-apple-gray dark:text-[#636366]'>ARR</p>
                      <p className='text-title-2 font-bold text-apple-dark dark:text-[#ececec]'>
                        &euro;{stats.arr.toLocaleString('it-IT')}
                      </p>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <AppleCard>
                <AppleCardContent>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center'>
                      <ArrowDownRight className='w-5 h-5 text-red-600' />
                    </div>
                    <div>
                      <p className='text-footnote text-apple-gray dark:text-[#636366]'>Churn Rate</p>
                      <p className='text-title-2 font-bold text-apple-dark dark:text-[#ececec]'>
                        {stats.churnRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <AppleCard>
                <AppleCardContent>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center'>
                      <UserPlus className='w-5 h-5 text-purple-600' />
                    </div>
                    <div>
                      <p className='text-footnote text-apple-gray dark:text-[#636366]'>Nuove iscrizioni</p>
                      <p className='text-title-2 font-bold text-apple-dark dark:text-[#ececec]'>
                        {stats.newSignups}
                      </p>
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          </div>
        )}

        {/* Filters */}
        <AppleCard>
          <AppleCardContent>
            <div className='flex flex-col sm:flex-row gap-3'>
              <div className='relative flex-1'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-apple-gray' />
                <Input
                  placeholder='Cerca tenant...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-10 h-11 rounded-xl'
                  aria-label='Cerca tenant'
                />
              </div>
              <Select value={filterPlan} onValueChange={setFilterPlan}>
                <SelectTrigger className='w-full sm:w-40 h-11 rounded-xl'>
                  <SelectValue placeholder='Piano' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Tutti i piani</SelectItem>
                  <SelectItem value='FREE'>Free</SelectItem>
                  <SelectItem value='STARTER'>Starter</SelectItem>
                  <SelectItem value='PROFESSIONAL'>Professional</SelectItem>
                  <SelectItem value='ENTERPRISE'>Enterprise</SelectItem>
                  <SelectItem value='TRIAL'>Trial</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className='w-full sm:w-40 h-11 rounded-xl'>
                  <SelectValue placeholder='Stato' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Tutti gli stati</SelectItem>
                  <SelectItem value='ACTIVE'>Attivo</SelectItem>
                  <SelectItem value='TRIAL'>Trial</SelectItem>
                  <SelectItem value='SUSPENDED'>Sospeso</SelectItem>
                  <SelectItem value='CANCELLED'>Cancellato</SelectItem>
                  <SelectItem value='PAST_DUE'>Scaduto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </AppleCardContent>
        </AppleCard>

        {/* Tenants Table */}
        <AppleCard>
          <AppleCardHeader>
            <div className='flex items-center justify-between'>
              <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec]'>
                Tenant ({filteredTenants.length})
              </h2>
              <AppleButton variant='ghost' size='sm' onClick={() => mutate()}>
                <RefreshCw className='w-4 h-4' />
              </AppleButton>
            </div>
          </AppleCardHeader>
          <AppleCardContent>
            {filteredTenants.length > 0 ? (
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b border-apple-border/30 dark:border-[#424242]'>
                      <th className='text-left py-3 px-4 text-footnote font-medium text-apple-gray uppercase tracking-wider'>Nome</th>
                      <th className='text-left py-3 px-4 text-footnote font-medium text-apple-gray uppercase tracking-wider'>Piano</th>
                      <th className='text-left py-3 px-4 text-footnote font-medium text-apple-gray uppercase tracking-wider'>Stato</th>
                      <th className='text-left py-3 px-4 text-footnote font-medium text-apple-gray uppercase tracking-wider'>MRR</th>
                      <th className='text-left py-3 px-4 text-footnote font-medium text-apple-gray uppercase tracking-wider'>Registrazione</th>
                      <th className='text-right py-3 px-4 text-footnote font-medium text-apple-gray uppercase tracking-wider'>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.map((tenant) => (
                      <tr
                        key={tenant.id}
                        className='border-b border-apple-border/20 dark:border-[#424242]/50 hover:bg-apple-light-gray/30 dark:hover:bg-[#353535] transition-colors'
                      >
                        <td className='py-3 px-4'>
                          <p className='text-body font-medium text-apple-dark dark:text-[#ececec]'>{tenant.name}</p>
                          <p className='text-footnote text-apple-gray dark:text-[#636366]'>{tenant.slug}</p>
                        </td>
                        <td className='py-3 px-4'>{getPlanBadge(tenant.plan)}</td>
                        <td className='py-3 px-4'>{getStatusBadge(tenant.status)}</td>
                        <td className='py-3 px-4 text-body font-semibold text-apple-dark dark:text-[#ececec]'>
                          &euro;{tenant.mrr.toLocaleString('it-IT')}
                        </td>
                        <td className='py-3 px-4 text-body text-apple-gray dark:text-[#636366]'>
                          {new Date(tenant.createdAt).toLocaleDateString('it-IT')}
                        </td>
                        <td className='py-3 px-4 text-right'>
                          <div className='flex items-center justify-end gap-1'>
                            <AppleButton
                              variant='ghost'
                              size='sm'
                              className='min-w-[44px] min-h-[44px]'
                              onClick={() => {
                                setSelectedTenant(tenant);
                                setActionType('plan');
                                setNewPlan(tenant.plan);
                                setShowActionDialog(true);
                              }}
                            >
                              <MoreHorizontal className='w-4 h-4' />
                            </AppleButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className='text-center py-12'>
                <Users className='w-12 h-12 text-apple-gray/30 mx-auto mb-4' />
                <p className='text-body text-apple-gray dark:text-[#636366]'>
                  Nessun tenant trovato con i filtri selezionati.
                </p>
              </div>
            )}
          </AppleCardContent>
        </AppleCard>
      </div>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'plan' ? 'Modifica Piano' : actionType === 'suspend' ? 'Sospendi Tenant' : 'Cancella Abbonamento'}
            </DialogTitle>
            <DialogDescription>
              {selectedTenant?.name}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            {actionType === 'plan' && (
              <div className='space-y-2'>
                <label htmlFor='plan-select' className='text-sm font-medium text-apple-dark dark:text-[#ececec]'>
                  Piano
                </label>
                <Select value={newPlan} onValueChange={setNewPlan}>
                  <SelectTrigger id='plan-select'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='FREE'>Free</SelectItem>
                    <SelectItem value='STARTER'>Starter</SelectItem>
                    <SelectItem value='PROFESSIONAL'>Professional</SelectItem>
                    <SelectItem value='ENTERPRISE'>Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className='flex gap-2'>
              {actionType === 'plan' && (
                <>
                  <AppleButton
                    variant='ghost'
                    className='text-orange-600'
                    onClick={() => setActionType('suspend')}
                  >
                    <Ban className='w-4 h-4 mr-2' />
                    Sospendi
                  </AppleButton>
                  <AppleButton
                    variant='ghost'
                    className='text-red-600'
                    onClick={() => setActionType('cancel')}
                  >
                    <XCircle className='w-4 h-4 mr-2' />
                    Cancella
                  </AppleButton>
                </>
              )}
            </div>

            {actionType !== 'plan' && (
              <div className='p-4 bg-red-50 dark:bg-red-900/20 rounded-xl'>
                <p className='text-sm text-red-700 dark:text-red-300'>
                  {actionType === 'suspend'
                    ? "Il tenant verr\u00e0 sospeso e non potr\u00e0 accedere alla piattaforma."
                    : "L'abbonamento verr\u00e0 cancellato definitivamente."}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <AppleButton variant='secondary' onClick={() => setShowActionDialog(false)}>
              Annulla
            </AppleButton>
            <AppleButton
              variant='primary'
              onClick={handleAction}
              disabled={processing}
              className={actionType !== 'plan' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {processing ? <Loader2 className='w-4 h-4 animate-spin' /> : 'Conferma'}
            </AppleButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
