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
          'bg-violet-100 dark:bg-violet-900/40',
          'text-violet-800 dark:text-violet-200',
          'text-xs font-medium',
          'border border-violet-200 dark:border-violet-700',
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
          className="ml-0.5 rounded-full p-0.5 hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors"
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
            'text-amber-700 dark:text-amber-300',
            'hover:bg-amber-100 dark:hover:bg-amber-900/40',
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
            'rounded-lg border border-gray-200 dark:border-gray-700',
            'bg-white dark:bg-gray-800',
            'p-3 text-xs text-gray-700 dark:text-gray-300',
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
            <p className="mt-1 text-violet-600 dark:text-violet-400">
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
