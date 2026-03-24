'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export function DemoBanner(): React.ReactElement | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isDemo = localStorage.getItem('mechmind_demo') === 'true';
    const isDismissed = sessionStorage.getItem('mechmind_demo_banner_dismissed') === 'true';
    setVisible(isDemo && !isDismissed);
  }, []);

  const handleDismiss = (): void => {
    sessionStorage.setItem('mechmind_demo_banner_dismissed', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-3 bg-[#2f2f2f] border-b border-[#4e4e4e] px-4 py-2.5 text-white shadow-md">
      <p className="text-sm font-normal">Stai usando la versione demo.</p>
      <Link
        href="/auth?tab=register"
        className="min-h-[44px] rounded-full bg-white px-4 py-1.5 text-sm font-normal text-[#0d0d0d] transition-colors hover:bg-[#e5e5e5] flex items-center"
      >
        Registrati per salvare i tuoi dati &rarr;
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        className="ml-2 flex h-[44px] w-[44px] items-center justify-center rounded-full transition-colors hover:bg-white/10"
        aria-label="Chiudi banner"
      >
        <span className="text-lg">&#10005;</span>
      </button>
    </div>
  );
}
