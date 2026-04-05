'use client';

import React from 'react';

interface SocialButtonsProps {
  isLoading?: boolean;
  loadingButton?: 'google' | 'magiclink' | null;
  onGoogleClick?: () => void;
  onMagicLinkClick?: () => void;
  emailMissing?: boolean;
}

function GoogleIcon(): React.ReactElement {
  return (
    <svg className="h-[19px] w-[19px]" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon(): React.ReactElement {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function MagicLinkIcon(): React.ReactElement {
  return (
    <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function ButtonSpinner(): React.ReactElement {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
  );
}

const btnSecondary = [
  'flex h-[52px] w-full items-center justify-center rounded-full',
  'border border-[var(--border-strong)] bg-transparent',
  'text-base font-normal text-white',
  'transition-all hover:bg-white/5',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

export function SocialButtons({
  isLoading = false,
  loadingButton = null,
  onGoogleClick,
  onMagicLinkClick,
  emailMissing = false,
}: SocialButtonsProps): React.ReactElement {
  const isGoogleLoading = loadingButton === 'google';
  const isMagicLinkLoading = loadingButton === 'magiclink';
  const anyLoading = isLoading || loadingButton !== null;

  return (
    <div className="flex flex-col gap-3">
      {/* Google */}
      <button
        type="button"
        disabled={anyLoading}
        onClick={onGoogleClick}
        className={`${btnSecondary} ${isGoogleLoading ? '!border-white/30 !bg-white/5' : ''}`}
      >
        <div className="flex items-center justify-center gap-2">
          {isGoogleLoading ? (
            <ButtonSpinner />
          ) : (
            <span className="relative grid h-4 w-4 place-items-center">
              <span className="absolute"><GoogleIcon /></span>
            </span>
          )}
          {isGoogleLoading ? 'Connessione a Google...' : 'Continua con Google'}
        </div>
      </button>

      {/* Apple — coming soon */}
      <button
        type="button"
        disabled
        className={`${btnSecondary} !opacity-40 !cursor-not-allowed`}
        title="In arrivo"
      >
        <div className="flex items-center justify-center gap-2">
          <span className="relative grid h-4 w-4 place-items-center">
            <span className="absolute"><AppleIcon /></span>
          </span>
          Continua con Apple
          <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Presto</span>
        </div>
      </button>

      {/* Magic Link */}
      <button
        type="button"
        disabled={anyLoading}
        onClick={onMagicLinkClick}
        className={`${btnSecondary} ${isMagicLinkLoading ? '!border-white/30 !bg-white/5' : ''} ${emailMissing ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
      >
        <div className="flex items-center justify-center gap-2">
          {isMagicLinkLoading ? (
            <ButtonSpinner />
          ) : (
            <span className="relative grid h-4 w-4 place-items-center">
              <span className="absolute"><MagicLinkIcon /></span>
            </span>
          )}
          {isMagicLinkLoading ? 'Invio in corso...' : 'Accedi con magic link'}
        </div>
      </button>
    </div>
  );
}
