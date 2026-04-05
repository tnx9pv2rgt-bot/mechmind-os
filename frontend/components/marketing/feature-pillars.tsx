'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
const pillars = [
  {
    title: 'Gestisci',
    description: 'Ordini di lavoro, ispezioni, stati in tempo reale, timer tecnico, canned jobs.',
    bg: 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)]',
  },
  {
    title: 'Fattura',
    description: 'Fatturazione elettronica SDI, Text-to-Pay, pagamenti rateali, note di credito.',
    bg: 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)]',
  },
  {
    title: 'Prenota',
    description: 'Calendario, prenotazioni online 24/7, portale cliente, promemoria SMS automatici.',
    bg: 'bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)]',
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
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export function FeaturePillars(): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="funzionalita" className="bg-white py-20 dark:bg-[var(--surface-primary)] lg:py-28">
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
            Tutto ciò che serve alla tua officina.
            <br />
            <span className="text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Nient&apos;altro.</span>
          </h2>
        </motion.div>

        {/* 3 Pillar Cards */}
        <motion.div
          ref={ref}
          className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {pillars.map((pillar) => (
              <motion.div
                key={pillar.title}
                variants={cardVariants}
                className={`group relative overflow-hidden rounded-2xl ${pillar.bg} p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]`}
              >
                {/* Title */}
                <h3 className="mb-3 text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  {pillar.title}
                </h3>

                {/* Description */}
                <p className="mb-6 text-base leading-relaxed text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                  {pillar.description}
                </p>

                {/* Screenshot placeholder */}
                <div className="overflow-hidden rounded-xl border border-[var(--border-default)]/50 bg-white/60 dark:border-[var(--border-default)]/30 dark:bg-[var(--surface-primary)]/50">
                  <div className="aspect-[4/3] w-full bg-[var(--surface-secondary)] dark:bg-[var(--surface-secondary)]" />
                </div>

                {/* Link */}
                <a
                  href="#demo"
                  className="mt-5 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-[var(--text-primary)] transition-colors hover:text-[var(--text-primary)] dark:text-white dark:hover:text-white"
                >
                  Scopri &rarr;
                </a>
              </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
