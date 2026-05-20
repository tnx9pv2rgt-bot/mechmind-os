'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const steps = [
  {
    number: '1',
    title: 'Registrati',
    description: 'Email, nome, password. 30 secondi.',
    color: 'bg-[#0d0d0d]/5 dark:bg-[var(--surface-secondary)]/10 text-[var(--text-primary)] dark:text-[var(--text-on-brand)]',
  },
  {
    number: '2',
    title: 'Rispondi a 4 domande',
    description: 'Tipo, team, provenienza, priorità. 60 secondi.',
    color: 'bg-[#0d0d0d]/5 dark:bg-[var(--surface-secondary)]/10 text-[var(--text-primary)] dark:text-[var(--text-on-brand)]',
  },
  {
    number: '3',
    title: 'Gestisci l\'officina',
    description: 'Dashboard pronta, configurata per te.',
    color: 'bg-[#0d0d0d]/5 dark:bg-[var(--surface-secondary)]/10 text-[var(--text-primary)] dark:text-[var(--text-on-brand)]',
  },
] as const;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.2 } },
};

const stepVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export function HowItWorks(): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="come-funziona" className="bg-[var(--surface-secondary)] py-20 dark:bg-[var(--surface-secondary)] lg:py-28">
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
            Inizia in 3 passi. Sul serio.
          </h2>
        </motion.div>

        {/* Steps */}
        <motion.div
          ref={ref}
          className="relative mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {steps.map((step) => (
            <motion.div
              key={step.number}
              variants={stepVariants}
              className="relative flex flex-col items-center text-center md:items-center"
            >
              {/* Number circle */}
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold ${step.color}`}
              >
                {step.number}
              </div>

              {/* Title */}
              <h3 className="mt-5 text-lg font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                {step.title}
              </h3>

              {/* Description */}
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom text */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p className="text-base font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            Tempo totale: meno di 2 minuti.
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Nessuna installazione. Nessuna carta di credito.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
