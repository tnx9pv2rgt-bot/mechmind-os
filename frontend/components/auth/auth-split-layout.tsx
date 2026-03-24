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
      <div className="flex min-h-screen w-full items-center justify-center bg-[#1a1a1a]">
        <div className="flex w-full items-center justify-center p-4">
        <div className="relative flex w-full max-w-[373px] flex-col overflow-hidden rounded-2xl bg-[#2f2f2f] shadow-[0_0_60px_rgba(0,0,0,0.5)] sm:max-w-[388px]">
          {/* Header */}
          <header className="flex min-h-[52px] select-none justify-between p-2.5 pb-0 ps-4">
            <div className="flex max-w-full items-center">
              {showBack && onBack && (
                <button
                  onClick={onBack}
                  className="text-[15px] text-[#b4b4b4] transition-colors hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Indietro"
                >
                  &larr;
                </button>
              )}
            </div>
            <div className="flex items-center">
              <button
                onClick={() => {
                  const referrer = document.referrer;
                  if (referrer && new URL(referrer).origin === window.location.origin && window.history.length > 2) {
                    window.history.back();
                  } else {
                    window.location.href = '/';
                  }
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#b4b4b4] transition-colors hover:bg-white/10 min-h-[44px] min-w-[44px]"
                aria-label="Chiudi"
                type="button"
              >
                <span className="text-lg pointer-events-none" aria-hidden="true">✕</span>
              </button>
            </div>
          </header>

          {/* Content */}
          <div className="grow overflow-y-auto overflow-hidden">
            <div className="flex flex-col items-stretch gap-5 px-6 pb-4">
              {children}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-3 px-6 pb-4 pt-0">
            <Link
              href="/terms"
              className="text-[12px] text-[#888] transition-colors hover:text-white min-h-[44px] inline-flex items-center"
            >
              Condizioni d&apos;uso
            </Link>
            <span className="text-[#555]">&middot;</span>
            <Link
              href="/privacy"
              className="text-[12px] text-[#888] transition-colors hover:text-white min-h-[44px] min-w-[44px] justify-center inline-flex items-center"
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
