'use client';

import { motion, MotionConfig } from 'framer-motion';
import { ArrowRight, LayoutDashboard } from 'lucide-react';

interface WelcomeScreenProps {
  userName: string;
  shopType: string;
  onGoToDashboard: () => void;
  onWatchTutorial?: () => void;
}

const btnPrimary = [
  'flex h-[52px] w-full items-center justify-center gap-2 rounded-full',
  'bg-white text-base font-medium text-[var(--text-primary)]',
  'transition-colors hover:bg-[var(--surface-active)]',
].join(' ');

export function WelcomeScreen({
  userName,
  onGoToDashboard,
}: WelcomeScreenProps): React.ReactElement {
  const displayName = userName || 'il tuo account';

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen w-full items-center justify-center bg-[var(--surface-tertiary)]">
        <div className="flex w-full items-center justify-center p-4">
          <div className="relative flex w-full max-w-[400px] flex-col overflow-hidden rounded-2xl bg-[var(--surface-elevated)] shadow-[0_0_60px_rgba(0,0,0,0.5)] sm:max-w-[420px]">
            <div className="flex flex-col items-stretch gap-6 px-6 py-8">
              {/* Icon */}
              <motion.div
                className="flex justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                  <LayoutDashboard className="h-8 w-8 text-white" />
                </div>
              </motion.div>

              {/* Title */}
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-2xl font-normal text-white">
                  Tutto pronto{userName ? `, ${displayName}` : ''}!
                </h1>
                <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
                  La tua officina è stata creata. Ora puoi iniziare a usare MechMind.
                </p>
              </motion.div>

              {/* What's next */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <p className="text-[13px] font-medium text-[var(--text-tertiary)]">Prossimi passi:</p>
                {[
                  'Aggiungi il primo cliente',
                  'Configura i dati di fatturazione',
                  'Imposta gli orari di apertura',
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-active)] px-3 py-2.5"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--border-strong)] text-[11px] text-[var(--text-tertiary)]">
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-[var(--text-primary)]">{item}</span>
                  </div>
                ))}
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <button type="button" onClick={onGoToDashboard} className={btnPrimary}>
                  Vai alla Dashboard
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
