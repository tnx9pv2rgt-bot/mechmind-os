'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// =============================================================================
// Constants
// =============================================================================
const DEMO_KEY = 'mechmind_demo';
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
// Helpers
// =============================================================================
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEMO_KEY) === 'true';
}

export function setDemoMode(active: boolean): void {
  if (typeof window === 'undefined') return;
  if (active) {
    localStorage.setItem(DEMO_KEY, 'true');
    sessionStorage.setItem('demo_start', Date.now().toString());
  } else {
    localStorage.removeItem(DEMO_KEY);
    sessionStorage.removeItem('demo_start');
    fetch('/api/auth/demo-session', { method: 'DELETE' }).catch(() => {});
  }
}

function getSecondsLeft(): number {
  if (typeof window === 'undefined') return DEMO_DURATION;
  const start = sessionStorage.getItem('demo_start');
  if (!start) {
    sessionStorage.setItem('demo_start', Date.now().toString());
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
        className='relative w-full max-w-[420px] rounded-3xl bg-white dark:bg-[#2f2f2f] p-8 text-center'
      >
        <div className='mb-6'>
          <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0d0d0d] dark:bg-[#ececec]'>
            <span className='text-2xl'>&#x23F0;</span>
          </div>
          <h2 className='text-[24px] font-bold text-[#0d0d0d] dark:text-[#ececec] tracking-tight'>
            La demo è terminata
          </h2>
          <p className='mt-2 text-[15px] text-[#636366] leading-relaxed'>
            Hai provato MechMind OS per 1 ora. Registrati gratis per continuare con 7 giorni di
            trial completo.
          </p>
          <p className='mt-3 text-[13px] text-[#636366]'>
            &#x1F527; 850+ officine usano già MechMind OS
          </p>
        </div>

        <div className='space-y-3'>
          <button
            onClick={() => {
              setDemoMode(false);
              router.push('/auth/register');
            }}
            className='flex w-full items-center justify-center rounded-full bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] h-[40px] text-[15px] font-semibold hover:bg-[#2f2f2f] dark:hover:bg-[#d9d9d9] transition-colors'
          >
            Registrati gratis — 7 giorni trial
          </button>
          <button
            onClick={() => {
              setDemoMode(false);
              router.push('/auth');
            }}
            className='text-[13px] font-medium text-[#636366] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors'
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
      className='fixed bottom-4 right-4 z-[9997] max-w-sm w-full shadow-2xl rounded-xl border p-4 bg-white dark:bg-[#2f2f2f] border-[#e5e5e5] dark:border-[#424242]'
    >
      <button
        onClick={onClose}
        className='absolute top-2 right-3 text-[#636366] hover:text-[#0d0d0d] dark:hover:text-[#ececec] text-lg transition-colors'
        aria-label='Chiudi'
      >
        &times;
      </button>
      <p className='font-semibold text-[14px] text-[#0d0d0d] dark:text-[#ececec] mb-1'>
        Aspetta! Non perdere i tuoi progressi
      </p>
      <p className='text-[13px] text-[#636366] mb-3'>
        Registrati gratis e continua da dove eri rimasto. 7 giorni senza carta di credito.
      </p>
      <a
        href='/auth/register'
        className='flex w-full items-center justify-center rounded-full bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] h-[36px] text-[13px] font-semibold hover:bg-[#2f2f2f] dark:hover:bg-[#d9d9d9] transition-colors'
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
  const isUrgent = secondsLeft < 600;
  const isCritical = secondsLeft < 300;

  return (
    <div className='w-full bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d]'>
      <div className='flex items-center justify-between px-4 py-2 text-[13px]'>
        <span className='font-medium'>
          Modalità demo —{' '}
          <span
            className={
              isCritical
                ? 'font-mono font-bold text-red-400 dark:text-red-600 animate-pulse'
                : isUrgent
                  ? 'font-mono font-bold text-orange-400 dark:text-orange-600'
                  : 'font-mono font-semibold'
            }
          >
            {m}:{s}
          </span>{' '}
          rimast{secondsLeft === 1 ? 'o' : 'i'}
        </span>
        <button
          onClick={onExit}
          className='text-[13px] font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity'
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

  // Init
  useEffect(() => {
    const demo = localStorage.getItem(DEMO_KEY) === 'true';
    setIsDemo(demo);
    if (demo) {
      const left = getSecondsLeft();
      setSecondsLeft(left);
      if (left <= 0) setShowExpired(true);
    }
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
