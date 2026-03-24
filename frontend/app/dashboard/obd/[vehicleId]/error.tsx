'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { AppleButton } from '@/components/ui/apple-button';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] text-center p-8'>
      <AlertCircle className='h-12 w-12 text-red-400 mb-4' />
      <h2 className='text-title-3 font-semibold text-apple-dark dark:text-[#ececec] mb-2'>
        Errore nel caricamento
      </h2>
      <p className='text-body text-apple-gray dark:text-[#636366] mb-4'>
        Impossibile caricare i dati diagnostici del veicolo.
      </p>
      <AppleButton variant='secondary' icon={<RefreshCw className='h-4 w-4' />} onClick={reset}>
        Riprova
      </AppleButton>
    </div>
  );
}
