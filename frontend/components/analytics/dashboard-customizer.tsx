'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Settings2, X, RotateCcw } from 'lucide-react';

const STORAGE_KEY = 'mechmind_dashboard_prefs';

export interface DashboardPrefs {
  kpi: boolean;
  graficiBase: boolean;
  gaugeEfficienza: boolean;
  heatmap: boolean;
  funnel: boolean;
  sankey: boolean;
  treemap: boolean;
  bullet: boolean;
  centroControllo: boolean;
}

const DEFAULT_PREFS: DashboardPrefs = {
  kpi: true,
  graficiBase: true,
  gaugeEfficienza: true,
  heatmap: true,
  funnel: true,
  sankey: true,
  treemap: true,
  bullet: true,
  centroControllo: true,
};

const SECTION_LABELS: Record<keyof DashboardPrefs, string> = {
  kpi: 'KPI',
  graficiBase: 'Grafici Base',
  gaugeEfficienza: 'Gauge Efficienza',
  heatmap: 'Heatmap',
  funnel: 'Funnel',
  sankey: 'Sankey',
  treemap: 'Treemap',
  bullet: 'Bullet',
  centroControllo: 'Centro Controllo',
};

function loadPrefs(): DashboardPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<DashboardPrefs>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(prefs: DashboardPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function useDashboardPrefs(): {
  prefs: DashboardPrefs;
  toggleSection: (key: keyof DashboardPrefs) => void;
  resetDefaults: () => void;
} {
  const [prefs, setPrefs] = useState<DashboardPrefs>(DEFAULT_PREFS);

  // Hydrate from localStorage after mount
  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const toggleSection = useCallback((key: keyof DashboardPrefs) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      savePrefs(next);
      return next;
    });
  }, []);

  const resetDefaults = useCallback(() => {
    const defaults = { ...DEFAULT_PREFS };
    savePrefs(defaults);
    setPrefs(defaults);
  }, []);

  return { prefs, toggleSection, resetDefaults };
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  id: string;
}

function ToggleSwitch({ checked, onChange, label, id }: ToggleSwitchProps): React.ReactElement {
  const reducedMotion = useReducedMotion();

  return (
    <div className="flex items-center justify-between py-3">
      <label htmlFor={id} className="cursor-pointer text-sm text-[var(--text-secondary)]">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-default)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-elevated)] ${
          checked ? 'bg-[var(--surface-primary)]' : 'bg-[var(--surface-active)]'
        }`}
        style={{ minWidth: 48, minHeight: 28 }}
      >
        <motion.div
          className={`absolute top-0.5 h-6 w-6 rounded-full shadow-md ${
            checked ? 'bg-[var(--surface-tertiary)]' : 'bg-[var(--text-secondary)]'
          }`}
          animate={{ left: checked ? 22 : 2 }}
          transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

interface DashboardCustomizerProps {
  className?: string;
}

export function DashboardCustomizer({ className = '' }: DashboardCustomizerProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { prefs, toggleSection, resetDefaults } = useDashboardPrefs();
  const reducedMotion = useReducedMotion();

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent): void {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  // Trap focus inside panel when open
  useEffect(() => {
    if (!open) return;
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>('button, [role="switch"]');
    firstFocusable?.focus();
  }, [open]);

  const sectionKeys = Object.keys(SECTION_LABELS) as (keyof DashboardPrefs)[];

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors duration-200 hover:bg-[var(--surface-active)] hover:text-[var(--text-on-brand)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-default)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-tertiary)]"
        aria-label="Personalizza dashboard"
        aria-expanded={open}
      >
        <Settings2 className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-[var(--surface-primary)]/40"
              aria-hidden="true"
              onClick={() => setOpen(false)}
            />

            {/* Slide-in panel */}
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-label="Personalizza sezioni dashboard"
              aria-modal="true"
              initial={reducedMotion ? { opacity: 0 } : { x: '100%' }}
              animate={reducedMotion ? { opacity: 1 } : { x: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { x: '100%' }}
              transition={reducedMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 z-50 flex h-full w-80 max-w-[90vw] flex-col border-l border-[var(--border-strong)] bg-[var(--surface-elevated)] shadow-[0_0_60px_rgba(0,0,0,0.5)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--border-strong)] px-5 py-4">
                <h2 className="text-base font-semibold text-[var(--text-on-brand)]">Personalizza</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-active)] hover:text-[var(--text-on-brand)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-default)]/40"
                  aria-label="Chiudi pannello personalizzazione"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Toggles */}
              <div className="flex-1 overflow-y-auto px-5 py-2">
                <p className="mb-2 text-xs text-[var(--text-secondary)]">
                  Seleziona le sezioni da mostrare nella dashboard
                </p>
                <div className="divide-y divide-[var(--border-strong)]">
                  {sectionKeys.map((key) => (
                    <ToggleSwitch
                      key={key}
                      id={`toggle-${key}`}
                      checked={prefs[key]}
                      onChange={() => toggleSection(key)}
                      label={SECTION_LABELS[key]}
                    />
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-[var(--border-strong)] px-5 py-4">
                <button
                  type="button"
                  onClick={resetDefaults}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-active)] hover:text-[var(--text-on-brand)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-default)]/40"
                  aria-label="Ripristina impostazioni predefinite"
                >
                  <RotateCcw className="h-4 w-4" />
                  Ripristina predefiniti
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
