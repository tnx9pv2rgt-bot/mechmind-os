'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useCreateVehicle, useCustomers } from '@/hooks/useApi';
import { VehicleForm } from '@/components/vehicles/vehicle-form';
import { VehicleFormData } from '@/components/vehicles/vehicle-form-schema';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';

export default function NewVehiclePage() {
  const router = useRouter();
  const { toast } = useToast();
  const createVehicle = useCreateVehicle();
  const { data: customersData } = useCustomers();
  const [isLoading, setIsLoading] = useState(false);

  const customers = (customersData?.data || []).map(
    (c: { id: string; firstName?: string; lastName?: string }) => ({
      id: c.id,
      name: [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Cliente senza nome',
    })
  );

  const handleSubmit = async (data: unknown) => {
    setIsLoading(true);
    try {
      const formData = data as VehicleFormData;
      await createVehicle.mutateAsync({
        customerId: formData.clienteId,
        licensePlate: formData.targa,
        make: formData.marca,
        model: formData.modello,
        year: formData.anno,
        mileage: formData.kmAttuali,
        vin: formData.vin,
        notes: formData.note,
        status: 'active',
      });
      toast({
        title: 'Veicolo creato',
        description: `${formData.marca} ${formData.modello} (${formData.targa}) registrato con successo`,
      });
      router.push('/dashboard/vehicles');
    } catch (err) {
      toast({
        title: 'Errore',
        description: err instanceof Error ? err.message : 'Errore durante la creazione',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 py-6 dark:bg-gray-900'>
      <div className='mx-auto max-w-4xl px-6'>
        {/* Breadcrumb */}
        <nav className='mb-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400'>
          <Link href='/dashboard' className='hover:text-gray-900 dark:hover:text-white'>
            Dashboard
          </Link>
          <span>/</span>
          <Link href='/dashboard/vehicles' className='hover:text-gray-900 dark:hover:text-white'>
            Veicoli
          </Link>
          <span>/</span>
          <span className='text-gray-900 dark:text-white'>Nuovo Veicolo</span>
        </nav>

        {/* Back Button */}
        <Link href='/dashboard/vehicles'>
          <Button variant='outline' size='sm' className='mb-6'>
            <ArrowLeft className='mr-2 h-4 w-4' />
            Torna alla lista
          </Button>
        </Link>

        {/* Vehicle Form */}
        <div className='rounded-xl border bg-white p-8 dark:bg-gray-800'>
          <h1 className='text-xl font-semibold text-gray-900 dark:text-white mb-6'>
            Nuovo Veicolo
          </h1>
          <VehicleForm
            onSubmit={handleSubmit}
            onCancel={() => router.push('/dashboard/vehicles')}
            customers={customers}
          />
        </div>
      </div>
    </div>
  );
}
