'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] gap-4'>
      <div className='w-12 h-12 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center'>
        <svg
          className='w-6 h-6 text-red-600 dark:text-red-400'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z'
          />
        </svg>
      </div>
      <h2 className='text-[17px] font-semibold text-[#1d1d1f] dark:text-white'>
        Errore nel caricamento cliente
      </h2>
      <p className='text-[15px] text-[#636366] dark:text-[#a1a1aa]'>
        {error.message || 'Si è verificato un errore imprevisto.'}
      </p>
      <button
        onClick={reset}
        className='px-4 py-2 bg-apple-blue text-white rounded-lg text-[15px] font-medium hover:bg-blue-600 transition-colors'
      >
        Riprova
      </button>
    </div>
  );
}
