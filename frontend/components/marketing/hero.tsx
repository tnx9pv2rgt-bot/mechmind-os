'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { VideoModal } from './video-modal';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, delay: 0.8, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export function Hero(): React.ReactElement {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  async function handleStartDemo(): Promise<void> {
    if (isDemoLoading) return;
    setIsDemoLoading(true);
    try {
      const res = await fetch('/api/auth/demo-session', { method: 'POST' });
      if (res.ok) {
        localStorage.setItem('mechmind_demo', 'true');
        window.location.href = '/dashboard';
        return;
      }
      setIsDemoLoading(false);
    } catch {
      setIsDemoLoading(false);
    }
  }

  return (
    <section className="relative overflow-hidden bg-white dark:bg-[#212121]">
      {/* Subtle background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#f7f7f8]/50 via-transparent to-transparent dark:from-[#171717]/50"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-16 pt-16 text-center sm:pb-24 sm:pt-24 lg:px-8 lg:pb-32 lg:pt-28">
        {/* Headline */}
        <motion.h1
          className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-[#0d0d0d] dark:text-[#ececec] sm:text-5xl lg:text-6xl"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.1}
        >
          Il gestionale per officine{' '}
          <span className="text-[#0d0d0d] dark:text-white underline decoration-[#e5e5e5] dark:decoration-[#444654] underline-offset-4">
            che funziona davvero.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#6e6e80] dark:text-[#8e8ea0] sm:text-xl"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.25}
        >
          Ordini di lavoro, fatture, prenotazioni, clienti — tutto in un&apos;unica
          piattaforma pensata per l&apos;Italia.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.4}
        >
          <Link
            href="/auth/register"
            className="inline-flex h-14 min-w-[220px] items-center justify-center gap-2.5 rounded-full bg-[#0d0d0d] px-8 text-base font-semibold text-white transition-all duration-200 hover:bg-[#2f2f2f] dark:bg-white dark:text-[#0d0d0d] dark:hover:bg-[#e5e5e5] active:scale-[0.97]"
          >
            Prova gratis &rarr;
          </Link>
          <button
            type="button"
            onClick={handleStartDemo}
            disabled={isDemoLoading}
            className="inline-flex h-14 min-w-[220px] items-center justify-center gap-2.5 rounded-full border border-[#e5e5e5] bg-white px-8 text-base font-medium text-[#0d0d0d] transition-all duration-200 hover:bg-[#f7f7f8] active:scale-[0.97] disabled:opacity-60 disabled:cursor-wait dark:border-[#444654] dark:bg-[#2f2f2f] dark:text-[#ececec] dark:hover:bg-[#3a3a3a]"
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

        {/* Trust signals */}
        <motion.div
          className="mt-5 flex flex-col items-center gap-1"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.5}
        >
          <p className="text-sm text-[#8e8ea0]">
            Nessuna carta richiesta &middot; Setup in 2 minuti
          </p>
          <button
            type="button"
            onClick={() => setIsVideoOpen(true)}
            className="min-h-[44px] flex items-center text-sm font-medium text-[#6e6e80] underline decoration-[#e5e5e5] underline-offset-2 transition-colors hover:text-[#0d0d0d] dark:text-[#8e8ea0] dark:decoration-[#444654] dark:hover:text-white"
          >
            &#9654; Guarda il video (90s)
          </button>
        </motion.div>

        {/* Dashboard visual */}
        <motion.div
          className="mx-auto mt-16 max-w-5xl"
          variants={scaleIn}
          initial="hidden"
          animate="visible"
        >
          <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-2xl dark:border-[#444654] dark:bg-[#2f2f2f]">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-[#e5e5e5] bg-[#f7f7f8] px-4 py-3 dark:border-[#444654] dark:bg-[#171717]">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="mx-auto flex h-7 w-56 items-center justify-center rounded-md bg-[#e5e5e5] dark:bg-[#444654]">
                <span className="text-xs text-[#6e6e80] dark:text-[#8e8ea0]">
                  app.mechmind.it/dashboard
                </span>
              </div>
            </div>

            {/* Dashboard content */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#f7f7f8] dark:bg-[#212121]">
              <div className="absolute inset-0 p-5 sm:p-8">
                {/* Top bar */}
                <div className="mb-6 flex items-center justify-between">
                  <div className="h-4 w-32 rounded bg-[#e5e5e5] dark:bg-[#444654]" />
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-lg bg-[#e5e5e5] dark:bg-white/10" />
                    <div className="h-8 w-8 rounded-lg bg-[#f7f7f8] dark:bg-[#2f2f2f]" />
                  </div>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Fatturato', value: '€ 42.580', color: 'bg-[#0d0d0d] dark:bg-white', change: '+12%' },
                    { label: 'OdL Attivi', value: '23', color: 'bg-[#0d0d0d] dark:bg-white', change: '+5' },
                    { label: 'Prenotazioni', value: '18', color: 'bg-[#0d0d0d] dark:bg-white', change: 'Oggi' },
                    { label: 'Ticket medio', value: '€ 385', color: 'bg-[#0d0d0d] dark:bg-white', change: '+8%' },
                  ].map((kpi) => (
                    <div
                      key={kpi.label}
                      className="rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-[#2f2f2f] sm:p-4"
                    >
                      <div className={`mb-2 h-1.5 w-8 rounded-full ${kpi.color} opacity-50`} />
                      <p className="text-xs font-medium text-[#6e6e80] dark:text-[#8e8ea0]">{kpi.label}</p>
                      <p className="mt-1 text-sm font-bold text-[#0d0d0d] dark:text-[#ececec] sm:text-base">{kpi.value}</p>
                      <p className="mt-0.5 text-[10px] font-medium text-[#0d0d0d] dark:text-[#ececec]">{kpi.change}</p>
                    </div>
                  ))}
                </div>

                {/* Chart area */}
                <div className="mt-4 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-[#2f2f2f]">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="h-3 w-24 rounded bg-[#e5e5e5] dark:bg-[#444654]" />
                    <div className="flex gap-1">
                      <div className="h-5 w-12 rounded bg-[#e5e5e5] dark:bg-white/10" />
                      <div className="h-5 w-12 rounded bg-[#f7f7f8] dark:bg-[#2f2f2f]" />
                    </div>
                  </div>
                  <div className="flex h-20 items-end gap-1.5 sm:h-28">
                    {[40, 55, 45, 70, 60, 80, 65, 90, 75, 85, 50, 95].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-gradient-to-t from-[#0d0d0d]/20 to-[#0d0d0d]/5 dark:from-white/20 dark:to-white/5"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Table */}
                <div className="mt-4 hidden rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-[#2f2f2f] sm:block">
                  <div className="space-y-2.5">
                    {[
                      { plate: 'AB 123 CD', client: 'Marco R.', status: 'In lavorazione', statusColor: 'bg-amber-400' },
                      { plate: 'EF 456 GH', client: 'Laura B.', status: 'Completato', statusColor: 'bg-[#0d0d0d] dark:bg-white' },
                      { plate: 'IJ 789 KL', client: 'Giuseppe F.', status: 'In attesa ricambi', statusColor: 'bg-[#6e6e80]' },
                    ].map((row) => (
                      <div key={row.plate} className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${row.statusColor}`} />
                        <span className="w-20 text-xs font-mono text-[#6e6e80] dark:text-[#8e8ea0]">{row.plate}</span>
                        <span className="flex-1 text-xs text-[#8e8ea0]">{row.client}</span>
                        <span className="text-[10px] font-medium text-[#6e6e80] dark:text-[#8e8ea0]">{row.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Trust note */}
        <motion.div
          className="mt-12 flex flex-col items-center gap-2"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1.2}
        >
          <p className="text-sm font-medium text-[#6e6e80] dark:text-[#8e8ea0]">
            Progettato per officine meccaniche italiane
          </p>
          <p className="text-xs text-[#8e8ea0]">
            GDPR compliant &middot; Server in Europa &middot; Crittografia AES-256
          </p>
        </motion.div>
      </div>

      {/* Video Modal */}
      <VideoModal isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />
    </section>
  );
}
