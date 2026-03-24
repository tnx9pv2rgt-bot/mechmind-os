'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// =============================================================================
// Types
// =============================================================================
interface ConsentData {
  necessary: boolean;
  analytics: boolean;
  timestamp: string;
}

const CONSENT_KEY = 'mechmind-cookie-consent';
const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 12 months

// =============================================================================
// Helpers
// =============================================================================
function getStoredConsent(): ConsentData | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ConsentData;

    // Check expiration (12 months)
    const consentDate = new Date(data.timestamp).getTime();
    if (Date.now() - consentDate > CONSENT_MAX_AGE_MS) {
      localStorage.removeItem(CONSENT_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function saveConsent(data: ConsentData): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable
  }
  // Update Google Consent Mode v2 if gtag is available
  updateGoogleConsent(data);
  // Dispatch event so other components can react
  window.dispatchEvent(new CustomEvent('mechmind-consent-update', { detail: data }));
}

function updateGoogleConsent(data: ConsentData): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as Record<string, unknown>).gtag as
    | ((...args: unknown[]) => void)
    | undefined;
  if (!gtag) return;

  gtag('consent', 'update', {
    analytics_storage: data.analytics ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
}

function loadAnalyticsScripts(): void {
  // Load analytics scripts only after consent
  // Scripts marked with data-consent-type="analytics" will be activated
  document.querySelectorAll('script[data-consent-type="analytics"]').forEach((el) => {
    const script = el as HTMLScriptElement;
    if (script.dataset.src && !script.src) {
      script.src = script.dataset.src;
    }
  });
}

// =============================================================================
// Global function to reopen banner (called from footer link)
// =============================================================================
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__mechMindReopenCookieBanner = undefined;
}

// =============================================================================
// Component
// =============================================================================
export function CookieConsent(): React.ReactNode {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  const openBanner = useCallback((): void => {
    const existing = getStoredConsent();
    if (existing) {
      setAnalyticsEnabled(existing.analytics);
    }
    setVisible(true);
  }, []);

  useEffect(() => {
    // Register global reopen function
    (window as unknown as Record<string, unknown>).__mechMindReopenCookieBanner = openBanner;

    const existing = getStoredConsent();
    if (!existing) {
      // No consent or expired — show banner after small delay
      // Block analytics by default (Google Consent Mode v2 defaults)
      updateGoogleConsent({ necessary: true, analytics: false, timestamp: '' });
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }

    // Consent exists and is valid — apply it
    if (existing.analytics) {
      loadAnalyticsScripts();
    }
    updateGoogleConsent(existing);
    return undefined;
  }, [openBanner]);

  const handleAcceptAll = (): void => {
    const data: ConsentData = {
      necessary: true,
      analytics: true,
      timestamp: new Date().toISOString(),
    };
    saveConsent(data);
    loadAnalyticsScripts();
    setVisible(false);
    setShowDetails(false);
  };

  const handleNecessaryOnly = (): void => {
    const data: ConsentData = {
      necessary: true,
      analytics: false,
      timestamp: new Date().toISOString(),
    };
    saveConsent(data);
    setVisible(false);
    setShowDetails(false);
  };

  const handleSavePreferences = (): void => {
    const data: ConsentData = {
      necessary: true,
      analytics: analyticsEnabled,
      timestamp: new Date().toISOString(),
    };
    saveConsent(data);
    if (analyticsEnabled) loadAnalyticsScripts();
    setVisible(false);
    setShowDetails(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed bottom-4 right-4 z-[9999]"
          role="dialog"
          aria-label="Consenso cookie"
        >
          <div className="mx-auto max-w-lg rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            {!showDetails ? (
              /* ---- Main banner ---- */
              <div className="flex flex-col gap-4">
                <p className="text-[15px] leading-relaxed text-[#b4b4b4]">
                  Utilizziamo cookie tecnici necessari per il funzionamento del servizio
                  e cookie analitici per migliorare la tua esperienza. Per maggiori
                  informazioni consulta la nostra{' '}
                  <Link
                    href="/privacy"
                    className="font-medium text-white underline decoration-[#888] underline-offset-2 hover:decoration-white"
                  >
                    Informativa Privacy
                  </Link>
                  .
                </p>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    onClick={() => setShowDetails(true)}
                    className="text-[13px] font-medium text-[#888] transition-colors hover:text-white sm:mr-auto"
                  >
                    Personalizza
                  </button>
                  <button
                    onClick={handleNecessaryOnly}
                    className="h-[44px] rounded-full border border-[#4e4e4e] bg-transparent px-5 text-[15px] font-medium text-white transition-colors hover:bg-white/5"
                  >
                    Solo necessari
                  </button>
                  <button
                    onClick={handleAcceptAll}
                    className="h-[44px] rounded-full bg-white px-5 text-[15px] font-medium text-[#0d0d0d] transition-colors hover:bg-[#e5e5e5]"
                  >
                    Accetta tutti
                  </button>
                </div>
              </div>
            ) : (
              /* ---- Detail panel ---- */
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium text-white">
                    Impostazioni cookie
                  </h3>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-[#888] transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Chiudi dettagli"
                  >
                    <span className="text-lg pointer-events-none" aria-hidden="true">✕</span>
                  </button>
                </div>

                {/* Necessary — always on */}
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <div>
                    <p className="text-[14px] font-medium text-white">Cookie tecnici</p>
                    <p className="text-[12px] text-[#888]">
                      Necessari per il funzionamento. Non disattivabili.
                    </p>
                  </div>
                  <div className="ml-4 flex h-6 w-11 items-center rounded-full bg-white px-0.5">
                    <div className="h-5 w-5 translate-x-5 rounded-full bg-[#0d0d0d] shadow-sm" />
                  </div>
                </div>

                {/* Analytics — toggleable */}
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <div>
                    <p className="text-[14px] font-medium text-white">Cookie analitici</p>
                    <p className="text-[12px] text-[#888]">
                      Ci aiutano a capire come viene utilizzato il sito.
                    </p>
                  </div>
                  <button
                    onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                    className={`ml-4 flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${
                      analyticsEnabled ? 'bg-white' : 'bg-[#555]'
                    }`}
                    role="switch"
                    aria-checked={analyticsEnabled}
                    aria-label="Attiva cookie analitici"
                  >
                    <div
                      className={`h-5 w-5 rounded-full shadow-sm transition-transform ${
                        analyticsEnabled
                          ? 'translate-x-5 bg-[#0d0d0d]'
                          : 'translate-x-0 bg-[#888]'
                      }`}
                    />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                  <button
                    onClick={handleNecessaryOnly}
                    className="h-[44px] rounded-full border border-[#4e4e4e] bg-transparent px-5 text-[15px] font-medium text-white transition-colors hover:bg-white/5"
                  >
                    Solo necessari
                  </button>
                  <button
                    onClick={handleSavePreferences}
                    className="h-[44px] rounded-full bg-white px-5 text-[15px] font-medium text-[#0d0d0d] transition-colors hover:bg-[#e5e5e5]"
                  >
                    Salva preferenze
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CookieConsent;
