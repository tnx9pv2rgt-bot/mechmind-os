'use client';

import { useState } from 'react';
import { useCreateVehicle } from '@/hooks/useApi';
import { Plus, X, Car } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AppleButton } from '@/components/ui/apple-button';
import { VehicleForm } from './vehicle-form';
import { VehicleFormData } from './vehicle-form-schema';
import { cn } from '@/lib/utils';

interface VehicleDialogProps {
  onSuccess?: (vehicle: VehicleFormData) => void;
  trigger?: React.ReactNode;
  className?: string;
}

/**
 * Apple Design 2026 - Vehicle Dialog
 * Modal with Liquid Glass effect for creating new vehicles
 */
export function VehicleDialog({ onSuccess, trigger, className }: VehicleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const createVehicleMutation = useCreateVehicle();

  const handleSubmit = async (data: unknown) => {
    setIsLoading(true);
    try {
      const formData = data as VehicleFormData;
      await createVehicleMutation.mutateAsync({
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
      onSuccess?.(formData);
      setOpen(false);
    } catch {
      // Error handled by React Query
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <AppleButton variant='primary' icon={<Plus className='h-4 w-4' />} className={className}>
            Nuovo Veicolo
          </AppleButton>
        )}
      </DialogTrigger>

      <DialogContent
        className={cn(
          'max-w-2xl max-h-[90vh] overflow-y-auto p-0',
          'border-0 bg-white/80 dark:bg-gray-900/90',
          'backdrop-blur-2xl shadow-apple-xl',
          'rounded-[28px]'
        )}
      >
        <DialogHeader className='sr-only'>
          <DialogTitle>Nuovo Veicolo</DialogTitle>
        </DialogHeader>

        <div className='p-6 md:p-8'>
          <VehicleForm onSubmit={handleSubmit} onCancel={handleCancel} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Inline trigger variant - for use in tables/lists
export function VehicleDialogInline({
  onSuccess,
  children,
}: {
  onSuccess?: (vehicle: VehicleFormData) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const createVehicleMutation = useCreateVehicle();

  const handleSubmit = async (data: unknown) => {
    setIsLoading(true);
    try {
      const formData = data as VehicleFormData;
      await createVehicleMutation.mutateAsync({
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
      onSuccess?.(formData);
      setOpen(false);
    } catch {
      // Error handled by React Query
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        className={cn(
          'max-w-2xl max-h-[90vh] overflow-y-auto p-0',
          'border-0 bg-white/80 dark:bg-gray-900/90',
          'backdrop-blur-2xl shadow-apple-xl',
          'rounded-[28px]'
        )}
      >
        <DialogHeader className='sr-only'>
          <DialogTitle>Nuovo Veicolo</DialogTitle>
        </DialogHeader>

        <div className='p-6 md:p-8'>
          <VehicleForm onSubmit={handleSubmit} onCancel={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Quick Add Dialog - Minimal version for inline use
export function VehicleQuickAddDialog({
  onSuccess,
  customerId,
  children,
}: {
  onSuccess?: (vehicle: VehicleFormData) => void;
  customerId?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const createVehicleMutation = useCreateVehicle();

  const handleSubmit = async (data: unknown) => {
    setIsLoading(true);
    try {
      const formData = data as VehicleFormData;
      await createVehicleMutation.mutateAsync({
        customerId: formData.clienteId || customerId || '',
        licensePlate: formData.targa,
        make: formData.marca,
        model: formData.modello,
        year: formData.anno,
        mileage: formData.kmAttuali,
        vin: formData.vin,
        notes: formData.note,
        status: 'active',
      });
      onSuccess?.(formData);
      setOpen(false);
    } catch {
      // Error handled by React Query
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        className={cn(
          'max-w-2xl max-h-[90vh] overflow-y-auto p-0',
          'border-0 bg-white/80 dark:bg-gray-900/90',
          'backdrop-blur-2xl shadow-apple-xl',
          'rounded-[28px]'
        )}
      >
        <DialogHeader className='sr-only'>
          <DialogTitle>Aggiungi Veicolo</DialogTitle>
        </DialogHeader>

        <div className='p-6 md:p-8'>
          <VehicleForm
            initialData={{ customerId: customerId }}
            onSubmit={handleSubmit}
            onCancel={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Success Toast Component
export function VehicleSuccessToast({
  vehicle,
  onClose,
}: {
  vehicle: VehicleFormData;
  onClose?: () => void;
}) {
  return (
    <div className='fixed bottom-6 right-6 z-50 animate-slide-up'>
      <div
        className={cn(
          'flex items-center gap-4 rounded-2xl p-4 pr-6',
          'bg-white/90 dark:bg-gray-900/90',
          'backdrop-blur-xl shadow-apple-xl',
          'border border-green-200 dark:border-green-800'
        )}
      >
        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white'>
          <Car className='h-5 w-5' />
        </div>
        <div>
          <p className='font-semibold text-gray-900 dark:text-white'>Veicolo aggiunto!</p>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            {vehicle.marca} {vehicle.modello} ({vehicle.targa.toUpperCase()})
          </p>
        </div>
        <button
          onClick={onClose}
          className='ml-2 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800'
        >
          <X className='h-4 w-4 text-gray-400' />
        </button>
      </div>
    </div>
  );
}
