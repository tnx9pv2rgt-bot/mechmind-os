'use client';

import React from 'react';

interface DemoCTAProps {
  onStartDemo: () => void;
  isLoading?: boolean;
}

export function DemoCTA({ onStartDemo, isLoading = false }: DemoCTAProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onStartDemo}
      disabled={isLoading}
      className={[
        'flex h-[52px] w-full items-center justify-center gap-2 rounded-full',
        'border border-[var(--border-strong)] bg-transparent text-base font-normal text-white',
        'transition-colors hover:bg-white/5',
        'disabled:cursor-not-allowed disabled:opacity-50',
      ].join(' ')}
    >
      {isLoading ? (
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
      ) : (
        'Prova gratis senza registrarti \u2192'
      )}
    </button>
  );
}
