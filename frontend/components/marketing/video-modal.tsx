'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';


interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VideoModal({ isOpen, onClose }: VideoModalProps): React.ReactElement {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl bg-[#0d0d0d] shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              aria-label="Chiudi video"
            >
              <span className="pointer-events-none" aria-hidden="true">✕</span>
            </button>

            {/* Video placeholder */}
            <div className="relative aspect-video w-full bg-[var(--surface-secondary)]">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/60">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30">
                  <span className="ml-1 text-3xl text-white">▶</span>
                </div>
                <p className="text-sm">Video demo MechMind OS — 90 secondi</p>
                <p className="max-w-sm text-center text-xs text-white/40">
                  Dal check-in alla fattura: vedi come funziona un flusso completo in officina.
                </p>
              </div>
            </div>

            {/* CTA overlay at bottom */}
            <div className="flex items-center justify-between bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/90 to-transparent px-6 py-4">
              <p className="text-sm text-white/60">
                Pronto a provarlo?
              </p>
              <a
                href="/auth/register"
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-active)]"
              >
                Inizia gratis &rarr;
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
