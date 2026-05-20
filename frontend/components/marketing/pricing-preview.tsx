'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    highlighted: false,
    features: [
      '1 sede',
      '3 utenti',
      'Ordini di lavoro + Fatturazione',
      'SDI base',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    highlighted: true,
    badge: 'Più popolare',
    features: [
      'Fino a 5 sedi',
      '10 utenti',
      'Tutto incluso',
      'SDI + Marketing',
      'OBD + Analytics',
      'Portale cliente',
    ],
  },
] as const;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export function PricingPreview(): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="prezzi" className="bg-[var(--surface-secondary)] py-20 dark:bg-[var(--surface-primary)] lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] dark:text-[var(--text-primary)] sm:text-4xl">
            Un prezzo semplice. Niente sorprese.
          </h2>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          ref={ref}
          className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              variants={cardVariants}
              className={`relative flex flex-col rounded-2xl p-8 ${
                plan.highlighted
                  ? 'border-2 border-[#0d0d0d] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] shadow-xl dark:bg-[var(--surface-elevated)]'
                  : 'border border-[var(--border-default)] bg-[var(--surface-secondary)] dark:border-[var(--border-default)] dark:bg-[var(--surface-elevated)]'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex rounded-full bg-[var(--text-primary)] px-4 py-1 text-xs font-semibold text-[var(--text-on-brand)] dark:text-[#0d0d0d]">
                    {plan.badge}
                  </span>
                </div>
              )}

              <h3 className="text-lg font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{plan.name}</h3>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  &euro;{plan.price}
                </span>
                <span className="text-sm text-[var(--text-secondary)]">/mese</span>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-0.5 h-5 w-5 shrink-0 text-[var(--text-primary)] dark:text-[var(--text-on-brand)] flex items-center justify-center text-sm font-bold">✓</span>
                    <span className="text-sm text-[var(--text-tertiary)] dark:text-[var(--text-primary)]">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/register"
                className={`mt-8 flex min-h-[44px] items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-all active:scale-[0.97] ${
                  plan.highlighted
                    ? 'border border-[var(--border-default)] bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] dark:border-[var(--border-default)] dark:bg-[var(--surface-elevated)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--surface-active)]'
                    : 'border border-[var(--border-default)] bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] dark:border-[var(--border-default)] dark:bg-[var(--surface-elevated)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--surface-active)]'
                }`}
              >
                Inizia gratis
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom trust */}
        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <p className="text-sm font-medium text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
            14 giorni gratis &middot; Nessuna carta richiesta
          </p>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            Tutti i piani includono: supporto italiano, aggiornamenti gratuiti, backup giornalieri
          </p>
          <p className="mt-4 text-sm text-[var(--text-tertiary)]">
            Hai più di 5 sedi?{' '}
            <a href="mailto:info@mechmind.it" className="min-h-[44px] inline-flex items-center font-medium text-[var(--text-primary)] dark:text-[var(--text-on-brand)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-secondary)]">
              Contattaci &rarr;
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
