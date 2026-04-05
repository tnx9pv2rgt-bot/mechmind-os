'use client';

import Link from 'next/link';
import { MotionConfig } from 'framer-motion';

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}

export function AuthSplitLayout({ children, showBack, onBack }: AuthSplitLayoutProps): React.ReactElement {
  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen w-full items-center justify-center bg-[var(--surface-tertiary)]">
        <div className="flex w-full items-center justify-center p-4">
        <div className="relative flex w-full max-w-[373px] flex-col overflow-hidden sm:max-w-[388px]">
          {/* Content */}
          <div className="grow overflow-y-auto overflow-hidden">
            <div className="flex flex-col items-stretch gap-5 px-6 pb-4">
              {/* Header row: back + close */}
              <div className="flex select-none justify-between items-center -mx-2">
                <div className="flex items-center">
                  {showBack && onBack && (
                    <button
                      onClick={onBack}
                      className="text-[15px] text-[var(--text-secondary)] transition-colors hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Indietro"
                    >
                      &larr;
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    const referrer = document.referrer;
                    if (referrer && new URL(referrer).origin === window.location.origin && window.history.length > 2) {
                      window.history.back();
                    } else {
                      window.location.href = '/';
                    }
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-white/10 min-h-[44px] min-w-[44px]"
                  aria-label="Chiudi"
                  type="button"
                >
                  <span className="text-lg pointer-events-none" aria-hidden="true">✕</span>
                </button>
              </div>
              {children}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-3 px-6 pb-4 pt-0">
            <Link
              href="/terms"
              className="text-[12px] text-[var(--text-tertiary)] transition-colors hover:text-white min-h-[44px] inline-flex items-center"
            >
              Condizioni d&apos;uso
            </Link>
            <span className="text-[var(--text-tertiary)]">&middot;</span>
            <Link
              href="/privacy"
              className="text-[12px] text-[var(--text-tertiary)] transition-colors hover:text-white min-h-[44px] min-w-[44px] justify-center inline-flex items-center"
            >
              Privacy
            </Link>
          </div>
        </div>
        </div>
      </div>
    </MotionConfig>
  );
}
