'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Plus } from 'lucide-react';
import { AppleButton } from '@/components/ui/apple-button';
import { PortalPageWrapper } from '@/components/portal';
import { WarrantyList, WarrantyStats } from '@/components/portal';
import { WarrantyInfo, Customer } from '@/lib/types/portal';

// ============================================
// MAIN COMPONENT
// ============================================

export default function PortalWarrantyPage() {
  const [warranties, setWarranties] = useState<WarrantyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/portal/warranty');

        if (!response.ok) {
          throw new Error(`Failed to load warranties (${response.status})`);
        }

        const result = await response.json();
        const data = (result.data || []) as WarrantyInfo[];
        setWarranties(data);
      } catch (err) {
        console.error('Warranty load error:', err);
        setError(err instanceof Error ? err.message : 'Errore nel caricamento delle garanzie');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const router = useRouter();

  const handleViewDetails = (id: string) => {
    router.push(`/portal/warranty/${id}`);
  };

  const handleFileClaim = (id: string) => {
    router.push(`/portal/warranty/${id}/claim`);
  };

  if (isLoading) {
    return (
      <PortalPageWrapper title='Garanzia' customer={customer || undefined}>
        <div className='flex items-center justify-center h-64'>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className='w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full'
          />
        </div>
      </PortalPageWrapper>
    );
  }

  if (error) {
    return (
      <PortalPageWrapper title='Garanzia' customer={customer || undefined}>
        <div className='text-center py-16'>
          <p className='text-apple-red mb-4'>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className='text-apple-blue hover:underline'
          >
            Riprova
          </button>
        </div>
      </PortalPageWrapper>
    );
  }

  return (
    <PortalPageWrapper
      title='Garanzie e Polizze'
      subtitle='Gestisci le garanzie dei tuoi veicoli'
      customer={customer || undefined}
    >
      {/* Stats */}
      <div className='mb-6'>
        <WarrantyStats warranties={warranties} />
      </div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='mb-6 p-5 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50'
      >
        <div className='flex items-start gap-4'>
          <div className='w-12 h-12 rounded-xl bg-white dark:bg-[#2f2f2f] flex items-center justify-center shadow-sm'>
            <Shield className='h-6 w-6 text-apple-blue' />
          </div>
          <div className='flex-1'>
            <h3 className='font-semibold text-apple-dark dark:text-[#ececec] mb-1'>
              Copertura Garanzia
            </h3>
            <p className='text-sm text-apple-gray dark:text-[#636366]'>
              Le garanzie coprono i difetti di fabbricazione e i guasti meccanici. Per i reclami,
              contattaci con il numero di polizza.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Warranties List */}
      <WarrantyList
        warranties={warranties}
        onViewDetails={handleViewDetails}
        onFileClaim={handleFileClaim}
      />
    </PortalPageWrapper>
  );
}
