'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'mechmind-mobile-banner-closed';

export function MobileBanner(): React.ReactElement {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // sessionStorage not available
    }
    const timer = setTimeout(() => setIsVisible(true), 60000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = (): void => {
    setIsVisible(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // sessionStorage not available
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#e5e5e5] bg-white px-4 py-3 shadow-lg dark:border-[#444654] dark:bg-[#2f2f2f] md:hidden"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center gap-3">
            <p className="flex-1 text-sm text-[#0d0d0d] dark:text-[#ececec]">
              <span className="font-medium">Guida gratis:</span> 5 errori da &euro;500/mese
            </p>
            <a
              href="/auth/register"
              className="shrink-0 rounded-lg bg-[#0d0d0d] dark:bg-white px-3 py-2 text-xs font-semibold text-white dark:text-[#0d0d0d]"
            >
              Scarica &rarr;
            </a>
            <button
              type="button"
              onClick={handleClose}
              className="shrink-0 flex h-11 w-11 items-center justify-center rounded-full text-[#8e8ea0] hover:text-[#6e6e80] hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Chiudi banner"
            >
              <span className="pointer-events-none" aria-hidden="true">✕</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
