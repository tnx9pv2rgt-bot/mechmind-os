'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const DEMO_DURATION = 60 * 60; // 1 hour

function getSecondsLeft(): number {
  const start = sessionStorage.getItem('demo_start');
  if (!start) return DEMO_DURATION;
  const elapsed = Math.floor((Date.now() - parseInt(start, 10)) / 1000);
  return Math.max(0, DEMO_DURATION - elapsed);
}

export function DemoBanner(): React.ReactElement | null {
  const [visible, setVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DEMO_DURATION);

  useEffect(() => {
    const isDemo = localStorage.getItem('mechmind_demo') === 'true';
    const isDismissed = sessionStorage.getItem('mechmind_demo_banner_dismissed') === 'true';
    setVisible(isDemo && !isDismissed);
    if (isDemo) setSecondsLeft(getSecondsLeft());
  }, []);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setSecondsLeft(getSecondsLeft());
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  const handleDismiss = (): void => {
    sessionStorage.setItem('mechmind_demo_banner_dismissed', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const s = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <div
      className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-4 px-4 py-2.5"
      style={{ background: '#000000', color: '#ffffff', borderBottom: '2px solid #ff0000' }}
    >
      <p className="text-sm font-medium" style={{ color: '#ff0000' }}>
        Modalità demo — <span className="font-mono font-bold">{m}:{s}</span> rimasti
      </p>
      <Link
        href="/auth?tab=register"
        className="min-h-[44px] rounded-full px-4 py-1.5 text-sm font-normal transition-opacity hover:opacity-80 flex items-center"
        style={{ background: '#555555', color: '#ffffff' }}
      >
        Registrati per salvare i tuoi dati &rarr;
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        className="ml-2 flex h-[44px] w-[44px] items-center justify-center rounded-full transition-opacity hover:opacity-70"
        style={{ color: '#999999' }}
        aria-label="Chiudi banner"
      >
        <span className="text-lg">&#10005;</span>
      </button>
    </div>
  );
}
