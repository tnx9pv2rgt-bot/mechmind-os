'use client';

import { useEffect } from 'react';
import { useWindowSize } from 'react-use';
import Confetti from 'react-confetti';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiCelebrationProps {
  isActive: boolean;
  duration?: number;
  onComplete?: () => void;
  particleCount?: number;
}

export const ConfettiCelebration = ({ 
  isActive, 
  duration = 3000,
  onComplete,
  particleCount = 200
}: ConfettiCelebrationProps) => {
  const { width, height } = useWindowSize();

  useEffect(() => {
    if (!isActive) return;

    // Haptic feedback (mobile)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    const timeout = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => clearTimeout(timeout);
  }, [isActive, duration, onComplete]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 pointer-events-none z-50"
        >
          <Confetti
            width={width}
            height={height}
            numberOfPieces={particleCount}
            recycle={false}
            gravity={0.3}
            colors={[
              '#007AFF', // Apple Blue
              '#34C759', // Apple Green  
              '#FF9500', // Apple Orange
              '#FF3B30', // Apple Red
              '#AF52DE', // Apple Purple
              '#5856D6', // Apple Indigo
              '#FF2D55', // Apple Pink
              '#5AC8FA'  // Apple Light Blue
            ]}
            tweenDuration={duration}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Hook per triggerare celebrazione
import { useState, useCallback } from 'react';

export const useCelebration = () => {
  const [isCelebrating, setIsCelebrating] = useState(false);

  const trigger = useCallback(() => {
    setIsCelebrating(true);
  }, []);

  const stop = useCallback(() => {
    setIsCelebrating(false);
  }, []);

  return { isCelebrating, trigger, stop };
};
