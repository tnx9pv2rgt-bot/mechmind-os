'use client';

import React, { useState, useMemo } from 'react';

interface PasskeyPromptProps {
  onRegister: () => Promise<void>;
  onSkip: () => void;
  isRegistering?: boolean;
}

const btnPrimary = [
  'flex h-[52px] w-full items-center justify-center rounded-full',
  'bg-white text-base font-normal text-[#0d0d0d]',
  'transition-colors hover:bg-[#e5e5e5]',
  'disabled:opacity-30',
].join(' ');

function detectPlatform(): { label: string; icon: string; description: string } {
  if (typeof navigator === 'undefined') {
    return { label: 'Attiva accesso biometrico', icon: '🔐', description: 'Accedi con biometria la prossima volta' };
  }

  const ua = navigator.userAgent;
  const platform = navigator.platform || '';

  // iOS
  if (/iPhone|iPad|iPod/.test(ua)) {
    return {
      label: 'Attiva Face ID / Touch ID',
      icon: '🍎',
      description: 'Usa Face ID o Touch ID per accedere in un istante.',
    };
  }

  // macOS
  if (/Mac/.test(platform)) {
    return {
      label: 'Attiva Touch ID',
      icon: '🍎',
      description: 'Usa Touch ID sul tuo Mac per accedere in un istante.',
    };
  }

  // Android
  if (/Android/.test(ua)) {
    return {
      label: 'Attiva impronta digitale',
      icon: '📱',
      description: 'Usa impronta digitale o riconoscimento facciale per accedere.',
    };
  }

  // Windows
  if (/Win/.test(platform)) {
    return {
      label: 'Attiva Windows Hello',
      icon: '🪟',
      description: 'Usa PIN, impronta digitale o riconoscimento facciale per accedere.',
    };
  }

  // Linux / fallback
  return {
    label: 'Attiva accesso biometrico',
    icon: '🔐',
    description: 'Usa una passkey per accedere in modo sicuro e veloce.',
  };
}

export function PasskeyPrompt({
  onRegister,
  onSkip,
  isRegistering = false,
}: PasskeyPromptProps): React.ReactElement {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const platformInfo = useMemo(() => detectPlatform(), []);

  const handleSkip = (): void => {
    if (dontShowAgain) {
      localStorage.setItem('mechmind_skip_passkey', 'true');
    }
    onSkip();
  };

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
        <span className="text-3xl">{platformInfo.icon}</span>
      </div>

      {/* Title & Description */}
      <div className="space-y-2">
        <h2 className="text-xl font-normal text-white">
          Accesso più veloce
        </h2>
        <p className="text-sm text-[#888]">
          {platformInfo.description}
        </p>
      </div>

      {/* Primary button */}
      <button
        type="button"
        onClick={onRegister}
        disabled={isRegistering}
        className={btnPrimary}
      >
        {isRegistering ? (
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#0d0d0d] border-t-transparent" />
        ) : (
          platformInfo.label
        )}
      </button>

      {/* Secondary: Skip */}
      <button
        type="button"
        onClick={handleSkip}
        className="min-h-[44px] text-sm text-[#888] transition-colors hover:text-white"
      >
        Non ora, grazie &rarr;
      </button>

      {/* Don't show again checkbox */}
      <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-[#888]">
        <input
          type="checkbox"
          checked={dontShowAgain}
          onChange={(e) => setDontShowAgain(e.target.checked)}
          className="h-4 w-4 rounded border-[#4e4e4e] bg-[#2f2f2f] accent-white"
        />
        Non mostrare pi&ugrave;
      </label>
    </div>
  );
}
