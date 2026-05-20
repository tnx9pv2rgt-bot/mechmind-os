'use client';

import { useState } from 'react';
import { useCreateCustomer } from '@/hooks/useApi';
import { Plus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AppleButton } from '@/components/ui/apple-button';
import { CustomerForm } from './customer-form';
import { cn } from '@/lib/utils';

interface CustomerDialogProps {
  onSuccess?: (customer: Record<string, unknown>) => void;
  trigger?: React.ReactNode;
  className?: string;
}

/**
 * Apple Design 2026 - Customer Dialog
 * Modal with Liquid Glass effect for creating new customers
 */
export function CustomerDialog({ onSuccess, trigger, className }: CustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const createCustomerMutation = useCreateCustomer();

  const handleSubmit = async (data: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const result = await createCustomerMutation.mutateAsync({
        firstName: String(data.nome || data.firstName || ''),
        lastName: String(data.cognome || data.lastName || ''),
        email: String(data.email || ''),
        phone: String(data.telefono || data.phone || ''),
        gdprConsent: true,
      });
      onSuccess?.({ ...data, id: result?.id });
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
            Nuovo Cliente
          </AppleButton>
        )}
      </DialogTrigger>

      <DialogContent
        className={cn(
          'max-w-2xl max-h-[90vh] overflow-y-auto p-0',
          'border-0 bg-[var(--surface-elevated)]',
          'backdrop-blur-2xl shadow-apple-xl',
          'rounded-[28px]'
        )}
      >
        <DialogHeader className='sr-only'>
          <DialogTitle>Nuovo Cliente</DialogTitle>
        </DialogHeader>

        <div className='p-6 md:p-8'>
          <CustomerForm onSubmit={handleSubmit} onCancel={handleCancel} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Inline trigger variant - for use in tables/lists
export function CustomerDialogInline({
  onSuccess,
  children,
}: {
  onSuccess?: (customer: Record<string, unknown>) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const createCustomerMutation = useCreateCustomer();

  const handleSubmit = async (data: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const result = await createCustomerMutation.mutateAsync({
        firstName: String(data.nome || data.firstName || ''),
        lastName: String(data.cognome || data.lastName || ''),
        email: String(data.email || ''),
        phone: String(data.telefono || data.phone || ''),
        gdprConsent: true,
      });
      onSuccess?.({ ...data, id: result?.id });
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
          'border-0 bg-[var(--surface-elevated)]',
          'backdrop-blur-2xl shadow-apple-xl',
          'rounded-[28px]'
        )}
      >
        <DialogHeader className='sr-only'>
          <DialogTitle>Nuovo Cliente</DialogTitle>
        </DialogHeader>

        <div className='p-6 md:p-8'>
          <CustomerForm onSubmit={handleSubmit} onCancel={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Success Toast Component
export function CustomerSuccessToast({
  customer,
  onClose,
}: {
  customer: Record<string, unknown>;
  onClose?: () => void;
}) {
  return (
    <div className='fixed bottom-6 right-6 z-50 animate-slide-up'>
      <div
        className={cn(
          'flex items-center gap-4 rounded-2xl p-4 pr-6',
          'bg-[var(--surface-elevated)]',
          'backdrop-blur-xl shadow-apple-xl',
          'border border-[var(--status-success)]/20'
        )}
      >
        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-[var(--status-success)] text-[var(--text-on-brand)]'>
          <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
          </svg>
        </div>
        <div>
          <p className='font-semibold text-[var(--text-primary)]'>Cliente creato!</p>
          <p className='text-sm text-[var(--text-secondary)]'>
            {String(customer.nome ?? '')} {String(customer.cognome ?? '')} è stato aggiunto
          </p>
        </div>
        <button
          onClick={onClose}
          className='ml-2 rounded-full p-1 hover:bg-[var(--surface-hover)]'
        >
          <X className='h-4 w-4 text-[var(--text-tertiary)]' />
        </button>
      </div>
    </div>
  );
}
