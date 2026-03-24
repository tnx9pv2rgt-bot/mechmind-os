'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';


const STORAGE_KEY = 'mechmind-exit-shown';

export function ExitIntent(): React.ReactElement {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleClose = useCallback((): void => {
    setIsVisible(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // sessionStorage not available
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 768) return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // sessionStorage not available
    }

    const handleMouseLeave = (e: MouseEvent): void => {
      if (e.clientY <= 0) setIsVisible(true);
    };

    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 10000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubmitted(true);
    setTimeout(() => handleClose(), 2000);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          <motion.div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#2f2f2f]"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full text-[#8e8ea0] transition-colors hover:bg-[#f7f7f8] hover:text-[#0d0d0d] dark:hover:bg-[#444654]"
              aria-label="Chiudi"
            >
              <span className="pointer-events-none" aria-hidden="true">&#10005;</span>
            </button>

            <div className="p-8 text-center">
              {!isSubmitted ? (
                <>
                  <h3 className="text-xl font-bold text-[#0d0d0d] dark:text-[#ececec]">
                    Aspetta! Prima di andare...
                  </h3>

                  <p className="mt-2 text-sm text-[#6e6e80] dark:text-[#8e8ea0]">
                    Scarica gratis: &ldquo;5 errori che costano &euro;500/mese alla tua officina&rdquo;
                  </p>
                  <p className="mt-1 text-xs text-[#8e8ea0]">
                    Guida pratica di 12 pagine con checklist operativa.
                  </p>

                  <form onSubmit={handleSubmit} className="mt-6">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="La tua email aziendale"
                      className="min-h-[44px] w-full rounded-xl border border-[#e5e5e5] bg-[#f7f7f8] px-4 py-3 text-center text-sm text-[#0d0d0d] outline-none placeholder:text-[#8e8ea0] dark:border-[#444654] dark:bg-[#212121] dark:text-[#ececec]"
                    />

                    <button
                      type="submit"
                      className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#0d0d0d] text-white dark:bg-white dark:text-[#0d0d0d] px-6 py-3 text-sm font-semibold transition-all hover:bg-[#2f2f2f] dark:hover:bg-[#e5e5e5] active:scale-[0.97]"
                    >
                      Scarica la guida gratis &rarr;
                    </button>

                    <label className="mt-4 inline-flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        checked={marketingConsent}
                        onChange={(e) => setMarketingConsent(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-[#e5e5e5] text-[#0d0d0d] focus:ring-[#0d0d0d]/20 dark:focus:ring-white/20"
                      />
                      <span className="text-xs text-[#8e8ea0]">
                        Accetto di ricevere aggiornamenti da MechMind (max 2 email/mese)
                      </span>
                    </label>
                  </form>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-4 w-full text-center text-sm text-[#8e8ea0] transition-colors hover:text-[#6e6e80]"
                  >
                    No grazie, voglio continuare &rarr;
                  </button>
                </>
              ) : (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#0d0d0d]/5 dark:bg-white/10">
                    <svg className="h-6 w-6 text-[#0d0d0d] dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-[#0d0d0d] dark:text-[#ececec]">
                    Fatto! Controlla la tua email.
                  </p>
                  <p className="mt-1 text-sm text-[#8e8ea0]">
                    La guida arriverà in pochi minuti.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
