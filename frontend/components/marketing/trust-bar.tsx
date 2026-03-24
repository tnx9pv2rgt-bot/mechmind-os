'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
const badges = [
  { label: 'Fatturazione SDI' },
  { label: 'GDPR compliant' },
  { label: 'Multi-sede' },
  { label: 'Made in Italy' },
] as const;

export function TrustBar(): React.ReactElement {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <section
      ref={ref}
      className="border-y border-[#e5e5e5] bg-[#f7f7f8] py-6 dark:border-[#444654] dark:bg-[#171717]"
    >
      <motion.div
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-6 px-6 sm:gap-10 lg:gap-14 lg:px-8"
        initial={{ opacity: 0, y: 10 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.5 }}
      >
        {badges.map((badge) => (
            <div
              key={badge.label}
              className="flex items-center gap-2.5 text-[#6e6e80] dark:text-[#8e8ea0]"
            >
              <span className="text-sm font-medium">{badge.label}</span>
            </div>
          ))}
      </motion.div>
    </section>
  );
}
