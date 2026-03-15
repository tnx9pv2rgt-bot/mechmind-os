'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Car, Clock, CheckCircle, AlertTriangle, Package } from 'lucide-react';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { Badge } from '@/components/ui/badge';

interface PortalRepair {
  id: string;
  woNumber: string;
  status: string;
  vehicleMake: string;
  vehicleModel: string;
  vehiclePlate: string;
  diagnosis: string | null;
  customerRequest: string | null;
  mileageIn: number | null;
  laborCost: number | null;
  partsCost: number | null;
  totalCost: number | null;
  actualStartTime: string | null;
  actualCompletionTime: string | null;
  createdAt: string;
}

const statusConfig: Record<string, { color: string; label: string; icon: typeof Wrench }> = {
  OPEN: { color: 'bg-gray-500', label: 'Aperto', icon: Clock },
  PENDING: { color: 'bg-gray-500', label: 'In Attesa', icon: Clock },
  IN_PROGRESS: { color: 'bg-blue-500', label: 'In Lavorazione', icon: Wrench },
  WAITING_PARTS: { color: 'bg-orange-500', label: 'Attesa Ricambi', icon: Package },
  READY: { color: 'bg-green-500', label: 'Pronto', icon: CheckCircle },
  COMPLETED: { color: 'bg-purple-500', label: 'Completato', icon: CheckCircle },
  INVOICED: { color: 'bg-teal-500', label: 'Fatturato', icon: CheckCircle },
};

export default function PortalRepairsPage() {
  const [repairs, setRepairs] = useState<PortalRepair[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/repairs')
      .then(res => res.json())
      .then(json => {
        const data = json.data || [];
        setRepairs(
          Array.isArray(data)
            ? data.map((wo: Record<string, unknown>) => ({
                id: (wo.id as string) || '',
                woNumber: (wo.woNumber as string) || '',
                status: (wo.status as string) || 'OPEN',
                vehicleMake: ((wo.vehicle as Record<string, unknown>)?.make as string) || '',
                vehicleModel: ((wo.vehicle as Record<string, unknown>)?.model as string) || '',
                vehiclePlate:
                  ((wo.vehicle as Record<string, unknown>)?.licensePlate as string) || '',
                diagnosis: (wo.diagnosis as string) || null,
                customerRequest: (wo.customerRequest as string) || null,
                mileageIn: (wo.mileageIn as number) || null,
                laborCost: Number(wo.laborCost || 0) || null,
                partsCost: Number(wo.partsCost || 0) || null,
                totalCost: Number(wo.totalCost || 0) || null,
                actualStartTime: (wo.actualStartTime as string) || null,
                actualCompletionTime: (wo.actualCompletionTime as string) || null,
                createdAt: (wo.createdAt as string) || '',
              }))
            : []
        );
      })
      .catch(() => setRepairs([]))
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

  const activeRepairs = repairs.filter(r =>
    ['OPEN', 'PENDING', 'IN_PROGRESS', 'WAITING_PARTS'].includes(r.status)
  );
  const completedRepairs = repairs.filter(r =>
    ['READY', 'COMPLETED', 'INVOICED'].includes(r.status)
  );

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-apple-dark dark:text-[#ececec]'>
          Stato Riparazioni
        </h1>
        <p className='text-apple-gray dark:text-[#636366] mt-1'>
          Segui lo stato delle riparazioni in tempo reale
        </p>
      </div>

      {/* Active Repairs */}
      {activeRepairs.length > 0 && (
        <div className='space-y-4'>
          <h2 className='text-lg font-semibold text-apple-dark dark:text-[#ececec]'>
            Riparazioni Attive
          </h2>
          {activeRepairs.map(repair => {
            const status = statusConfig[repair.status] || statusConfig.OPEN;
            const StatusIcon = status.icon;
            return (
              <motion.div
                key={repair.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AppleCard>
                  <AppleCardContent>
                    <div className='flex items-start justify-between mb-4'>
                      <div className='flex items-center gap-3'>
                        <div className='w-12 h-12 rounded-2xl bg-apple-blue/10 flex items-center justify-center'>
                          <Wrench className='h-6 w-6 text-apple-blue' />
                        </div>
                        <div>
                          <p className='font-semibold text-apple-dark dark:text-[#ececec]'>
                            {repair.woNumber}
                          </p>
                          <p className='text-sm text-apple-gray dark:text-[#636366]'>
                            <Car className='h-3 w-3 inline mr-1' />
                            {repair.vehicleMake} {repair.vehicleModel} • {repair.vehiclePlate}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${status.color} text-white`}>
                        <StatusIcon className='h-3 w-3 mr-1' />
                        {status.label}
                      </Badge>
                    </div>

                    {repair.diagnosis && (
                      <div className='mb-3 p-3 bg-apple-light-gray/30 dark:bg-[#353535] rounded-xl'>
                        <p className='text-xs text-apple-gray dark:text-[#636366] mb-1'>Diagnosi</p>
                        <p className='text-sm text-apple-dark dark:text-[#ececec]'>
                          {repair.diagnosis}
                        </p>
                      </div>
                    )}

                    {repair.totalCost !== null && repair.totalCost > 0 && (
                      <div className='flex items-center justify-between pt-3 border-t border-apple-border/20 dark:border-[#424242]'>
                        <span className='text-sm text-apple-gray dark:text-[#636366]'>
                          Costo Stimato
                        </span>
                        <span className='font-semibold text-apple-dark dark:text-[#ececec]'>
                          €{repair.totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Completed */}
      {completedRepairs.length > 0 && (
        <div className='space-y-4'>
          <h2 className='text-lg font-semibold text-apple-dark dark:text-[#ececec]'>Completate</h2>
          {completedRepairs.map(repair => {
            const status = statusConfig[repair.status] || statusConfig.COMPLETED;
            return (
              <AppleCard key={repair.id}>
                <AppleCardContent>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <CheckCircle className='h-5 w-5 text-apple-green' />
                      <div>
                        <p className='font-medium text-apple-dark dark:text-[#ececec]'>
                          {repair.woNumber} — {repair.vehicleMake} {repair.vehicleModel}
                        </p>
                        <p className='text-sm text-apple-gray dark:text-[#636366]'>
                          {repair.actualCompletionTime
                            ? `Completato il ${new Date(repair.actualCompletionTime).toLocaleDateString('it-IT')}`
                            : ''}
                        </p>
                      </div>
                    </div>
                    <div className='text-right'>
                      <Badge className={`${status.color} text-white text-xs`}>{status.label}</Badge>
                      {repair.totalCost !== null && repair.totalCost > 0 && (
                        <p className='text-sm font-semibold mt-1'>
                          €{repair.totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>
                </AppleCardContent>
              </AppleCard>
            );
          })}
        </div>
      )}

      {repairs.length === 0 && (
        <AppleCard>
          <AppleCardContent className='text-center py-12'>
            <Wrench className='h-12 w-12 text-apple-gray mx-auto mb-4' />
            <p className='text-apple-gray dark:text-[#636366]'>Nessuna riparazione in corso</p>
          </AppleCardContent>
        </AppleCard>
      )}
    </div>
  );
}
