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
// MOCK DATA
// ============================================

const mockWarranties: WarrantyInfo[] = [
  {
    id: 'w1',
    customerId: '1',
    vehicleId: 'v1',
    vehicle: {
      id: 'v1',
      customerId: '1',
      make: 'Volkswagen',
      model: 'Golf',
      year: 2020,
      licensePlate: 'AB123CD',
      mileage: 45000,
      fuelType: 'diesel',
    },
    warrantyType: 'manufacturer',
    provider: 'Volkswagen Italia',
    policyNumber: 'VW-2020-123456',
    startDate: new Date('2020-03-15'),
    endDate: new Date('2025-03-15'),
    coverageType: 'comprehensive',
    maxMileage: 100000,
    currentMileage: 45000,
    status: 'active',
    claims: [],
    documents: [],
  },
  {
    id: 'w2',
    customerId: '1',
    vehicleId: 'v1',
    vehicle: {
      id: 'v1',
      customerId: '1',
      make: 'Volkswagen',
      model: 'Golf',
      year: 2020,
      licensePlate: 'AB123CD',
      mileage: 45000,
      fuelType: 'diesel',
    },
    warrantyType: 'extended',
    provider: 'MechMind Protection',
    policyNumber: 'MM-EXT-789012',
    startDate: new Date('2025-03-15'),
    endDate: new Date('2028-03-15'),
    coverageType: 'powertrain',
    maxMileage: 150000,
    currentMileage: 45000,
    status: 'expiring_soon',
    claims: [
      {
        id: 'c1',
        warrantyId: 'w2',
        claimNumber: 'CLM-2024-001',
        description: 'Sostituzione alternatore',
        status: 'completed',
        filedAt: new Date('2024-01-15'),
        resolvedAt: new Date('2024-01-20'),
        amount: 450,
      },
    ],
    documents: [],
  },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function PortalWarrantyPage() {
  const [warranties, setWarranties] = useState<WarrantyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const currentCustomer = null; // TODO: Get from auth context
      setCustomer(currentCustomer);

      setTimeout(() => {
        setWarranties(mockWarranties);
        setIsLoading(false);
      }, 500);
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
