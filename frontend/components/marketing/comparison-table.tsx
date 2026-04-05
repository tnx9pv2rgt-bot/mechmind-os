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
    <section id="confronto" className="py-20 lg:py-28" style={{ background: '#2a2a2a' }}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: '#ffffff' }}>
            Come cambia la tua giornata
          </h2>
        </motion.div>

        <motion.div
          ref={ref}
          className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl shadow-lg"
          style={{ border: '1px solid #404040' }}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {/* Header row */}
          <div className="grid grid-cols-2">
            <div className="px-6 py-4" style={{ background: '#3a2020' }}>
              <span className="text-sm font-bold uppercase tracking-wider" style={{ color: '#ef4444' }}>
                Senza
              </span>
            </div>
            <div className="px-6 py-4" style={{ background: '#1a3a1a' }}>
              <span className="text-sm font-bold uppercase tracking-wider" style={{ color: '#4ade80' }}>
                Con MechMind
              </span>
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, i) => (
            <motion.div
              key={i}
              variants={rowVariants}
              className="grid grid-cols-1 sm:grid-cols-2"
              style={{ borderTop: '1px solid #404040' }}
            >
              {/* Without */}
              <div
                className="flex items-start gap-3 border-b px-6 py-4 sm:border-b-0 sm:border-r"
                style={{ background: '#333333', borderColor: '#404040' }}
              >
                <span className="mt-0.5 shrink-0" style={{ color: '#ef4444' }}>✗</span>
                <span className="text-sm" style={{ color: '#a1a1a6' }}>{row.without}</span>
              </div>
              {/* With MechMind */}
              <div
                className="flex items-start gap-3 px-6 py-4"
                style={{ background: '#333333' }}
              >
                <span className="mt-0.5 shrink-0" style={{ color: '#4ade80' }}>✓</span>
                <span className="text-sm font-medium" style={{ color: '#4ade80' }}>{row.withMM}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
