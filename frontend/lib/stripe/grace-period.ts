/**
 * Grace Period Management Service
 * Handles suspension after failed payments via backend API
 */

import { BACKEND_BASE } from '@/lib/config';

const BACKEND_URL = BACKEND_BASE;
const TIMEOUT_MS = 10_000;

interface GracePeriodStatus {
  inGracePeriod: boolean;
  shouldSuspend: boolean;
  daysRemaining: number | null;
  subscriptionStatus: string;
  isSuspended: boolean;
  gracePeriodEnd: string | null;
}

/**
 * Internal helper to call the backend subscription/grace-period endpoint.
 */
async function fetchGracePeriodStatus(tenantId: string): Promise<GracePeriodStatus> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BACKEND_URL}/v1/subscription/grace-period?tenantId=${tenantId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Backend returned ${res.status}`);
    }

    const body = (await res.json()) as { data?: GracePeriodStatus };
    return (
      body.data ?? {
        inGracePeriod: false,
        shouldSuspend: false,
        daysRemaining: null,
        subscriptionStatus: 'ACTIVE',
        isSuspended: false,
        gracePeriodEnd: null,
      }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check if tenant is in grace period
 */
export async function isInGracePeriod(tenantId: string): Promise<boolean> {
  try {
    const status = await fetchGracePeriodStatus(tenantId);
    return status.inGracePeriod;
  } catch (error) {
    console.error('[grace-period] Failed to check grace period:', error);
    return false;
  }
}

/**
 * Check if tenant should be suspended (grace period expired)
 */
export async function shouldSuspendTenant(tenantId: string): Promise<boolean> {
  try {
    const status = await fetchGracePeriodStatus(tenantId);
    return status.shouldSuspend;
  } catch (error) {
    console.error('[grace-period] Failed to check suspension:', error);
    return false;
  }
}

/**
 * Start grace period for tenant
 */
export async function startGracePeriod(tenantId: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/v1/subscription/grace-period/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId }),
  });

  if (!res.ok) {
    throw new Error(`Failed to start grace period: ${res.status}`);
  }

  console.info(`Grace period started for tenant ${tenantId}`);
}

/**
 * Suspend tenant (grace period expired)
 */
export async function suspendTenant(tenantId: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/v1/subscription/suspend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId }),
  });

  if (!res.ok) {
    throw new Error(`Failed to suspend tenant: ${res.status}`);
  }

  console.info(`Tenant ${tenantId} suspended due to non-payment`);
}

/**
 * Reactivate tenant after payment
 */
export async function reactivateTenant(tenantId: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/v1/subscription/reactivate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId }),
  });

  if (!res.ok) {
    throw new Error(`Failed to reactivate tenant: ${res.status}`);
  }

  console.info(`Tenant ${tenantId} reactivated`);
}

/**
 * Get days remaining in grace period
 */
export async function getGracePeriodDaysRemaining(tenantId: string): Promise<number | null> {
  try {
    const status = await fetchGracePeriodStatus(tenantId);
    return status.daysRemaining;
  } catch (error) {
    console.error('[grace-period] Failed to get days remaining:', error);
    return null;
  }
}

/**
 * Process all tenants for grace period checks
 * Should be run as a cron job - delegates to backend
 */
export async function processGracePeriods(): Promise<void> {
  console.info('Processing grace periods via backend...');

  const res = await fetch(`${BACKEND_URL}/v1/subscription/grace-period/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Failed to process grace periods: ${res.status}`);
  }

  console.info('Grace period processing delegated to backend');
}
