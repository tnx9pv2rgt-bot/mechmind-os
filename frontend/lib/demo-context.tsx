'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

// =============================================================================
// Constants
// =============================================================================
const DEMO_KEY = 'mechmind_demo';
const DEMO_CLICKS_KEY = 'mechmind_demo_clicks';
const MAX_CLICKS = 100;

// =============================================================================
// Context
// =============================================================================
interface DemoContextType {
  isDemo: boolean;
  clicksLeft: number;
  totalClicks: number;
  exitDemo: () => void;
}

const DemoContext = createContext<DemoContextType>({
  isDemo: false,
  clicksLeft: MAX_CLICKS,
  totalClicks: 0,
  exitDemo: () => {},
});

export const useDemo = () => useContext(DemoContext);

// =============================================================================
// Helper — check demo flag
// =============================================================================
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEMO_KEY) === 'true';
}

export function setDemoMode(active: boolean): void {
  if (typeof window === 'undefined') return;
  if (active) {
    localStorage.setItem(DEMO_KEY, 'true');
    localStorage.setItem(DEMO_CLICKS_KEY, '0');
  } else {
    localStorage.removeItem(DEMO_KEY);
    localStorage.removeItem(DEMO_CLICKS_KEY);
    // Clear demo session cookie via API
    fetch('/api/auth/demo-session', { method: 'DELETE' }).catch(() => {});
  }
}

// =============================================================================
// Demo Wall — fullscreen modal after limit
// =============================================================================
function DemoWall({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-[420px] rounded-3xl bg-white dark:bg-[#2f2f2f] p-8 text-center"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#636366] hover:text-[#0d0d0d] dark:hover:text-[#ececec] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-black dark:bg-white">
            <span className="text-2xl">&#x1F680;</span>
          </div>
          <h2 className="text-[24px] font-bold text-[#0d0d0d] dark:text-[#ececec] tracking-tight">
            Ti piace MechMind?
          </h2>
          <p className="mt-2 text-[15px] text-[#636366] leading-relaxed">
            Hai esaurito le 100 azioni della demo gratuita. Crea un account per continuare a gestire la tua officina.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              setDemoMode(false);
              router.push('/auth');
            }}
            className="flex w-full items-center justify-center rounded-full bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d] h-[52px] text-[15px] font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            Registrati gratis
          </button>
          <button
            onClick={() => {
              setDemoMode(false);
              router.push('/auth');
            }}
            className="flex w-full items-center justify-center rounded-full border border-[#e5e5e5] dark:border-[#424242] h-[52px] text-[15px] font-medium text-[#0d0d0d] dark:text-[#ececec] hover:bg-[#ebebeb] dark:hover:bg-[#3a3a3a] transition-colors"
          >
            Ho gi\u00E0 un account
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// =============================================================================
// Demo Banner — persistent top bar
// =============================================================================
function DemoBanner({ clicksLeft, onExit }: { clicksLeft: number; onExit: () => void }) {
  const pct = Math.max(0, (clicksLeft / MAX_CLICKS) * 100);
  const isLow = clicksLeft <= 20;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] bg-[#0d0d0d] dark:bg-[#ececec] text-white dark:text-[#0d0d0d]">
      <div className="flex items-center justify-between px-4 py-2 text-[13px]">
        <span className="font-medium">
          Modalità demo {isLow ? '— ' : '— '}
          <span className={isLow ? 'text-red-400 dark:text-red-600 font-bold' : ''}>
            {clicksLeft} azioni rimaste
          </span>
        </span>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block w-32 h-1.5 rounded-full bg-white/20 dark:bg-black/20 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isLow ? 'bg-red-400 dark:bg-red-600' : 'bg-white dark:bg-black'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <button
            onClick={onExit}
            className="text-[13px] font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            Registrati
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Demo Provider
// =============================================================================
export function DemoProvider({ children, initialIsDemo = false }: { children: React.ReactNode; initialIsDemo?: boolean }) {
  const [isDemo, setIsDemo] = useState(initialIsDemo);
  const [totalClicks, setTotalClicks] = useState(0);
  const [showWall, setShowWall] = useState(false);
  const router = useRouter();
  const clicksRef = useRef(0);

  // Init from localStorage
  useEffect(() => {
    const demo = localStorage.getItem(DEMO_KEY) === 'true';
    setIsDemo(demo);
    if (demo) {
      const clicks = parseInt(localStorage.getItem(DEMO_CLICKS_KEY) || '0', 10);
      setTotalClicks(clicks);
      clicksRef.current = clicks;
      if (clicks >= MAX_CLICKS) setShowWall(true);
    }
  }, []);

  // Track clicks globally
  useEffect(() => {
    if (!isDemo) return;

    const handleClick = () => {
      clicksRef.current += 1;
      const newCount = clicksRef.current;
      setTotalClicks(newCount);
      localStorage.setItem(DEMO_CLICKS_KEY, String(newCount));
      if (newCount >= MAX_CLICKS) {
        setShowWall(true);
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isDemo]);

  const exitDemo = useCallback(() => {
    setDemoMode(false);
    setIsDemo(false);
    router.push('/auth');
  }, [router]);

  const clicksLeft = Math.max(0, MAX_CLICKS - totalClicks);

  return (
    <DemoContext.Provider value={{ isDemo, clicksLeft, totalClicks, exitDemo }}>
      <div>
        {isDemo && <DemoBanner clicksLeft={clicksLeft} onExit={exitDemo} />}
      </div>
      <div className={isDemo ? 'pt-[40px]' : ''}>
        {children}
      </div>
      <AnimatePresence>
        {showWall && <DemoWall onClose={() => setShowWall(false)} />}
      </AnimatePresence>
    </DemoContext.Provider>
  );
}
