'use client';

import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useTransform, animate } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
}

function formatItalianNumber(num: number, decimals: number): string {
  const parts = num.toFixed(decimals).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (decimals === 0) return intPart;
  return `${intPart},${parts[1]}`;
}

export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  duration = 1.5,
  decimals = 0,
  className = '',
}: AnimatedCounterProps): React.ReactElement {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (latest: number) =>
    `${prefix}${formatItalianNumber(latest, decimals)}${suffix}`
  );

  // Check for reduced motion preference
  const prefersReducedMotion = useRef(false);
  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (!isInView) return;

    if (prefersReducedMotion.current) {
      motionValue.set(value);
      return;
    }

    const controls = animate(motionValue, value, {
      duration,
      ease: (t: number) => 1 - Math.pow(1 - t, 3), // cubic ease-out
    });

    return () => controls.stop();
  }, [isInView, value, duration, motionValue]);

  // Update the DOM manually to avoid re-renders
  useEffect(() => {
    const unsubscribe = display.on('change', (v: string) => {
      if (ref.current) {
        ref.current.textContent = v;
      }
    });
    return unsubscribe;
  }, [display]);

  return (
    <span ref={ref} className={className}>
      {prefix}{formatItalianNumber(0, decimals)}{suffix}
    </span>
  );
}
