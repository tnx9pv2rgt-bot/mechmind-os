'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Wrench,
  CreditCard,
  Users,
  Check,
  FileText,
  Camera,
  ClipboardList,
  Package,
  Mail,
  Smartphone,
  BarChart3,
  Calendar,
  Bell,
  Megaphone,
  Globe,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface FeatureBullet {
  label: string;
  icon: LucideIcon;
}

interface MockupCard {
  gradient: string;
  rows: MockupRow[];
}

interface MockupRow {
  type: 'header' | 'bar' | 'badge' | 'line' | 'progress' | 'avatar-line';
  width?: string;
  color?: string;
}

interface Pillar {
  id: string;
  icon: LucideIcon;
  iconGradient: string;
  title: string;
  description: string;
  bullets: FeatureBullet[];
  mockup: MockupCard;
  reversed: boolean;
  bg: string;
}

/* -------------------------------------------------------------------------- */
/*  Data                                                                       */
/* -------------------------------------------------------------------------- */

const pillars: Pillar[] = [
  {
    id: 'gestione',
    icon: Wrench,
    iconGradient: 'from-blue-500 to-cyan-400',
    title: 'Gestisci ogni lavoro con sicurezza',
    description:
      'Ordini di lavoro digitali, ispezioni con foto, preventivi automatici e gestione ricambi. Tutto in tempo reale, da qualsiasi dispositivo.',
    bullets: [
      { label: 'Ordini di lavoro con stato in tempo reale', icon: ClipboardList },
      { label: 'Ispezioni digitali con foto e annotazioni', icon: Camera },
      { label: 'Preventivi e conversione automatica in OdL', icon: FileText },
      { label: 'Gestione ricambi e inventario integrato', icon: Package },
    ],
    mockup: {
      gradient: 'from-blue-600/90 to-cyan-500/90',
      rows: [
        { type: 'header', width: '60%', color: 'bg-white/30' },
        { type: 'badge', width: '25%', color: 'bg-emerald-400/60' },
        { type: 'line', width: '90%', color: 'bg-white/15' },
        { type: 'line', width: '75%', color: 'bg-white/15' },
        { type: 'progress', width: '70%', color: 'bg-cyan-300/50' },
        { type: 'bar', width: '100%', color: 'bg-white/10' },
        { type: 'avatar-line', width: '55%', color: 'bg-white/20' },
      ],
    },
    reversed: false,
    bg: 'bg-white dark:bg-neutral-950',
  },
  {
    id: 'fatturazione',
    icon: CreditCard,
    iconGradient: 'from-violet-500 to-purple-400',
    title: 'Incassa più velocemente',
    description:
      'Fatturazione elettronica, pagamenti integrati, promemoria automatici. Proteggi il tuo fatturato.',
    bullets: [
      { label: 'Fatturazione elettronica XML conforme SDI', icon: FileText },
      { label: 'Pagamenti con link via SMS e email', icon: Smartphone },
      { label: 'Buy Now Pay Later per i tuoi clienti', icon: Mail },
      { label: 'Report finanziari in tempo reale', icon: BarChart3 },
    ],
    mockup: {
      gradient: 'from-violet-600/90 to-purple-500/90',
      rows: [
        { type: 'header', width: '50%', color: 'bg-white/30' },
        { type: 'bar', width: '100%', color: 'bg-white/10' },
        { type: 'line', width: '85%', color: 'bg-white/15' },
        { type: 'badge', width: '30%', color: 'bg-violet-300/50' },
        { type: 'progress', width: '60%', color: 'bg-purple-300/50' },
        { type: 'line', width: '70%', color: 'bg-white/15' },
        { type: 'avatar-line', width: '45%', color: 'bg-white/20' },
      ],
    },
    reversed: true,
    bg: 'bg-neutral-50 dark:bg-neutral-900/50',
  },
  {
    id: 'clienti',
    icon: Users,
    iconGradient: 'from-amber-500 to-orange-400',
    title: 'Trasforma il servizio in clienti fedeli',
    description:
      'CRM integrato, promemoria manutenzione, campagne marketing, recensioni Google. Fai tornare i clienti.',
    bullets: [
      { label: 'Prenotazione online 24/7', icon: Calendar },
      { label: 'Promemoria manutenzione automatici', icon: Bell },
      { label: 'Campagne SMS e email marketing', icon: Megaphone },
      { label: 'Portale clienti self-service', icon: Globe },
    ],
    mockup: {
      gradient: 'from-amber-500/90 to-orange-500/90',
      rows: [
        { type: 'header', width: '55%', color: 'bg-white/30' },
        { type: 'avatar-line', width: '65%', color: 'bg-white/20' },
        { type: 'avatar-line', width: '50%', color: 'bg-white/20' },
        { type: 'badge', width: '20%', color: 'bg-amber-300/50' },
        { type: 'line', width: '80%', color: 'bg-white/15' },
        { type: 'progress', width: '85%', color: 'bg-orange-300/50' },
        { type: 'bar', width: '100%', color: 'bg-white/10' },
      ],
    },
    reversed: false,
    bg: 'bg-white dark:bg-neutral-950',
  },
];

/* -------------------------------------------------------------------------- */
/*  Animation variants                                                         */
/* -------------------------------------------------------------------------- */

const sectionVariants = {
  hidden: { opacity: 0, y: 48 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const bulletContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.3 },
  },
};

const bulletVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const mockupVariants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 },
  },
};

/* -------------------------------------------------------------------------- */
/*  Mockup Card                                                                */
/* -------------------------------------------------------------------------- */

function MockupCardComponent({ mockup }: { mockup: MockupCard }): ReactNode {
  return (
    <div
      className={cn(
        'relative rounded-2xl bg-gradient-to-br p-6 shadow-2xl sm:p-8',
        mockup.gradient,
      )}
    >
      {/* Gloss effect */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 to-transparent" />

      {/* Fake window chrome */}
      <div className="mb-5 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-white/30" />
        <span className="h-3 w-3 rounded-full bg-white/20" />
        <span className="h-3 w-3 rounded-full bg-white/20" />
        <div className="ml-3 h-3 w-24 rounded-full bg-white/10" />
      </div>

      {/* Content rows */}
      <div className="space-y-4">
        {mockup.rows.map((row, idx) => (
          <MockupRow key={idx} row={row} />
        ))}
      </div>
    </div>
  );
}

function MockupRow({ row }: { row: MockupRow }): ReactNode {
  switch (row.type) {
    case 'header':
      return (
        <div
          className={cn('h-5 rounded-md', row.color)}
          style={{ width: row.width }}
        />
      );
    case 'line':
      return (
        <div
          className={cn('h-3 rounded', row.color)}
          style={{ width: row.width }}
        />
      );
    case 'bar':
      return (
        <div
          className={cn('h-10 rounded-lg', row.color)}
          style={{ width: row.width }}
        />
      );
    case 'badge':
      return (
        <div
          className={cn('h-6 rounded-full', row.color)}
          style={{ width: row.width }}
        />
      );
    case 'progress':
      return (
        <div className="h-2 w-full rounded-full bg-white/10">
          <div
            className={cn('h-2 rounded-full', row.color)}
            style={{ width: row.width }}
          />
        </div>
      );
    case 'avatar-line':
      return (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 shrink-0 rounded-full bg-white/25" />
          <div
            className={cn('h-3 rounded', row.color)}
            style={{ width: row.width }}
          />
        </div>
      );
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Pillar Section                                                             */
/* -------------------------------------------------------------------------- */

function PillarSection({ pillar }: { pillar: Pillar }): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const Icon = pillar.icon;

  const textBlock = (
    <div className="flex flex-col justify-center">
      {/* Icon badge */}
      <div
        className={cn(
          'mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg',
          pillar.iconGradient,
        )}
      >
        <Icon className="h-7 w-7 text-white" strokeWidth={1.8} />
      </div>

      {/* Title */}
      <h3 className="mb-4 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
        {pillar.title}
      </h3>

      {/* Description */}
      <p className="mb-8 max-w-lg text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
        {pillar.description}
      </p>

      {/* Bullets */}
      <motion.ul
        className="space-y-4"
        variants={bulletContainerVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
      >
        {pillar.bullets.map((bullet) => {
          const BulletIcon = bullet.icon;
          return (
            <motion.li
              key={bullet.label}
              variants={bulletVariants}
              className="flex items-start gap-3"
            >
              <span
                className={cn(
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br',
                  pillar.iconGradient,
                )}
              >
                <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
              </span>
              <span className="flex items-center gap-2 text-base text-neutral-700 dark:text-neutral-300">
                <BulletIcon className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" strokeWidth={1.8} />
                {bullet.label}
              </span>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );

  const visualBlock = (
    <motion.div
      variants={mockupVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
    >
      <MockupCardComponent mockup={pillar.mockup} />
    </motion.div>
  );

  return (
    <div ref={ref} className={cn('py-20 lg:py-32', pillar.bg)}>
      <motion.div
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        variants={sectionVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
      >
        <div
          className={cn(
            'grid items-center gap-12 lg:grid-cols-2 lg:gap-20',
            pillar.reversed && 'lg:[&>*:first-child]:order-2',
          )}
        >
          {pillar.reversed ? (
            <>
              {textBlock}
              {visualBlock}
            </>
          ) : (
            <>
              {textBlock}
              {visualBlock}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section Header                                                             */
/* -------------------------------------------------------------------------- */

function SectionHeader(): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <div
      ref={ref}
      className="bg-white pb-4 pt-20 dark:bg-neutral-950 lg:pb-8 lg:pt-32"
    >
      <motion.div
        className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 32 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Funzionalit&agrave;
        </p>
        <h2 className="mb-6 text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl lg:text-6xl">
          Tutto ci&ograve; che serve alla tua officina
        </h2>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-xl">
          Dalla prenotazione alla fattura, in un&rsquo;unica piattaforma cloud.
        </p>
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Features (export)                                                          */
/* -------------------------------------------------------------------------- */

export default function Features(): ReactNode {
  return (
    <section id="funzionalita">
      <SectionHeader />
      {pillars.map((pillar) => (
        <PillarSection key={pillar.id} pillar={pillar} />
      ))}
    </section>
  );
}
