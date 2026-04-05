'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

export function CtaSection(): React.ReactElement {
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  async function handleStartDemo(): Promise<void> {
    if (isDemoLoading) return;
    setIsDemoLoading(true);
    try {
      const res = await fetch('/api/auth/demo-session', { method: 'POST' });
      if (res.ok) {
        localStorage.setItem('mechmind_demo', 'true');
        localStorage.setItem('mechmind_demo_start', Date.now().toString());
        window.location.href = '/dashboard';
        return;
      }
      setIsDemoLoading(false);
    } catch {
      setIsDemoLoading(false);
    }
  }
  return (
    <section className="bg-white py-20 dark:bg-[var(--surface-primary)] lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl bg-[#0d0d0d] dark:bg-[var(--surface-secondary)]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {/* Decorative glows */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute left-1/4 top-0 h-[300px] w-[300px] rounded-full bg-white/10 blur-[100px]" />
            <div className="absolute bottom-0 right-1/4 h-[200px] w-[200px] rounded-full bg-white/5 blur-[80px]" />
          </div>

          <div className="relative z-10 px-8 py-16 text-center sm:px-16 sm:py-20">
            <motion.h2
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
              variants={fadeUp}
              custom={0}
            >
              Pronto a gestire la tua officina meglio?
            </motion.h2>

            <motion.p
              className="mt-4 text-lg text-white/60"
              variants={fadeUp}
              custom={0.1}
            >
              Inizia gratis in 2 minuti. Nessuna carta richiesta.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
              variants={fadeUp}
              custom={0.2}
            >
              <Link
                href="/auth/register"
                className="inline-flex h-14 min-w-[240px] items-center justify-center gap-2.5 rounded-full border border-white/20 px-8 text-base font-medium text-white transition-all duration-200 hover:bg-white/10 active:scale-[0.97]"
              >
                Prova gratis &rarr;
              </Link>
              <button
                type="button"
                onClick={handleStartDemo}
                disabled={isDemoLoading}
                className="inline-flex h-14 min-w-[240px] items-center justify-center gap-2.5 rounded-full border border-white/20 px-8 text-base font-medium text-white transition-all duration-200 hover:bg-white/10 active:scale-[0.97] disabled:opacity-60 disabled:cursor-wait"
              >
                {isDemoLoading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Caricamento...
                  </>
                ) : (
                  <>Avvia demo &rarr;</>
                )}
              </button>
            </motion.div>

            <motion.p
              className="mt-6 text-sm text-white/40"
              variants={fadeUp}
              custom={0.3}
            >
              Nessuna carta richiesta &middot; Nessuna registrazione per la demo
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
