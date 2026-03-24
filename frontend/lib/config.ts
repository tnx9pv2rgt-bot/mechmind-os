/**
 * Centralized backend configuration — SINGLE SOURCE OF TRUTH.
 *
 * Every API route and server-side call MUST import from here.
 * Never hardcode backend URLs in route files.
 *
 * Priority: BACKEND_URL env > NEXT_PUBLIC_BACKEND_URL env > NEXT_PUBLIC_API_URL env > default
 */

const RAW =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3002';

/** Backend base URL without trailing slash or /v1, e.g. http://localhost:3002 */
export const BACKEND_BASE = RAW.replace(/\/+$/, '').replace(/\/v1\/?$/, '');

/** Backend API URL with /v1 prefix, e.g. http://localhost:3002/v1 */
export const BACKEND_URL = `${BACKEND_BASE}/v1`;
