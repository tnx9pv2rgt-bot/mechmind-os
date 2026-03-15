'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Euro, Clock, CheckCircle } from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Badge } from '@/components/ui/badge';

interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  total: number;
  status: string;
  createdAt: string;
  dueDate: string | null;
  paidAt: string | null;
  items: Array<{ description: string; qty: number; price: number }>;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'bg-gray-500', label: 'Bozza' },
  SENT: { color: 'bg-blue-500', label: 'Inviata' },
  PAID: { color: 'bg-green-500', label: 'Pagata' },
  OVERDUE: { color: 'bg-red-500', label: 'Scaduta' },
  CANCELLED: { color: 'bg-gray-400', label: 'Annullata' },
};

export default function PortalInvoicesPage() {
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/invoices')
      .then(res => res.json())
      .then(json => {
        const data = json.data || [];
        setInvoices(
          Array.isArray(data)
            ? data.map((inv: Record<string, unknown>) => ({
                id: (inv.id as string) || '',
                invoiceNumber: (inv.invoiceNumber as string) || '',
                total: Number(inv.total || 0),
                status: (inv.status as string) || 'DRAFT',
                createdAt: (inv.createdAt as string) || '',
                dueDate: (inv.dueDate as string) || null,
                paidAt: (inv.paidAt as string) || null,
                items:
                  (inv.items as Array<{ description: string; qty: number; price: number }>) || [],
              }))
            : []
        );
      })
      .catch(() => setInvoices([]))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className='w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full'
        />
      </div>
    );
  }

  const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.total, 0);
  const pendingCount = invoices.filter(i => i.status === 'SENT' || i.status === 'OVERDUE').length;

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-apple-dark dark:text-[#ececec]'>Le Mie Fatture</h1>
        <p className='text-apple-gray dark:text-[#636366] mt-1'>
          Visualizza e scarica le tue fatture
        </p>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <AppleCard>
          <AppleCardContent className='flex items-center gap-4'>
            <div className='w-12 h-12 rounded-2xl bg-apple-green flex items-center justify-center'>
              <Euro className='h-6 w-6 text-white' />
            </div>
            <div>
              <p className='text-title-1 font-semibold text-apple-dark dark:text-[#ececec]'>
                €{totalPaid.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
              <p className='text-sm text-apple-gray dark:text-[#636366]'>Totale Pagato</p>
            </div>
          </AppleCardContent>
        </AppleCard>
        <AppleCard>
          <AppleCardContent className='flex items-center gap-4'>
            <div className='w-12 h-12 rounded-2xl bg-apple-orange flex items-center justify-center'>
              <Clock className='h-6 w-6 text-white' />
            </div>
            <div>
              <p className='text-title-1 font-semibold text-apple-dark dark:text-[#ececec]'>
                {pendingCount}
              </p>
              <p className='text-sm text-apple-gray dark:text-[#636366]'>In Attesa</p>
            </div>
          </AppleCardContent>
        </AppleCard>
        <AppleCard>
          <AppleCardContent className='flex items-center gap-4'>
            <div className='w-12 h-12 rounded-2xl bg-apple-blue flex items-center justify-center'>
              <FileText className='h-6 w-6 text-white' />
            </div>
            <div>
              <p className='text-title-1 font-semibold text-apple-dark dark:text-[#ececec]'>
                {invoices.length}
              </p>
              <p className='text-sm text-apple-gray dark:text-[#636366]'>Totale Fatture</p>
            </div>
          </AppleCardContent>
        </AppleCard>
      </div>

      {/* Invoice List */}
      <AppleCard>
        <AppleCardHeader>
          <h2 className='text-lg font-semibold text-apple-dark dark:text-[#ececec]'>
            Storico Fatture
          </h2>
        </AppleCardHeader>
        <AppleCardContent>
          {invoices.length === 0 ? (
            <div className='text-center py-12'>
              <FileText className='h-12 w-12 text-apple-gray mx-auto mb-4' />
              <p className='text-apple-gray dark:text-[#636366]'>Nessuna fattura disponibile</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {invoices.map(invoice => {
                const status = statusConfig[invoice.status] || statusConfig.DRAFT;
                return (
                  <motion.div
                    key={invoice.id}
                    className='flex items-center justify-between p-4 rounded-2xl bg-apple-light-gray/30 dark:bg-[#353535] hover:bg-white dark:hover:bg-[#3a3a3a] transition-all'
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className='flex items-center gap-4'>
                      <div className='w-10 h-10 rounded-xl bg-apple-blue/10 flex items-center justify-center'>
                        <FileText className='h-5 w-5 text-apple-blue' />
                      </div>
                      <div>
                        <p className='font-semibold text-apple-dark dark:text-[#ececec]'>
                          {invoice.invoiceNumber}
                        </p>
                        <p className='text-sm text-apple-gray dark:text-[#636366]'>
                          {invoice.createdAt
                            ? new Date(invoice.createdAt).toLocaleDateString('it-IT')
                            : ''}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-4'>
                      <Badge className={`${status.color} text-white text-xs`}>{status.label}</Badge>
                      <p className='font-semibold text-apple-dark dark:text-[#ececec] min-w-[80px] text-right'>
                        €{invoice.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </p>
                      <AppleButton variant='ghost' size='sm'>
                        <Download className='h-4 w-4' />
                      </AppleButton>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AppleCardContent>
      </AppleCard>
    </div>
  );
}
