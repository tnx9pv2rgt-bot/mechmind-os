'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ZxcvbnResult {
  score: 0 | 1 | 2 | 3 | 4;
}

const SCORE_CONFIG: Record<number, { label: string; color: string; bgColor: string }> = {
  0: { label: 'Molto debole', color: 'text-[var(--text-tertiary)]', bgColor: 'bg-[var(--text-tertiary)]' },
  1: { label: 'Debole', color: 'text-[var(--text-tertiary)]', bgColor: 'bg-[var(--text-tertiary)]' },
  2: { label: 'Discreta', color: 'text-[var(--text-secondary)]', bgColor: 'bg-[var(--text-secondary)]' },
  3: { label: 'Buona', color: 'text-[var(--text-primary)]', bgColor: 'bg-[var(--text-primary)]' },
  4: { label: 'Forte', color: 'text-[var(--text-on-brand)]', bgColor: 'bg-[var(--surface-primary)]' },
};

const TOTAL_SEGMENTS = 10;

export function PasswordStrength({ password }: { password: string }): React.ReactElement | null {
  const [score, setScore] = useState<number>(0);

  useEffect(() => {
    if (!password) {
      setScore(0);
      return;
    }

    let cancelled = false;

    const evaluate = async (): Promise<void> => {
      try {
        const [{ zxcvbnOptions, zxcvbnAsync }, common, italian] = await Promise.all([
          import('@zxcvbn-ts/core'),
          import('@zxcvbn-ts/language-common'),
          import('@zxcvbn-ts/language-it'),
        ]);

        if (cancelled) return;

        zxcvbnOptions.setOptions({
          dictionary: {
            ...common.dictionary,
            ...italian.dictionary,
          },
          graphs: common.adjacencyGraphs,
          useLevenshteinDistance: true,
        });

        const result = await zxcvbnAsync(password) as ZxcvbnResult;

        if (!cancelled) {
          setScore(result.score);
        }
      } catch {
        if (!cancelled) {
          const basic = Math.min(4, Math.floor(password.length / 4)) as 0 | 1 | 2 | 3 | 4;
          setScore(basic);
        }
      }
    };

    void evaluate();

    return () => {
      cancelled = true;
    };
  }, [password]);

  if (!password) return null;

  const config = SCORE_CONFIG[score];
  const filledSegments = score === 0 ? 1 : score === 1 ? 3 : score === 2 ? 5 : score === 3 ? 7 : 10;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => (
          <motion.div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < filledSegments ? config.bgColor : 'bg-[var(--border-strong)]'
            }`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.3, delay: i * 0.03 }}
            style={{ transformOrigin: 'left' }}
          />
        ))}
      </div>
      <p className={`text-xs font-normal ${config.color}`}>{config.label}</p>
    </div>
  );
}
