'use client';

import { AlertCircle } from 'lucide-react';
import { AppleButton } from '@/components/ui/apple-button';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className='flex flex-col items-center justify-center py-24 text-center'>
      <AlertCircle className='h-12 w-12 text-apple-red/40 mb-4' />
      <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-2'>
        Si è verificato un errore
      </h2>
      <p className='text-body text-apple-gray dark:text-[var(--text-secondary)] max-w-md'>
        {error.message || 'Qualcosa è andato storto. Riprova.'}
      </p>
      <AppleButton variant='ghost' className='mt-6' onClick={reset}>
        Riprova
      </AppleButton>
    </div>
  );
}
