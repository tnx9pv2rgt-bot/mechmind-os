'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const steps = [
  {
    step: '1',
    title: 'Registra il cliente e il veicolo',
    description: 'Inserisci targa, dati cliente e storico. Il sistema cripta automaticamente i dati sensibili (GDPR).',
  },
  {
    step: '2',
    title: 'Crea l\'ordine di lavoro',
    description: 'Diagnosi, ricambi, manodopera: tutto tracciato. Assegna il tecnico e monitora in tempo reale.',
  },
  {
    step: '3',
    title: 'Fattura e incassa',
    description: 'Fattura elettronica SDI con un click. Pagamento via Stripe, bonifico o contanti. Tutto registrato.',
  },
] as const;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export default function Testimonials(): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="storie" className="bg-[var(--surface-secondary)] py-20 dark:bg-[var(--surface-secondary)] lg:py-28">
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
            Come funziona
          </h2>
          <p className="mt-4 text-lg text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
            Dall&apos;accettazione alla fattura in 3 passaggi
          </p>
        </motion.div>

        {/* Reason cards */}
        <motion.div
          ref={ref}
          className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {steps.map((step) => (
              <motion.div
                key={step.step}
                variants={cardVariants}
                className="rounded-2xl bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:bg-[var(--surface-elevated)]"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-lg font-bold text-[var(--text-primary)] dark:bg-[var(--surface-active)]">
                  {step.step}
                </div>
                <h3 className="mb-2 text-lg font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                  {step.description}
                </p>
              </motion.div>
            ))}
        </motion.div>
      </div>
    </section>
  );
}
