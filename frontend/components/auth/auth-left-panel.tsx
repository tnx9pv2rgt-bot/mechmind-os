'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const TESTIMONIALS = [
  {
    quote:
      'MechMind ha trasformato la gestione della mia officina. Ora faccio in met\u00e0 tempo quello che prima richiedeva ore.',
    author: 'Marco R.',
    shop: 'Autofficina Roma Nord',
    rating: 5,
  },
  {
    quote:
      'Finalmente un gestionale pensato per chi lavora davvero in officina. Semplice, veloce, completo.',
    author: 'Giuseppe L.',
    shop: 'Officina Meccanica GL',
    rating: 5,
  },
  {
    quote:
      'Da quando uso MechMind il fatturato \u00e8 cresciuto del 25%. I clienti apprezzano la professionalit\u00e0.',
    author: 'Anna M.',
    shop: 'Auto Service Napoli',
    rating: 5,
  },
];

interface StatConfig {
  value: number;
  suffix: string;
  prefix?: string;
  label: string;
}

const STATS: StatConfig[] = [
  { value: 12000, suffix: '+', label: 'Officine' },
  { value: 32, suffix: '%', prefix: '+', label: 'Fatturato medio' },
  { value: 4.9, suffix: '/5', label: 'Valutazione' },
];

function useAnimatedCounter(target: number, duration: number = 2000): number {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const startTime = performance.now();
    let rafId: number;

    const animate = (now: number): void => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(eased * target);

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return current;
}

function AnimatedStat({ stat }: { stat: StatConfig }): React.ReactElement {
  const animated = useAnimatedCounter(stat.value);

  const displayValue = stat.value % 1 !== 0
    ? animated.toFixed(1)
    : Math.round(animated).toLocaleString('it-IT');

  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-[var(--text-on-brand)] lg:text-4xl">
        {stat.prefix ?? ''}
        {displayValue}
        {stat.suffix}
      </div>
      <div className="mt-1 text-sm text-[var(--status-info)]">{stat.label}</div>
    </div>
  );
}

function StarRating({ count }: { count: number }): React.ReactElement {
  return (
    <div className="flex gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <svg
          key={i}
          className="h-4 w-4 fill-yellow-400 text-[var(--status-warning)]"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function AuthLeftPanel(): React.ReactElement {
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  const rotateTestimonial = useCallback((): void => {
    setTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(rotateTestimonial, 5000);
    return () => clearInterval(interval);
  }, [rotateTestimonial]);

  const current = TESTIMONIALS[testimonialIndex];

  return (
    <div
      className="relative flex h-full min-h-screen flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0a1628 100%)',
      }}
    >
      {/* Particle dots */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {Array.from({ length: 30 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-[var(--surface-secondary)]/10"
            style={{
              width: `${2 + (i % 4)}px`,
              height: `${2 + (i % 4)}px`,
              top: `${(i * 37) % 100}%`,
              left: `${(i * 53) % 100}%`,
              animation: `float-particle ${6 + (i % 5)}s ease-in-out ${(i % 3)}s infinite alternate`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes float-particle {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0.2;
          }
          50% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-30px) translateX(15px);
            opacity: 0.1;
          }
        }
      `}</style>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-12 px-8 py-12">
        {/* Logo / Brand */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-on-brand)] lg:text-4xl">
            MechMind OS
          </h1>
          <p className="mt-2 text-sm text-[var(--status-info)]">
            Il gestionale per officine meccaniche
          </p>
        </div>

        {/* Stats */}
        <div className="grid w-full grid-cols-3 gap-4">
          {STATS.map((stat) => (
            <AnimatedStat key={stat.label} stat={stat} />
          ))}
        </div>

        {/* Testimonials */}
        <div className="relative min-h-[180px] w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={testimonialIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-[var(--border-default)]/10 bg-[var(--surface-secondary)]/5 p-6 backdrop-blur-sm"
            >
              <StarRating count={current.rating} />
              <p className="mt-3 text-sm leading-relaxed text-[var(--status-info)] italic">
                &ldquo;{current.quote}&rdquo;
              </p>
              <div className="mt-4">
                <p className="text-sm font-semibold text-[var(--text-on-brand)]">{current.author}</p>
                <p className="text-xs text-[var(--status-info)]">{current.shop}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots indicator */}
          <div className="mt-4 flex justify-center gap-0">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setTestimonialIndex(i)}
                className="flex h-11 w-11 items-center justify-center"
                aria-label={`Testimonianza ${i + 1}`}
              >
                <span
                  className={`block h-2 rounded-full transition-all ${
                    i === testimonialIndex
                      ? 'w-6 bg-[var(--surface-secondary)]'
                      : 'w-2 bg-[var(--surface-secondary)]/30 hover:bg-[var(--surface-secondary)]'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
