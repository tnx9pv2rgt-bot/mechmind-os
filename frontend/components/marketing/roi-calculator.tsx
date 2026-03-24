'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import Link from 'next/link';

type CurrentMethod = 'carta' | 'excel' | 'altro-sw';

const technicianOptions = [
  { label: '1', value: 1 },
  { label: '2-3', value: 2.5 },
  { label: '4-6', value: 5 },
  { label: '7+', value: 8 },
] as const;

const methodOptions = [
  { id: 'carta' as CurrentMethod, label: 'Carta' },
  { id: 'excel' as CurrentMethod, label: 'Excel' },
  { id: 'altro-sw' as CurrentMethod, label: 'Altro SW' },
] as const;

const ADMIN_HOURLY_RATE = 18;
const TECH_HOURLY_RATE = 25;
const AVG_ARO = 350;
const SUBSCRIPTION_COST = 79;
const METHOD_MULTIPLIER: Record<CurrentMethod, number> = {
  carta: 1.3,
  excel: 1.0,
  'altro-sw': 0.7,
};

function calculateROI(vehicles: number, techs: number, method: CurrentMethod): {
  total: number;
  timeSaved: number;
  revenueUplift: number;
  phoneSaved: number;
} {
  const multiplier = METHOD_MULTIPLIER[method];
  const adminHoursSaved = (vehicles * 15 * multiplier) / 60;
  const timeSaved = Math.round(adminHoursSaved * ADMIN_HOURLY_RATE);
  const revenueUplift = Math.round(vehicles * AVG_ARO * 0.15 * multiplier * 0.3);
  const phoneHoursSaved = techs * 2 * multiplier;
  const phoneSaved = Math.round(phoneHoursSaved * TECH_HOURLY_RATE);
  const total = Math.max(0, timeSaved + revenueUplift + phoneSaved - SUBSCRIPTION_COST);
  return { total, timeSaved, revenueUplift, phoneSaved };
}

function AnimatedCounter({ value }: { value: number }): React.ReactElement {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString('it-IT'));
  const [displayValue, setDisplayValue] = useState('0');

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    });
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, motionValue, rounded]);

  return <span>{displayValue}</span>;
}

export function RoiCalculator(): React.ReactElement {
  const [vehicles, setVehicles] = useState(60);
  const [selectedTechIdx, setSelectedTechIdx] = useState(1);
  const [method, setMethod] = useState<CurrentMethod>('excel');
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  const techs = technicianOptions[selectedTechIdx].value;
  const roi = calculateROI(vehicles, techs, method);
  const adminHours = Math.round((vehicles * 15 * METHOD_MULTIPLIER[method]) / 60);
  const phoneHours = Math.round(techs * 2 * METHOD_MULTIPLIER[method]);

  return (
    <section id="roi" ref={ref} className="bg-[#f7f7f8] py-20 dark:bg-[#171717] lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-[#0d0d0d] dark:text-[#ececec] sm:text-4xl">
            Quanto puoi risparmiare con MechMind?
          </h2>
        </motion.div>

        {/* Calculator */}
        <motion.div
          className="mx-auto mt-12 max-w-4xl"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-xl dark:border-[#444654] dark:bg-[#2f2f2f]">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Left: Inputs */}
              <div className="border-b border-[#e5e5e5] p-6 dark:border-[#444654] sm:p-8 lg:border-b-0 lg:border-r">
                {/* Vehicles slider */}
                <div className="mb-8">
                  <label className="mb-3 block text-sm font-medium text-[#0d0d0d] dark:text-[#ececec]">
                    Quanti veicoli lavori al mese?
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min={10}
                      max={200}
                      step={10}
                      value={vehicles}
                      onChange={(e) => setVehicles(Number(e.target.value))}
                      aria-label="Numero di veicoli al mese"
                      className="min-h-[44px] h-2 w-full cursor-pointer appearance-none rounded-full bg-[#e5e5e5] accent-[#0d0d0d] dark:accent-white dark:bg-[#444654] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0d0d0d] dark:[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
                    />
                    <div className="mt-2 flex justify-between text-xs text-[#8e8ea0]">
                      <span>10</span>
                      <span className="text-base font-bold text-[#0d0d0d] dark:text-white">{vehicles}</span>
                      <span>200</span>
                    </div>
                  </div>
                </div>

                {/* Technicians */}
                <div className="mb-8">
                  <label className="mb-3 block text-sm font-medium text-[#0d0d0d] dark:text-[#ececec]">
                    Quanti tecnici hai?
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {technicianOptions.map((opt, i) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setSelectedTechIdx(i)}
                        className={`min-h-[44px] rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                          i === selectedTechIdx
                            ? 'border-[#0d0d0d] dark:border-white bg-[#0d0d0d]/5 dark:bg-white/10 text-[#0d0d0d] dark:text-white'
                            : 'border-[#e5e5e5] text-[#6e6e80] hover:border-[#d9d9e3] dark:border-[#444654] dark:text-[#8e8ea0] dark:hover:border-[#6e6e80]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Current method */}
                <div>
                  <label className="mb-3 block text-sm font-medium text-[#0d0d0d] dark:text-[#ececec]">
                    Come gestisci oggi?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {methodOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setMethod(opt.id)}
                        className={`min-h-[44px] rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                          method === opt.id
                            ? 'border-[#0d0d0d] dark:border-white bg-[#0d0d0d]/5 dark:bg-white/10 text-[#0d0d0d] dark:text-white'
                            : 'border-[#e5e5e5] text-[#6e6e80] hover:border-[#d9d9e3] dark:border-[#444654] dark:text-[#8e8ea0] dark:hover:border-[#6e6e80]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Result */}
              <div className="flex flex-col items-center justify-center bg-[#f7f7f8] p-6 text-center dark:bg-[#212121] sm:p-8">
                <p className="text-sm font-medium text-[#6e6e80] dark:text-[#8e8ea0]">
                  Con MechMind potresti risparmiare
                </p>
                <p className="mt-3 text-5xl font-bold tracking-tight text-[#0d0d0d] dark:text-[#ececec] sm:text-6xl">
                  &euro;<AnimatedCounter value={roi.total} />
                </p>
                <p className="mt-1 text-sm text-[#8e8ea0]">al mese</p>

                {/* Breakdown */}
                <div className="mt-8 w-full space-y-3">
                  <div className="flex items-center gap-3 text-left">
                    <span className="flex-1 text-sm text-[#6e6e80] dark:text-[#8e8ea0]">
                      {adminHours}h/mese in meno di burocrazia
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-left">
                    <span className="flex-1 text-sm text-[#6e6e80] dark:text-[#8e8ea0]">
                      +15% fatturato medio (ARO più alto)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-left">
                    <span className="flex-1 text-sm text-[#6e6e80] dark:text-[#8e8ea0]">
                      {phoneHours}h/mese in meno al telefono
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <Link
                  href="/auth/register"
                  className="mt-8 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#0d0d0d] dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-[#0d0d0d] transition-all hover:bg-[#2f2f2f] dark:hover:bg-[#e5e5e5] active:scale-[0.97]"
                >
                  Inizia a risparmiare — Prova gratis &rarr;
                </Link>
              </div>
            </div>

            {/* Methodology note */}
            <div className="border-t border-[#e5e5e5] bg-[#f7f7f8] px-6 py-3 dark:border-[#444654] dark:bg-[#171717]">
              <p className="text-center text-xs text-[#8e8ea0]">
                Basato su dati medi di officine italiane. Il risparmio reale può variare.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
