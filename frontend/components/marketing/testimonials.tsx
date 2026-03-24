'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const reasons = [
  {
    title: 'Setup in 2 minuti',
    description: 'Niente installazione. Apri il browser e inizia.',
  },
  {
    title: '100% Italia',
    description: 'SDI, PEC, CF, P.IVA. Non un gestionale USA tradotto male. Pensato per te.',
  },
  {
    title: 'I tuoi dati sono tuoi',
    description: 'GDPR nativo. Crittografia AES-256. Nessun vendor lock-in.',
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
    <section id="storie" className="bg-[#f7f7f8] py-20 dark:bg-[#171717] lg:py-28">
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
            Perché i meccanici scelgono MechMind
          </h2>
        </motion.div>

        {/* Reason cards */}
        <motion.div
          ref={ref}
          className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {reasons.map((reason) => (
              <motion.div
                key={reason.title}
                variants={cardVariants}
                className="rounded-2xl bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:bg-[#2f2f2f]"
              >
                <h3 className="mb-2 text-lg font-bold text-[#0d0d0d] dark:text-[#ececec]">
                  {reason.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#6e6e80] dark:text-[#8e8ea0]">
                  {reason.description}
                </p>
              </motion.div>
            ))}
        </motion.div>
      </div>
    </section>
  );
}
