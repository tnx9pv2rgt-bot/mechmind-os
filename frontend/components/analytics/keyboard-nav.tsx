'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';

interface ShortcutDef {
  key: string;
  label: string;
  description: string;
}

const SHORTCUTS: ShortcutDef[] = [
  { key: '?', label: '?', description: 'Mostra/nascondi scorciatoie' },
  { key: 'f', label: 'F', description: 'Attiva/disattiva schermo intero' },
  { key: 'e', label: 'E', description: 'Apri menu esportazione' },
  { key: 'p', label: 'P', description: 'Cambia periodo temporale' },
  { key: 'ArrowUp', label: '\u2191', description: 'Sezione precedente' },
  { key: 'ArrowDown', label: '\u2193', description: 'Sezione successiva' },
  { key: 'Escape', label: 'Esc', description: 'Chiudi overlay' },
];

interface UseAnalyticsKeyboardOptions {
  onToggleFullscreen?: () => void;
  onOpenExport?: () => void;
  onCyclePeriod?: () => void;
}

export function useAnalyticsKeyboard(
  sections: string[],
  options?: UseAnalyticsKeyboardOptions,
): {
  showShortcuts: boolean;
  setShowShortcuts: (v: boolean) => void;
  currentSectionIndex: number;
} {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  const isTyping = useCallback((): boolean => {
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if ((active as HTMLElement).contentEditable === 'true') return true;
    return false;
  }, []);

  const scrollToSection = useCallback(
    (index: number) => {
      if (index < 0 || index >= sections.length) return;
      const el = document.getElementById(sections[index]);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.focus({ preventScroll: true });
      }
    },
    [sections],
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      // Don't capture when typing in inputs
      if (isTyping()) return;

      switch (e.key) {
        case '?':
          e.preventDefault();
          setShowShortcuts((prev) => !prev);
          break;

        case 'f':
          e.preventDefault();
          options?.onToggleFullscreen?.();
          break;

        case 'e':
          e.preventDefault();
          options?.onOpenExport?.();
          break;

        case 'p':
          e.preventDefault();
          options?.onCyclePeriod?.();
          break;

        case 'ArrowDown':
          if (!e.altKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setCurrentSectionIndex((prev) => {
              const next = Math.min(prev + 1, sections.length - 1);
              scrollToSection(next);
              return next;
            });
          }
          break;

        case 'ArrowUp':
          if (!e.altKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setCurrentSectionIndex((prev) => {
              const next = Math.max(prev - 1, 0);
              scrollToSection(next);
              return next;
            });
          }
          break;

        case 'Escape':
          setShowShortcuts(false);
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isTyping, options, scrollToSection, sections.length]);

  return { showShortcuts, setShowShortcuts, currentSectionIndex };
}

interface KeyboardShortcutsOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsOverlay({
  open,
  onClose,
}: KeyboardShortcutsOverlayProps): React.ReactElement {
  const reducedMotion = useReducedMotion();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-label="Scorciatoie da tastiera"
            aria-modal="true"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed left-1/2 top-1/2 z-[61] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-elevated)]/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-strong)] px-6 py-4">
              <div className="flex items-center gap-3">
                <Keyboard className="h-5 w-5 text-[var(--brand)]" />
                <h2 className="text-base font-semibold text-white">Scorciatoie da Tastiera</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-active)] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                aria-label="Chiudi scorciatoie"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Shortcuts list */}
            <div className="px-6 py-4">
              <ul className="space-y-3">
                {SHORTCUTS.map((shortcut) => (
                  <li key={shortcut.key} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">{shortcut.description}</span>
                    <kbd className="ml-4 flex h-7 min-w-[28px] flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface-active)] px-2 font-mono text-xs text-white">
                      {shortcut.label}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--border-strong)] px-6 py-3">
              <p className="text-center text-xs text-[var(--text-secondary)]">
                Le scorciatoie sono disabilitate durante la digitazione
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
