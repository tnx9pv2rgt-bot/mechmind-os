/**
 * CSRF Protection
 * Stub for CSRF token management
 */

export function generateCSRFToken(): string {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function validateCSRFToken(_token: string): boolean {
  // TODO: Implement server-side CSRF validation
  return true;
}

export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // No origin header (same-origin request)
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ].filter(Boolean);
  if (allowedOrigins.length === 0) return true;
  return allowedOrigins.includes(origin);
}

export function getCSRFToken(): string | null {
  if (typeof document === 'undefined') return null;
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute('content') ?? null;
}
