'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CookieConsentData {
  necessary: boolean;
  analytics: boolean;
  timestamp: string;
}

export function CookieConsent(): React.ReactNode {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = (): void => {
    localStorage.setItem(
      'cookie-consent',
      JSON.stringify({
        necessary: true,
        analytics: true,
        timestamp: new Date().toISOString(),
      } satisfies CookieConsentData)
    );
    setVisible(false);
  };

  const handleRejectOptional = (): void => {
    localStorage.setItem(
      'cookie-consent',
      JSON.stringify({
        necessary: true,
        analytics: false,
        timestamp: new Date().toISOString(),
      } satisfies CookieConsentData)
    );
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className='fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-slide-up'
      role='dialog'
      aria-label='Cookie consent'
    >
      <div className='max-w-2xl mx-auto bg-white/80 dark:bg-[#2f2f2f]/80 backdrop-blur-xl rounded-2xl shadow-apple-lg dark:shadow-none border border-apple-border/30 dark:border-[#424242] p-5'>
        <div className='flex flex-col gap-4'>
          <p className='text-[15px] leading-relaxed text-gray-700 dark:text-gray-300'>
            Utilizziamo cookie tecnici necessari per il funzionamento del servizio e cookie
            analitici per migliorare la tua esperienza. Per maggiori informazioni consulta la nostra{' '}
            <Link href='/privacy' className='text-[hsl(211,100%,45%)] hover:underline font-medium'>
              Informativa Privacy
            </Link>
            .
          </p>
          <div className='flex flex-col sm:flex-row gap-2 sm:justify-end'>
            <button
              onClick={handleRejectOptional}
              className='px-5 py-2.5 text-[15px] font-medium rounded-xl border border-apple-border/50 dark:border-[#525252] text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-[#3a3a3a] transition-all duration-200 ease-apple'
            >
              Solo necessari
            </button>
            <button
              onClick={handleAccept}
              className='px-5 py-2.5 text-[15px] font-medium rounded-xl bg-[hsl(211,100%,45%)] hover:bg-[hsl(211,100%,40%)] text-white transition-all duration-200 ease-apple shadow-sm'
            >
              Accetta tutti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CookieConsent;
