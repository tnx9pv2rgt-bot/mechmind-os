'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
const pillars = [
  {
    title: 'Gestisci',
    description: 'Ordini di lavoro, ispezioni, stati in tempo reale, timer tecnico, canned jobs.',
    bg: 'bg-[#f7f7f8] dark:bg-[#2f2f2f]',
  },
  {
    title: 'Fattura',
    description: 'Fatturazione elettronica SDI, Text-to-Pay, pagamenti rateali, note di credito.',
    bg: 'bg-[#f7f7f8] dark:bg-[#2f2f2f]',
  },
  {
    title: 'Prenota',
    description: 'Calendario, prenotazioni online 24/7, portale cliente, promemoria SMS automatici.',
    bg: 'bg-[#f7f7f8] dark:bg-[#2f2f2f]',
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
    <section id="funzionalita" className="bg-white py-20 dark:bg-[#212121] lg:py-28">
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
            Tutto ciò che serve alla tua officina.
            <br />
            <span className="text-[#6e6e80] dark:text-[#8e8ea0]">Nient&apos;altro.</span>
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
                <h3 className="mb-3 text-xl font-bold text-[#0d0d0d] dark:text-[#ececec]">
                  {pillar.title}
                </h3>

                {/* Description */}
                <p className="mb-6 text-base leading-relaxed text-[#6e6e80] dark:text-[#8e8ea0]">
                  {pillar.description}
                </p>

                {/* Screenshot placeholder */}
                <div className="overflow-hidden rounded-xl border border-[#e5e5e5]/50 bg-white/60 dark:border-[#444654]/30 dark:bg-[#212121]/50">
                  <div className="aspect-[4/3] w-full bg-[#f7f7f8] dark:bg-[#171717]" />
                </div>

                {/* Link */}
                <a
                  href="#demo"
                  className="mt-5 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-[#0d0d0d] transition-colors hover:text-[#0d0d0d] dark:text-white dark:hover:text-white"
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
