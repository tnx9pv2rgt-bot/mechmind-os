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
    <section id="prezzi" className="bg-white py-20 dark:bg-[#212121] lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-[#0d0d0d] dark:text-[#ececec] sm:text-4xl">
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
                  ? 'border-2 border-[#0d0d0d] dark:border-white bg-white shadow-xl dark:bg-[#2f2f2f]'
                  : 'border border-[#e5e5e5] bg-white dark:border-[#444654] dark:bg-[#2f2f2f]'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex rounded-full bg-[#0d0d0d] dark:bg-white px-4 py-1 text-xs font-semibold text-white dark:text-[#0d0d0d]">
                    {plan.badge}
                  </span>
                </div>
              )}

              <h3 className="text-lg font-bold text-[#0d0d0d] dark:text-[#ececec]">{plan.name}</h3>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-[#0d0d0d] dark:text-[#ececec]">
                  &euro;{plan.price}
                </span>
                <span className="text-sm text-[#8e8ea0]">/mese</span>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-0.5 h-5 w-5 shrink-0 text-[#0d0d0d] dark:text-white flex items-center justify-center text-sm font-bold">✓</span>
                    <span className="text-sm text-[#6e6e80] dark:text-[#ececec]">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/register"
                className={`mt-8 flex min-h-[44px] items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-all active:scale-[0.97] ${
                  plan.highlighted
                    ? 'bg-[#0d0d0d] dark:bg-white text-white dark:text-[#0d0d0d] hover:bg-[#2f2f2f] dark:hover:bg-[#e5e5e5]'
                    : 'border border-[#e5e5e5] bg-white text-[#0d0d0d] hover:bg-[#f7f7f8] dark:border-[#444654] dark:bg-[#2f2f2f] dark:text-[#ececec] dark:hover:bg-[#3a3a3a]'
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
          <p className="text-sm font-medium text-[#6e6e80] dark:text-[#8e8ea0]">
            14 giorni gratis &middot; Nessuna carta richiesta
          </p>
          <p className="mt-2 text-xs text-[#8e8ea0]">
            Tutti i piani includono: supporto italiano, aggiornamenti gratuiti, backup giornalieri
          </p>
          <p className="mt-4 text-sm text-[#6e6e80]">
            Hai più di 5 sedi?{' '}
            <a href="mailto:info@mechmind.it" className="min-h-[44px] inline-flex items-center font-medium text-[#0d0d0d] dark:text-white hover:text-[#2f2f2f] dark:hover:text-[#e5e5e5]">
              Contattaci &rarr;
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
