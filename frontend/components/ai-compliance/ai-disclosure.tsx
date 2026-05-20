'use client';

import { useState } from 'react';
import { Sparkles, PenLine, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AiDisclosureProps {
  /** AI feature identifier, e.g. "damage_analysis" */
  feature: string;
  /** Confidence score 0-1 from the AI model */
  confidence?: number;
  /** Callback for human override action */
  onOverride?: () => void;
  /** Additional CSS classes */
  className?: string;
}

const FEATURE_LABELS: Record<string, string> = {
  damage_analysis: 'Analisi danni',
  diagnosis_suggestion: 'Suggerimento diagnosi',
  price_estimate: 'Stima prezzo',
  parts_recommendation: 'Raccomandazione ricambi',
};

/**
 * EU AI Act transparency component.
 *
 * Displays a badge indicating AI-generated content with confidence level
 * and an optional human override action. Required for EU AI Act compliance
 * (effective August 2, 2026).
 */
export function AiDisclosure({ feature, confidence, onOverride, className }: AiDisclosureProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const label = FEATURE_LABELS[feature] ?? feature;
  const confidencePercent = confidence != null ? Math.round(confidence * 100) : null;

  return (
    <div className={cn('relative inline-flex items-center gap-1', className)}>
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1',
          'bg-[var(--brand)]/10 dark:bg-[var(--brand)]/30/40',
          'text-[var(--brand)] dark:text-[var(--brand)]',
          'text-xs font-medium',
          'border border-[var(--brand)]/20 dark:border-[var(--brand)]',
        )}
      >
        <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
        <span>
          Assistito da IA
          {confidencePercent != null && (
            <span className="ml-1 opacity-75">({confidencePercent}% confidenza)</span>
          )}
        </span>

        {/* Info icon for tooltip */}
        <button
          type="button"
          className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--brand)]/20 dark:hover:bg-[var(--brand)] transition-colors"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          aria-label="Informazioni sull'assistenza IA"
        >
          <Info className="h-3 w-3" />
        </button>
      </div>

      {/* Human override link */}
      {onOverride && (
        <button
          type="button"
          onClick={onOverride}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
            'text-xs font-medium',
            'text-[var(--status-warning)] dark:text-[var(--status-warning)]',
            'hover:bg-[var(--status-warning)]/10 dark:hover:bg-[var(--status-warning)]/40/40',
            'transition-colors',
            'min-h-[44px] min-w-[44px] justify-center',
          )}
        >
          <PenLine className="h-3.5 w-3.5" />
          <span>Modifica decisione</span>
        </button>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div
          role="tooltip"
          className={cn(
            'absolute bottom-full left-0 z-50 mb-2 w-72',
            'rounded-lg border border-[var(--border-default)] dark:border-[var(--border-default)]',
            'bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)]',
            'p-3 text-xs text-[var(--text-primary)] dark:text-[var(--text-primary)]',
            'shadow-lg',
          )}
        >
          <p className="font-medium mb-1">
            {label} - Assistito da Intelligenza Artificiale
          </p>
          <p>
            Questo contenuto è stato generato con l&apos;ausilio dell&apos;intelligenza artificiale.
            Puoi modificarlo o sostituirlo manualmente in qualsiasi momento.
          </p>
          {confidencePercent != null && (
            <p className="mt-1 text-[var(--brand)] dark:text-[var(--brand)]">
              Livello di confidenza del modello: {confidencePercent}%
            </p>
          )}
          <p className="mt-1 opacity-60">
            Conformità EU AI Act (Reg. 2024/1689)
          </p>
        </div>
      )}
    </div>
  );
}
