'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { UseFormWatch, UseFormReset, FieldValues } from 'react-hook-form';

const AUTOSAVE_INTERVAL = 30_000; // 30 seconds

export function useFormAutosave<T extends FieldValues>(
  watch: UseFormWatch<T>,
  reset: UseFormReset<T>,
  storageKey: string,
  enabled = true
): { clearDraft: () => void; hasDraft: boolean } {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  // Restore draft on mount
  useEffect(() => {
    if (!enabled) return;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as T & { voiceNote?: unknown };
        delete parsed.voiceNote;
        reset(parsed, { keepDefaultValues: true });
        setHasDraft(true);
      }
    } catch {
      sessionStorage.removeItem(storageKey);
    }
  }, [reset, enabled, storageKey]);

  // Save every 30s
  useEffect(() => {
    if (!enabled) return;
    timerRef.current = setInterval(() => {
      try {
        const values = watch();
        sessionStorage.setItem(storageKey, JSON.stringify(values));
        setHasDraft(true);
      } catch {
        // sessionStorage full or unavailable — ignore
      }
    }, AUTOSAVE_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [watch, enabled, storageKey]);

  const clearDraft = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    setHasDraft(false);
  }, [storageKey]);

  return { clearDraft, hasDraft };
}
