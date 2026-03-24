'use client';

import React, { useEffect, useState, useCallback } from 'react';

interface MagicLinkSentProps {
  email: string;
  onResend: () => Promise<void>;
  onBackToPassword: () => void;
  isResending?: boolean;
}

const COOLDOWN_SECONDS = 60;

const btnPrimary = [
  'flex h-[52px] w-full items-center justify-center rounded-full',
  'bg-white text-base font-normal text-[#0d0d0d]',
  'transition-colors hover:bg-[#e5e5e5]',
  'disabled:opacity-30',
].join(' ');

interface EmailProvider {
  label: string;
  url: string;
}

function getEmailProvider(email: string): EmailProvider | null {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return { label: 'Apri Gmail', url: 'https://mail.google.com' };
  }
  if (['outlook.com', 'hotmail.com', 'live.com', 'outlook.it'].includes(domain)) {
    return { label: 'Apri Outlook', url: 'https://outlook.live.com' };
  }
  if (domain === 'yahoo.com' || domain === 'yahoo.it') {
    return { label: 'Apri Yahoo Mail', url: 'https://mail.yahoo.com' };
  }

  return null;
}

export function MagicLinkSent({
  email,
  onResend,
  onBackToPassword,
  isResending = false,
}: MagicLinkSentProps): React.ReactElement {
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = useCallback(async (): Promise<void> => {
    if (cooldown > 0 || isResending) return;
    await onResend();
    setCooldown(COOLDOWN_SECONDS);
  }, [cooldown, isResending, onResend]);

  const provider = getEmailProvider(email);

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
        <span className="text-3xl text-white">&#9993;</span>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <h2 className="text-xl font-normal text-white">
          Controlla la tua email
        </h2>
        <p className="text-sm text-[#888]">
          Abbiamo inviato un link di accesso a:
        </p>
        <p className="text-sm font-normal text-white">
          {email}
        </p>
      </div>

      {/* Description */}
      <p className="text-sm text-[#888]">
        Clicca il link nell&apos;email per accedere. Nessuna password necessaria.
      </p>

      {/* Provider button */}
      {provider && (
        <a
          href={provider.url}
          target="_blank"
          rel="noopener noreferrer"
          className={btnPrimary}
        >
          {provider.label}
        </a>
      )}

      {/* Resend */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || isResending}
          className={[
            'min-h-[44px] text-sm font-normal transition-colors',
            cooldown > 0 || isResending
              ? 'cursor-not-allowed text-[#555]'
              : 'text-[#b4b4b4] hover:text-white',
          ].join(' ')}
        >
          {isResending
            ? 'Invio in corso...'
            : cooldown > 0
              ? `Reinvia disponibile tra ${cooldown}s`
              : 'Reinvia link'}
        </button>

        <p className="text-xs text-[#888]">
          Non trovi l&apos;email? Controlla lo spam
        </p>
      </div>

      {/* Back to password */}
      <button
        type="button"
        onClick={onBackToPassword}
        className="min-h-[44px] text-sm text-[#888] transition-colors hover:text-white"
      >
        Preferisci usare la password? Accedi con password &rarr;
      </button>
    </div>
  );
}
