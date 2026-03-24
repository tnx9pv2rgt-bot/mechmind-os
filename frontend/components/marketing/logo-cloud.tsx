'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface Partner {
  name: string;
  color: string;
  bgColor: string;
}

const partners: Partner[] = [
  { name: 'Stripe', color: 'text-[#635BFF]', bgColor: 'bg-[#635BFF]/10' },
  { name: 'Aruba PEC', color: 'text-[#E87722]', bgColor: 'bg-[#E87722]/10' },
  { name: 'Fatture in Cloud', color: 'text-[#2B7DE9]', bgColor: 'bg-[#2B7DE9]/10' },
  { name: 'Google Calendar', color: 'text-[#4285F4]', bgColor: 'bg-[#4285F4]/10' },
  { name: 'WhatsApp', color: 'text-[#25D366]', bgColor: 'bg-[#25D366]/10' },
  { name: 'QuickBooks', color: 'text-[#2CA01C]', bgColor: 'bg-[#2CA01C]/10' },
  { name: 'SDI / Agenzia Entrate', color: 'text-[#1B4F9B]', bgColor: 'bg-[#1B4F9B]/10' },
];

interface StatItem {
  value: string;
  label: string;
}

const stats: StatItem[] = [
  { value: '2.000+', label: 'Officine attive' },
  { value: '500.000+', label: 'Ordini gestiti' },
  { value: '4.9/5', label: 'Valutazione media' },
];

function PartnerLogo({ partner }: { partner: Partner }): React.ReactElement {
  return (
    <div
      className={`flex-shrink-0 mx-6 flex items-center gap-2 rounded-lg px-5 py-2.5 ${partner.bgColor}`}
    >
      <span className={`text-sm font-semibold tracking-tight whitespace-nowrap ${partner.color}`}>
        {partner.name}
      </span>
    </div>
  );
}

function MarqueeRow(): React.ReactElement {
  return (
    <div className="flex items-center">
      {partners.map((partner) => (
        <PartnerLogo key={partner.name} partner={partner} />
      ))}
    </div>
  );
}

export function LogoCloud(): React.ReactElement {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' });

  return (
    <section
      ref={sectionRef}
      className="bg-neutral-50 py-16 dark:bg-neutral-900 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center text-sm font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400"
        >
          Integrato con i tuoi strumenti preferiti
        </motion.p>

        {/* Marquee */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="group relative overflow-hidden"
        >
          {/* Gradient masks */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-neutral-50 to-transparent dark:from-neutral-900" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-neutral-50 to-transparent dark:from-neutral-900" />

          {/* Scrolling track */}
          <div className="flex w-max animate-marquee items-center group-hover:[animation-play-state:paused]">
            <MarqueeRow />
            <MarqueeRow />
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-14 grid grid-cols-3 gap-6 text-center"
        >
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold text-neutral-900 dark:text-white">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Marquee keyframes injected via style tag */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </section>
  );
}

export default LogoCloud;
