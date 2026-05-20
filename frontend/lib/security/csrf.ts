/**
 * CSRF Protection — Double-Submit Cookie Pattern
 *
 * Architecture note: This Next.js app uses HttpOnly cookies with SameSite=Lax
 * for session management, which provides strong built-in CSRF mitigation in
 * modern browsers (Chrome 80+, Firefox 69+, Safari 13+). SameSite=Lax prevents
 * cross-origin POST requests from including the session cookie.
 *
 * For defense-in-depth, we implement the double-submit cookie pattern:
 * 1. A CSRF token is generated and stored in a non-HttpOnly cookie (readable by JS).
 * 2. The client sends the token in a custom header (X-CSRF-Token) on mutating requests.
 * 3. The server compares the cookie value to the header value.
 *
 * This is a secondary safeguard. The primary CSRF defense is SameSite=Lax cookies.
 */

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

export function generateCSRFToken(): string {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Validates a CSRF token using the double-submit cookie pattern.
 * Compares the token sent via the custom header against the token stored in the cookie.
 * Returns true if they match (both must be non-empty).
 */
export function validateCSRFToken(headerToken: string, cookieToken?: string): boolean {
  if (!headerToken || !cookieToken) {
    return false;
  }
  // Constant-time comparison to prevent timing attacks
  if (headerToken.length !== cookieToken.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < headerToken.length; i++) {
    mismatch |= headerToken.charCodeAt(i) ^ cookieToken.charCodeAt(i);
  }
  return mismatch === 0;
}

export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // No origin header (same-origin request)
  const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXT_PUBLIC_SITE_URL].filter(
    Boolean
  );
  if (allowedOrigins.length === 0) return true;
  return allowedOrigins.includes(origin);
}

/**
 * Reads the CSRF token from the meta tag (set during SSR) or from the cookie.
 */
export function getCSRFToken(): string | null {
  if (typeof document === 'undefined') return null;
  // Try meta tag first
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta?.getAttribute('content')) {
    return meta.getAttribute('content');
  }
  // Fallback: read from cookie
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** The cookie name used for the CSRF double-submit pattern. */
export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
