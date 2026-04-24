'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
// VideoModal removed — video placeholder replaced with demo CTA

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
    <section className="relative overflow-hidden bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)]">
      {/* Subtle background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--surface-secondary)]/50 via-transparent to-transparent dark:from-[var(--surface-secondary)]/50"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-16 pt-16 text-center sm:pb-24 sm:pt-24 lg:px-8 lg:pb-32 lg:pt-28">
        {/* Headline */}
        <motion.h1
          className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-[var(--text-primary)] dark:text-[var(--text-primary)] sm:text-5xl lg:text-6xl"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0.1}
        >
          Il gestionale per officine{' '}
          <span className="text-[var(--text-primary)] dark:text-[var(--text-on-brand)] underline decoration-[var(--border-default)] dark:decoration-[var(--border-default)] underline-offset-4">
            che funziona davvero.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] sm:text-xl"
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
            className="inline-flex h-14 min-w-[220px] items-center justify-center gap-2.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-secondary)] px-8 text-base font-semibold text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--surface-secondary)] active:scale-[0.97] dark:border-[var(--border-default)] dark:bg-[var(--surface-elevated)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--surface-active)]"
          >
            Prova gratis &rarr;
          </Link>
          <button
            type="button"
            onClick={handleStartDemo}
            disabled={isDemoLoading}
            className="inline-flex h-14 min-w-[220px] items-center justify-center gap-2.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-secondary)] px-8 text-base font-medium text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--surface-secondary)] active:scale-[0.97] disabled:opacity-60 disabled:cursor-wait dark:border-[var(--border-default)] dark:bg-[var(--surface-elevated)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--surface-active)]"
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
          <p className="text-sm text-[var(--text-secondary)]">
            Nessuna carta richiesta &middot; Setup in 2 minuti
          </p>
          <button
            type="button"
            onClick={handleStartDemo}
            disabled={isDemoLoading}
            className="min-h-[44px] flex items-center text-sm font-medium text-[var(--text-tertiary)] underline decoration-[var(--border-default)] underline-offset-2 transition-colors hover:text-[var(--text-primary)] dark:text-[var(--text-secondary)] dark:decoration-[var(--border-default)] dark:hover:text-[var(--text-on-brand)]"
          >
            Prova la demo live &rarr;
          </button>
        </motion.div>

        {/* Dashboard visual */}
        <motion.div
          className="mx-auto mt-16 max-w-5xl"
          variants={scaleIn}
          initial="hidden"
          animate="visible"
        >
          <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-secondary)] shadow-2xl dark:border-[var(--border-default)] dark:bg-[var(--surface-elevated)]">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-[var(--border-default)] bg-[var(--surface-secondary)] px-4 py-3 dark:border-[var(--border-default)] dark:bg-[var(--surface-secondary)]">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="mx-auto flex h-7 w-56 items-center justify-center rounded-md bg-[var(--border-default)] dark:bg-[var(--border-default)]">
                <span className="text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                  app.mechmind.it/dashboard
                </span>
              </div>
            </div>

            {/* Real dashboard screenshot */}
            <Image
              src="/dashboard-preview.png"
              alt="Dashboard MechMind OS — gestionale officina"
              width={1440}
              height={900}
              className="w-full h-auto"
              priority
            />
          </div>
        </motion.div>

        {/* Social proof stats */}
        <motion.div
          className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1.0}
        >
          {[
            { value: '12.400+', label: 'Ordini di lavoro gestiti' },
            { value: '8.200+', label: 'Fatture SDI inviate' },
            { value: '99,9%', label: 'Uptime garantito' },
            { value: '45+', label: 'Officine in beta' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Trust badges */}
        <motion.div
          className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1.2}
        >
          {[
            { label: 'SDI', desc: 'Fatturazione elettronica' },
            { label: 'GDPR', desc: 'Dati protetti' },
            { label: 'EU', desc: 'Server in Europa' },
            { label: 'AES-256', desc: 'Crittografia' },
            { label: 'Stripe', desc: 'Pagamenti sicuri' },
          ].map((badge) => (
            <div
              key={badge.label}
              className="flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 py-1.5 dark:border-[var(--border-default)] dark:bg-[var(--surface-elevated)]"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--status-success-subtle)]0/10 dark:bg-[var(--status-success)]/10">
                <svg className="h-3 w-3 text-[var(--status-success)] dark:text-[var(--status-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-[var(--text-primary)]">{badge.label}</span>
              <span className="hidden text-xs text-[var(--text-tertiary)] sm:inline">{badge.desc}</span>
            </div>
          ))}
        </motion.div>

        {/* Beta testimonial */}
        <motion.div
          className="mx-auto mt-10 max-w-lg rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-5 dark:border-[var(--border-default)] dark:bg-[var(--surface-elevated)]"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1.4}
        >
          <p className="text-sm leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            &ldquo;Da quando usiamo MechMind, il tempo per fatturare si è dimezzato. La dashboard ci dà una visione chiara di tutto il lavoro in officina.&rdquo;
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand)]/10 text-xs font-bold text-[var(--brand)]">
              MR
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">Marco R.</p>
              <p className="text-[11px] text-[var(--text-tertiary)]">Titolare, Autofficina Rossi — Milano</p>
            </div>
          </div>
        </motion.div>
      </div>

    </section>
  );
}
