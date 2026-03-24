import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className='flex items-center justify-center min-h-[60vh]'>
      <div className='flex flex-col items-center gap-3'>
        <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
        <p className='text-sm text-apple-gray dark:text-[#636366]'>Caricamento...</p>
      </div>
    </div>
  );
}
