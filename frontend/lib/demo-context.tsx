'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// =============================================================================
// Constants
// =============================================================================
const DEMO_KEY = 'mechmind_demo';
const DEMO_START_KEY = 'mechmind_demo_start';
const DEMO_DURATION = 60 * 60; // 1 hour in seconds

// =============================================================================
// Context
// =============================================================================
interface DemoContextType {
  isDemo: boolean;
  secondsLeft: number;
  exitDemo: () => void;
}

const DemoContext = createContext<DemoContextType>({
  isDemo: false,
  secondsLeft: DEMO_DURATION,
  exitDemo: () => {},
});

export const useDemo = () => useContext(DemoContext);

// =============================================================================
// Helpers — everything in localStorage for cross-tab + restart persistence
// =============================================================================
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEMO_KEY) === 'true';
}

export function setDemoMode(active: boolean): void {
  if (typeof window === 'undefined') return;
  if (active) {
    localStorage.setItem(DEMO_KEY, 'true');
    // Only set start time if there isn't one already (prevents reset on re-activation)
    if (!localStorage.getItem(DEMO_START_KEY)) {
      localStorage.setItem(DEMO_START_KEY, Date.now().toString());
    }
  } else {
    localStorage.removeItem(DEMO_KEY);
    localStorage.removeItem(DEMO_START_KEY);
    sessionStorage.removeItem('exit_intent_shown');
    fetch('/api/auth/demo-session', { method: 'DELETE' }).catch(() => {});
  }
}

/** Start a fresh demo — always resets the timer */
export function startFreshDemo(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_KEY, 'true');
  localStorage.setItem(DEMO_START_KEY, Date.now().toString());
}

function getSecondsLeft(): number {
  if (typeof window === 'undefined') return DEMO_DURATION;
  const start = localStorage.getItem(DEMO_START_KEY);
  if (!start) {
    // Demo flag is set but no start time — set one now
    localStorage.setItem(DEMO_START_KEY, Date.now().toString());
    return DEMO_DURATION;
  }
  const elapsed = Math.floor((Date.now() - parseInt(start, 10)) / 1000);
  return Math.max(0, DEMO_DURATION - elapsed);
}

// =============================================================================
// DemoExpiredModal — blocking, no close
// =============================================================================
function DemoExpiredModal() {
  const router = useRouter();

  // Block ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.preventDefault();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-6'
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className='relative w-full max-w-[420px] rounded-3xl bg-white dark:bg-[var(--surface-elevated)] p-8 text-center'
      >
        <div className='mb-6'>
          <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--text-primary)] dark:bg-[var(--text-primary)]'>
            <span className='text-2xl'>&#x23F0;</span>
          </div>
          <h2 className='text-[24px] font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] tracking-tight'>
            La demo è terminata
          </h2>
          <p className='mt-2 text-[15px] text-[var(--text-secondary)] leading-relaxed'>
            Hai provato MechMind OS per 1 ora. Registrati gratis per continuare con 7 giorni di
            trial completo.
          </p>
          <p className='mt-3 text-[13px] text-[var(--text-secondary)]'>
            &#x1F527; 850+ officine usano già MechMind OS
          </p>
        </div>

        <div className='space-y-3'>
          <button
            onClick={() => {
              setDemoMode(false);
              router.push('/auth/register');
            }}
            className='flex w-full items-center justify-center rounded-full bg-[#2f2f2f] text-white h-[52px] text-[15px] font-semibold hover:bg-[#3a3a3a] transition-colors'
          >
            Registrati gratis — 7 giorni trial
          </button>
          <button
            onClick={() => {
              setDemoMode(false);
              router.push('/auth');
            }}
            className='text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)] transition-colors'
          >
            Torna al login
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// =============================================================================
// DemoExitIntent — bottom-right card, appears once when mouse leaves window
// =============================================================================
function DemoExitIntent({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className='fixed bottom-4 right-4 z-[9997] max-w-sm w-full shadow-2xl rounded-xl border p-4 bg-white dark:bg-[var(--surface-elevated)] border-[var(--border-default)] dark:border-[var(--border-default)]'
    >
      <button
        onClick={onClose}
        className='absolute top-2 right-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)] text-lg transition-colors'
        aria-label='Chiudi'
      >
        &times;
      </button>
      <p className='font-semibold text-[14px] text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1'>
        Aspetta! Non perdere i tuoi progressi
      </p>
      <p className='text-[13px] text-[var(--text-secondary)] mb-3'>
        Registrati gratis e continua da dove eri rimasto. 7 giorni senza carta di credito.
      </p>
      <a
        href='/auth/register'
        className='flex w-full items-center justify-center rounded-full bg-neutral-500 dark:bg-neutral-600 text-white dark:text-white h-[36px] text-[13px] font-semibold hover:bg-neutral-600 dark:hover:bg-neutral-700 transition-colors'
      >
        Registrati gratis
      </a>
    </motion.div>
  );
}

// =============================================================================
// Demo Banner — top bar with timer
// =============================================================================
function DemoBanner({ secondsLeft, onExit }: { secondsLeft: number; onExit: () => void }) {
  const m = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, '0');
  const s = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <div className='w-full' style={{ background: 'transparent', color: '#ffffff' }}>
      <div className='flex items-center justify-between px-4 py-2 text-[13px]'>
        <span className='font-medium' style={{ color: '#ff0000' }}>
          Modalità demo —{' '}
          <span className='font-mono font-bold' style={{ color: '#ff0000' }}>
            {m}:{s}
          </span>{' '}
          rimast{secondsLeft === 1 ? 'o' : 'i'}
        </span>
        <button
          onClick={onExit}
          className='text-[13px] font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity'
          style={{ color: '#999999' }}
        >
          Registrati gratis
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Demo Provider
// =============================================================================
export function DemoProvider({
  children,
  initialIsDemo = false,
}: {
  children: React.ReactNode;
  initialIsDemo?: boolean;
}) {
  const [isDemo, setIsDemo] = useState(initialIsDemo);
  const [secondsLeft, setSecondsLeft] = useState(DEMO_DURATION);
  const [showExpired, setShowExpired] = useState(false);
  const [showExitIntent, setShowExitIntent] = useState(false);
  const router = useRouter();
  const fiveMinToastShown = useRef(false);

  // Init — read from localStorage (single source of truth)
  useEffect(() => {
    const demo = localStorage.getItem(DEMO_KEY) === 'true';
    setIsDemo(demo);
    if (demo) {
      const left = getSecondsLeft();
      setSecondsLeft(left);
      if (left <= 0) {
        setShowExpired(true);
      }
    }
  }, []);

  // Cross-tab sync: if another tab clears demo, this tab should react
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === DEMO_KEY) {
        if (e.newValue === null || e.newValue !== 'true') {
          // Demo was deactivated in another tab
          setIsDemo(false);
          setShowExpired(false);
        } else {
          // Demo was activated in another tab
          setIsDemo(true);
          setSecondsLeft(getSecondsLeft());
        }
      }
      if (e.key === DEMO_START_KEY && e.newValue === null) {
        // Start time cleared — demo ended
        setIsDemo(false);
        setShowExpired(false);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!isDemo || showExpired) return;

    const interval = setInterval(() => {
      const left = getSecondsLeft();
      setSecondsLeft(left);

      // Toast at 5 minutes
      if (left <= 300 && left > 0 && !fiveMinToastShown.current) {
        fiveMinToastShown.current = true;
        toast.warning('Hai ancora 5 minuti di demo — registrati gratis!', {
          duration: 8000,
          action: {
            label: 'Registrati',
            onClick: () => {
              window.location.href = '/auth/register';
            },
          },
        });
      }

      if (left <= 0) {
        clearInterval(interval);
        setShowExpired(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isDemo, showExpired]);

  // Exit-intent detection
  useEffect(() => {
    if (!isDemo) return;
    if (sessionStorage.getItem('exit_intent_shown')) return;

    const handler = (e: MouseEvent) => {
      if (e.clientY < 10) {
        setShowExitIntent(true);
        sessionStorage.setItem('exit_intent_shown', '1');
        document.removeEventListener('mouseleave', handler);
      }
    };

    document.addEventListener('mouseleave', handler);
    return () => document.removeEventListener('mouseleave', handler);
  }, [isDemo]);

  const exitDemo = useCallback(() => {
    setDemoMode(false);
    setIsDemo(false);
    router.push('/auth');
  }, [router]);

  return (
    <DemoContext.Provider value={{ isDemo, secondsLeft, exitDemo }}>
      {isDemo && !showExpired && <DemoBanner secondsLeft={secondsLeft} onExit={exitDemo} />}
      {children}
      <AnimatePresence>
        {showExitIntent && !showExpired && (
          <DemoExitIntent onClose={() => setShowExitIntent(false)} />
        )}
      </AnimatePresence>
      {showExpired && <DemoExpiredModal />}
    </DemoContext.Provider>
  );
}
