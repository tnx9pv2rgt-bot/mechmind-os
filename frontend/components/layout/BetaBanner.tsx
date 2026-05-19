'use client';

import { useEffect, useState } from 'react';

export function BetaBanner(): React.ReactElement | null {
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    const dismissed = localStorage.getItem('mechmind-beta-banner-dismissed') === '1';
    setIsDismissed(dismissed);
  }, []);

  const handleDismiss = (): void => {
    localStorage.setItem('mechmind-beta-banner-dismissed', '1');
    setIsDismissed(true);
  };

  if (!isMounted || isDismissed) {
    return null;
  }

  return (
    <div className='w-full bg-[var(--brand)]/10 border-b border-[var(--brand)]/20 px-4 py-2'>
      <div className='flex items-center justify-between max-w-full'>
        <div className='flex-1 text-center text-footnote text-[var(--brand)]'>
          Beta Gratuita — 3 mesi senza costi. Feedback?{' '}
          <a
            href='mailto:beta@mechmind.it'
            className='underline underline-offset-2 hover:opacity-70 transition-opacity'
          >
            beta@mechmind.it
          </a>
        </div>
        <button
          onClick={handleDismiss}
          className='ml-4 px-2 py-1 rounded text-[var(--brand)] hover:bg-[var(--brand)]/10 transition-colors'
          aria-label='Chiudi banner'
        >
          ×
        </button>
      </div>
    </div>
  );
}
