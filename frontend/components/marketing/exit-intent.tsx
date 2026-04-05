'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';


const STORAGE_KEY = 'mechmind-exit-dismissed';
const DISMISS_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 giorni

export function ExitIntent(): React.ReactElement {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleClose = useCallback((): void => {
    setIsVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      // localStorage not available
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 768) return;
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed && Date.now() - parseInt(dismissed, 10) < DISMISS_EXPIRY_MS) return;
    } catch {
      // localStorage not available
    }

    let triggered = false;
    const handleMouseLeave = (e: MouseEvent): void => {
      if (e.clientY <= 0 && !triggered) {
        triggered = true;
        setIsVisible(true);
        document.removeEventListener('mouseleave', handleMouseLeave);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 60000);

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
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[var(--surface-elevated)]"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] dark:hover:bg-[var(--border-default)]"
              aria-label="Chiudi"
            >
              <span className="pointer-events-none" aria-hidden="true">&#10005;</span>
            </button>

            <div className="p-8 text-center">
              {!isSubmitted ? (
                <>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    Un regalo prima di andare
                  </h3>

                  <p className="mt-2 text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                    Guida gratuita: &ldquo;5 consigli per risparmiare nella gestione della tua officina&rdquo;
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    12 pagine pratiche con checklist operativa.
                  </p>

                  <form onSubmit={handleSubmit} className="mt-6">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="La tua email aziendale"
                      className="min-h-[44px] w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] px-4 py-3 text-center text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] dark:border-[var(--border-default)] dark:bg-[var(--surface-primary)] dark:text-[var(--text-primary)]"
                    />

                    <button
                      type="submit"
                      className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[var(--border-default)] bg-white px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--surface-secondary)] active:scale-[0.97] dark:border-[var(--border-default)] dark:bg-[var(--surface-elevated)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--surface-active)]"
                    >
                      Scarica la guida gratis &rarr;
                    </button>

                    <label className="mt-4 inline-flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        checked={marketingConsent}
                        onChange={(e) => setMarketingConsent(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-[var(--border-default)] text-[var(--text-primary)] focus:ring-[#0d0d0d]/20 dark:focus:ring-white/20"
                      />
                      <span className="text-xs text-[var(--text-secondary)]">
                        Accetto di ricevere aggiornamenti da MechMind (max 2 email/mese)
                      </span>
                    </label>
                  </form>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-4 w-full text-center text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-tertiary)]"
                  >
                    No grazie, voglio continuare &rarr;
                  </button>
                </>
              ) : (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#0d0d0d]/5 dark:bg-white/10">
                    <svg className="h-6 w-6 text-[var(--text-primary)] dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    Fatto! Controlla la tua email.
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
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
