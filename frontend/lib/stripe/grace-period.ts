/**
 * Grace Period Management Service
 * Handles suspension after failed payments
 */

import { prisma } from '@/lib/prisma';
import { SubscriptionStatus } from '@prisma/client';

const GRACE_PERIOD_DAYS = 3;

/**
 * Check if tenant is in grace period
 */
export async function isInGracePeriod(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      gracePeriodEnd: true,
      subscriptionStatus: true,
    },
  });

  if (!tenant?.gracePeriodEnd) return false;

  return (
    tenant.gracePeriodEnd > new Date() && tenant.subscriptionStatus === SubscriptionStatus.PAST_DUE
  );
}

/**
 * Check if tenant should be suspended (grace period expired)
 */
export async function shouldSuspendTenant(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      gracePeriodEnd: true,
      subscriptionStatus: true,
      isSuspended: true,
    },
  });

  if (!tenant?.gracePeriodEnd) return false;
  if (tenant.isSuspended) return false;

  return (
    tenant.gracePeriodEnd <= new Date() && tenant.subscriptionStatus === SubscriptionStatus.PAST_DUE
  );
}

/**
 * Start grace period for tenant
 */
export async function startGracePeriod(tenantId: string): Promise<void> {
  const gracePeriodEnd = new Date();
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      gracePeriodEnd,
      subscriptionStatus: SubscriptionStatus.PAST_DUE,
    },
  });

  // TODO: Send email notification about grace period
  console.info(`Grace period started for tenant ${tenantId}, ends ${gracePeriodEnd.toISOString()}`);
}

/**
 * Suspend tenant (grace period expired)
 */
export async function suspendTenant(tenantId: string): Promise<void> {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      isSuspended: true,
      subscriptionStatus: SubscriptionStatus.SUSPENDED,
    },
  });

  // TODO: Send suspension notification
  console.info(`Tenant ${tenantId} suspended due to non-payment`);
}

/**
 * Reactivate tenant after payment
 */
export async function reactivateTenant(tenantId: string): Promise<void> {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      isSuspended: false,
      gracePeriodEnd: null,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    },
  });

  console.info(`Tenant ${tenantId} reactivated`);
}

/**
 * Get days remaining in grace period
 */
export async function getGracePeriodDaysRemaining(tenantId: string): Promise<number | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { gracePeriodEnd: true },
  });

  if (!tenant?.gracePeriodEnd) return null;

  const now = new Date();
  const diffTime = tenant.gracePeriodEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Process all tenants for grace period checks
 * Should be run as a cron job
 */
export async function processGracePeriods(): Promise<void> {
  console.info('Processing grace periods...');

  // Find tenants with expired grace periods
  const tenantsToSuspend = await prisma.tenant.findMany({
    where: {
      gracePeriodEnd: {
        lte: new Date(),
      },
      isSuspended: false,
      subscriptionStatus: {
        in: [SubscriptionStatus.PAST_DUE],
      },
    },
  });

  console.info(`Found ${tenantsToSuspend.length} tenants to suspend`);

  for (const tenant of tenantsToSuspend) {
    await suspendTenant(tenant.id);
  }

  // Find tenants approaching grace period end (send warnings)
  const warningThreshold = new Date();
  warningThreshold.setDate(warningThreshold.getDate() + 1); // 1 day before

  const tenantsToWarn = await prisma.tenant.findMany({
    where: {
      gracePeriodEnd: {
        lte: warningThreshold,
        gt: new Date(),
      },
      isSuspended: false,
    },
  });

  console.info(`Found ${tenantsToWarn.length} tenants to warn`);

  for (const tenant of tenantsToWarn) {
    // TODO: Send warning email
    console.info(`Warning: Tenant ${tenant.id} grace period ending soon`);
  }
}
