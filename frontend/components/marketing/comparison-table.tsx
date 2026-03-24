'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';


const rows = [
  { without: 'Preventivi scritti a mano', withMM: 'Preventivo in 2 click' },
  { without: 'Fatture su Excel', withMM: 'Fattura SDI automatica' },
  { without: 'Appuntamenti su WhatsApp', withMM: 'Prenotazione online 24/7' },
  { without: '"Chi doveva richiamare?"', withMM: 'Promemoria SMS automatico' },
  { without: '"Quanto ho fatturato?"', withMM: 'Dashboard con KPI live' },
  { without: 'Carta e penna in officina', withMM: 'Tablet con tutto a portata' },
  { without: 'Cliente chiama per sapere lo stato', withMM: 'Portale tracking in tempo reale' },
] as const;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export function ComparisonTable(): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="confronto" className="bg-white py-20 dark:bg-[#212121] lg:py-28">
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
            Come cambia la tua giornata
          </h2>
        </motion.div>

        {/* Table */}
        <motion.div
          ref={ref}
          className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-[#e5e5e5] shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:border-[#444654]"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {/* Header row */}
          <div className="grid grid-cols-2">
            <div className="bg-red-50 px-6 py-4 dark:bg-red-950/20">
              <span className="text-sm font-bold uppercase tracking-wider text-red-500">
                Senza
              </span>
            </div>
            <div className="bg-[#0d0d0d]/5 px-6 py-4 dark:bg-white/10">
              <span className="text-sm font-bold uppercase tracking-wider text-[#0d0d0d] dark:text-white">
                Con MechMind
              </span>
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, i) => (
            <motion.div
              key={i}
              variants={rowVariants}
              className={`grid grid-cols-1 sm:grid-cols-2 ${
                i < rows.length - 1 ? 'border-b border-[#e5e5e5]/80 dark:border-[#444654]/50' : ''
              }`}
            >
              {/* Without */}
              <div className="flex items-start gap-3 border-b border-[#e5e5e5]/80 bg-white px-6 py-4 dark:border-[#444654]/50 dark:bg-[#2f2f2f] sm:border-b-0 sm:border-r">
                <span className="mt-0.5 shrink-0 text-red-400">✗</span>
                <span className="text-sm text-[#6e6e80] dark:text-[#8e8ea0]">{row.without}</span>
              </div>
              {/* With MechMind */}
              <div className="flex items-start gap-3 bg-white px-6 py-4 dark:bg-[#2f2f2f]/50">
                <span className="mt-0.5 shrink-0 text-[#0d0d0d] dark:text-white">✓</span>
                <span className="text-sm font-medium text-[#0d0d0d] dark:text-[#ececec]">{row.withMM}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
