// =============================================================================
// Google Analytics 4 — utility functions
// =============================================================================

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

type Gtag = (...args: unknown[]) => void;

function getGtag(): Gtag | null {
  if (typeof window === 'undefined') return null;
  const gtag = (window as unknown as Record<string, unknown>).gtag as Gtag | undefined;
  return gtag ?? null;
}

// ---------------------------------------------------------------------------
// Generic event
// ---------------------------------------------------------------------------
interface GtagEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

export function trackEvent({ action, category, label, value }: GtagEvent): void {
  const gtag = getGtag();
  if (!gtag) return;
  gtag('event', action, {
    event_category: category,
    event_label: label,
    value,
  });
}

// ---------------------------------------------------------------------------
// SaaS conversion events
// ---------------------------------------------------------------------------

/** Registrazione completata */
export function trackSignUp(method: string): void {
  trackEvent({ action: 'sign_up', category: 'engagement', label: method });
}

/** Acquisto abbonamento */
export function trackPurchase(planName: string, value: number): void {
  const gtag = getGtag();
  if (!gtag) return;
  gtag('event', 'purchase', {
    currency: 'EUR',
    value,
    items: [{ item_name: planName, quantity: 1, price: value }],
  });
}

/** Inizio trial / demo */
export function trackTrialStart(): void {
  trackEvent({ action: 'generate_lead', category: 'conversion', label: 'trial_start' });
}

/** Onboarding completato */
export function trackOnboardingComplete(step: string): void {
  trackEvent({ action: 'onboarding_complete', category: 'engagement', label: step });
}

// ---------------------------------------------------------------------------
// Product usage events
// ---------------------------------------------------------------------------

/** Ordine di lavoro creato */
export function trackWorkOrderCreated(): void {
  trackEvent({ action: 'work_order_created', category: 'conversion' });
}

/** Fattura generata */
export function trackInvoiceGenerated(value: number): void {
  trackEvent({ action: 'invoice_generated', category: 'conversion', value });
}

/** Prenotazione completata */
export function trackBookingCompleted(): void {
  trackEvent({ action: 'booking_completed', category: 'conversion' });
}

/** Uso di una feature specifica */
export function trackFeatureUsed(featureName: string): void {
  trackEvent({ action: 'feature_used', category: 'engagement', label: featureName });
}
