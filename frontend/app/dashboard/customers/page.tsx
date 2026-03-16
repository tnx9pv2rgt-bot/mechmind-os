'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Star,
  TrendingUp,
  Gift,
  Download,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useCustomers, useGdprExport, useGdprDelete } from '@/hooks/useApi';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const loyaltyColors: Record<string, string> = {
  Bronze: 'bg-amber-700',
  Silver: 'bg-slate-400',
  Gold: 'bg-amber-400',
  Platinum: 'bg-gradient-to-r from-slate-300 to-white',
};

function GdprDeleteDialog({
  customerName,
  customerId,
  onClose,
}: {
  customerName: string;
  customerId: string;
  onClose: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const gdprDelete = useGdprDelete();

  const expectedText = `ELIMINA ${customerName.toUpperCase()}`;
  const canDelete = confirmText === expectedText;

  return (
    <div
      className='fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm'
      role='dialog'
      aria-modal='true'
      aria-label='Elimina dati cliente'
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className='bg-white dark:bg-[#2f2f2f] rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4'
      >
        <div className='flex items-center gap-3 mb-4'>
          <div className='w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center'>
            <AlertTriangle className='h-6 w-6 text-red-600 dark:text-red-400' />
          </div>
          <div>
            <h3 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec] dark:text-[#ececec]'>
              Elimina dati cliente
            </h3>
            <p className='text-footnote text-apple-gray dark:text-[#636366]'>
              Azione irreversibile — GDPR Art. 17
            </p>
          </div>
        </div>

        <p className='text-body text-apple-gray dark:text-[#636366] mb-4'>
          Tutti i dati personali di <strong>{customerName}</strong> verranno eliminati
          permanentemente. Questa azione non può essere annullata.
        </p>

        <div className='mb-4'>
          <label className='text-caption text-apple-gray dark:text-[#636366] dark:text-[#636366] uppercase tracking-wider block mb-1'>
            Digita <strong>{expectedText}</strong> per confermare
          </label>
          <Input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder={expectedText}
            className='h-12 rounded-xl border-2 border-red-200 dark:border-red-700/30 bg-white dark:bg-[#2f2f2f] text-gray-900 dark:text-[#ececec] focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30'
          />
        </div>

        <div className='flex gap-3'>
          <AppleButton variant='secondary' className='flex-1' onClick={onClose}>
            Annulla
          </AppleButton>
          <AppleButton
            className='flex-1 bg-red-600 hover:bg-red-700'
            disabled={!canDelete || gdprDelete.isPending}
            onClick={async () => {
              await gdprDelete.mutateAsync(customerId);
              onClose();
            }}
          >
            <Trash2 className='h-4 w-4 mr-2' />
            {gdprDelete.isPending ? 'Eliminazione...' : 'Elimina'}
          </AppleButton>
        </div>
      </motion.div>
    </div>
  );
}

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const {
    data: customersData,
    isLoading,
    error,
  } = useCustomers({ search: searchQuery || undefined });
  const gdprExport = useGdprExport();

  const customers = customersData?.data ?? [];
  const total = customersData?.total ?? 0;

  return (
    <div>
      {deleteTarget && (
        <GdprDeleteDialog
          customerName={deleteTarget.name}
          customerId={deleteTarget.id}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      <header className='bg-white/80 dark:bg-[#212121]/80 backdrop-blur-apple border-b border-apple-border/20 dark:border-[#424242]/50'>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div>
            <h1 className='text-headline text-apple-dark dark:text-[#ececec]'>Clienti</h1>
            <p className='text-apple-gray dark:text-[#636366] text-body mt-1'>
              Gestisci il tuo database clienti
            </p>
          </div>
          <Link href='/dashboard/customers/new'>
            <AppleButton icon={<Plus className='h-4 w-4' />}>Nuovo Cliente</AppleButton>
          </Link>
        </div>
      </header>

      <div className='p-8 space-y-6'>
        {/* Stats */}
        <motion.div
          variants={containerVariants}
          initial='hidden'
          animate='visible'
          className='grid grid-cols-1 sm:grid-cols-4 gap-bento'
        >
          {[
            {
              label: 'Clienti Totali',
              value: isLoading ? '—' : String(total),
              icon: Users,
              color: 'bg-apple-blue',
            },
            {
              label: 'Nuovi questo mese',
              value: isLoading ? '—' : '—',
              icon: TrendingUp,
              color: 'bg-apple-green',
            },
            {
              label: 'Clienti VIP',
              value: isLoading ? '—' : '—',
              icon: Star,
              color: 'bg-apple-purple',
            },
            {
              label: 'Programma Fedeltà',
              value: isLoading ? '—' : '—',
              icon: Gift,
              color: 'bg-apple-orange',
            },
          ].map(stat => (
            <motion.div key={stat.label} variants={cardVariants}>
              <AppleCard>
                <AppleCardContent className='flex items-center gap-4'>
                  <div
                    className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center`}
                  >
                    <stat.icon className='h-6 w-6 text-white' />
                  </div>
                  <div>
                    <p className='text-apple-gray dark:text-[#636366] text-sm'>{stat.label}</p>
                    <p className='text-title-1 font-semibold text-apple-dark dark:text-[#ececec]'>
                      {stat.value}
                    </p>
                  </div>
                </AppleCardContent>
              </AppleCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div variants={cardVariants} initial='hidden' animate='visible'>
          <AppleCard>
            <AppleCardContent>
              <div className='relative'>
                <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-apple-gray' />
                <Input
                  placeholder='Cerca clienti per nome, email o telefono...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className='pl-12 h-12 rounded-xl border-2 border-black dark:border-[#424242] bg-white dark:bg-[#2f2f2f] text-gray-900 dark:text-[#ececec] placeholder:text-gray-400 dark:placeholder:text-[#6e6e6e] focus:border-black dark:focus:border-[#ececec] focus:ring-2 focus:ring-gray-200 dark:focus:ring-[#424242]'
                />
              </div>
            </AppleCardContent>
          </AppleCard>
        </motion.div>

        {/* Customers Grid */}
        {isLoading ? (
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-bento'>
            {Array.from({ length: 6 }).map((_, i) => (
              <AppleCard key={i}>
                <AppleCardContent>
                  <div className='flex items-center gap-4 mb-4'>
                    <div className='w-14 h-14 rounded-full bg-gray-200 dark:bg-[#424242] animate-pulse' />
                    <div>
                      <div className='w-32 h-4 bg-gray-200 dark:bg-[#424242] rounded animate-pulse mb-2' />
                      <div className='w-16 h-3 bg-gray-200 dark:bg-[#424242] rounded animate-pulse' />
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <div className='w-full h-3 bg-gray-200 dark:bg-[#424242] rounded animate-pulse' />
                    <div className='w-3/4 h-3 bg-gray-200 dark:bg-[#424242] rounded animate-pulse' />
                  </div>
                </AppleCardContent>
              </AppleCard>
            ))}
          </div>
        ) : error ? (
          <div className='text-center py-12 text-apple-gray dark:text-[#636366]'>
            <Users className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <p>Impossibile caricare i clienti. Riprova.</p>
          </div>
        ) : customers.length === 0 ? (
          <div className='text-center py-12 text-apple-gray dark:text-[#636366]'>
            <Users className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <p>Nessun cliente trovato</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial='hidden'
            animate='visible'
            className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-bento'
          >
            {customers.map(customer => {
              const fullName = `${customer.firstName} ${customer.lastName}`;
              const initials = `${customer.firstName?.[0] || ''}${customer.lastName?.[0] || ''}`;
              return (
                <motion.div key={customer.id} variants={cardVariants}>
                  <AppleCard hover className='animate-fade-in'>
                    <AppleCardContent>
                      <div className='flex items-start justify-between mb-4'>
                        <div className='flex items-center gap-4'>
                          <div className='w-14 h-14 rounded-full bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center text-white font-semibold text-lg'>
                            {initials}
                          </div>
                          <div>
                            <h3 className='text-body font-semibold text-apple-dark dark:text-[#ececec]'>
                              {fullName}
                            </h3>
                            {customer.loyaltyTier && (
                              <>
                                <span
                                  className={`inline-block w-3 h-3 rounded-full ${loyaltyColors[customer.loyaltyTier] || 'bg-gray-300'} mt-1`}
                                />
                                <span className='text-footnote text-apple-gray dark:text-[#636366] ml-2'>
                                  {customer.loyaltyTier}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className='space-y-2 mb-4'>
                        <div className='flex items-center gap-2 text-footnote text-apple-gray dark:text-[#636366]'>
                          <Mail className='h-4 w-4' />
                          <span className='truncate'>{customer.email}</span>
                        </div>
                        <div className='flex items-center gap-2 text-footnote text-apple-gray dark:text-[#636366]'>
                          <Phone className='h-4 w-4' />
                          <span>{customer.phone}</span>
                        </div>
                      </div>

                      <div className='grid grid-cols-3 gap-2 pt-4 border-t border-apple-border/20 dark:border-[#424242]'>
                        <div className='text-center'>
                          <p className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec]'>
                            {customer.vehicles?.length ?? 0}
                          </p>
                          <p className='text-caption text-apple-gray dark:text-[#636366]'>
                            Veicoli
                          </p>
                        </div>
                        <div className='text-center'>
                          <p className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec]'>
                            {customer.visitCount ?? 0}
                          </p>
                          <p className='text-caption text-apple-gray dark:text-[#636366]'>Visite</p>
                        </div>
                        <div className='text-center'>
                          <p className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec]'>
                            {customer.totalSpent
                              ? `€${customer.totalSpent.toLocaleString('it-IT')}`
                              : '—'}
                          </p>
                          <p className='text-caption text-apple-gray dark:text-[#636366]'>Totale</p>
                        </div>
                      </div>

                      {/* GDPR Actions + Detail */}
                      <div className='mt-4 pt-4 border-t border-apple-border/20 dark:border-[#424242] flex items-center justify-between'>
                        <div className='flex gap-2'>
                          <button
                            onClick={() => gdprExport.mutate(customer.id)}
                            disabled={gdprExport.isPending}
                            className='p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-apple-gray dark:text-[#636366] hover:text-apple-blue transition-colors'
                            title='Esporta dati (GDPR)'
                          >
                            <Download className='h-4 w-4' />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ id: customer.id, name: fullName })}
                            className='p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-apple-gray dark:text-[#636366] hover:text-red-600 transition-colors'
                            title='Elimina dati (GDPR Art. 17)'
                          >
                            <Trash2 className='h-4 w-4' />
                          </button>
                        </div>
                        <AppleButton variant='ghost' size='sm'>
                          Dettagli
                        </AppleButton>
                      </div>
                    </AppleCardContent>
                  </AppleCard>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
