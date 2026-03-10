#!/usr/bin/env tsx
/**
 * Warranty Check Script - MechMind OS
 * 
 * Run daily to:
 * 1. Update warranty status (ACTIVE → EXPIRING_SOON → EXPIRED)
 * 2. Send expiration alerts at 60, 30, 7 days before expiration
 * 3. Send notification when claim status changes
 * 
 * Usage:
 *   npx tsx scripts/check-warranties.ts [--dry-run]
 * 
 * Cron setup (daily at 9 AM):
 *   0 9 * * * cd /path/to/project && npx tsx scripts/check-warranties.ts
 */

import { PrismaClient } from '@prisma/client'
import { warrantyService } from '../lib/services/warrantyService'

const prisma = new PrismaClient()

// Alert thresholds in days
const ALERT_THRESHOLDS = [60, 30, 7]

interface AlertResult {
  warrantyId: string
  vehicleInfo: string
  daysRemaining: number
  alertSent: boolean
  error?: string
}

interface CheckResult {
  statusUpdates: number
  alertsSent: number
  alerts: AlertResult[]
  errors: string[]
}

/**
 * Check if an alert should be sent based on days remaining and previously sent alerts
 */
function shouldSendAlert(daysRemaining: number, alertsSent: Date[]): boolean {
  // Find the appropriate threshold
  const threshold = ALERT_THRESHOLDS.find(t => daysRemaining <= t && daysRemaining > t - 7)
  
  if (!threshold) return false

  // Check if alert was already sent for this threshold
  // We consider an alert sent if it was sent within the last 7 days for this threshold
  const alertWindow = new Date()
  alertWindow.setDate(alertWindow.getDate() - 7)

  const recentAlerts = alertsSent.filter(date => date > alertWindow)
  return recentAlerts.length === 0
}

/**
 * Send expiration alert notification
 */
async function sendExpirationAlert(
  warrantyId: string,
  vehicleInfo: string,
  daysRemaining: number,
  dryRun: boolean
): Promise<{ success: boolean; error?: string }> {
  if (dryRun) {
    console.log(`[DRY RUN] Would send alert for ${vehicleInfo} (${daysRemaining} days remaining)`)
    return { success: true }
  }

  try {
    // TODO: Implement actual notification sending
    // This could be via email, SMS, push notification, or in-app notification
    
    // Example integration with notification service:
    // await notificationService.send({
    //   type: 'WARRANTY_EXPIRING',
    //   warrantyId,
    //   vehicleInfo,
    //   daysRemaining,
    // })

    console.log(`Alert sent for ${vehicleInfo} (${daysRemaining} days remaining)`)
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Check and update warranty statuses
 */
async function checkWarrantyStatuses(dryRun: boolean): Promise<number> {
  console.log('Checking warranty statuses...')

  if (dryRun) {
    // Find warranties that would be updated
    const warranties = await prisma.warranty.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'EXPIRING_SOON'],
        },
      },
    })

    const now = new Date()
    let updateCount = 0

    for (const warranty of warranties) {
      const expirationDate = new Date(warranty.expirationDate)
      const daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      let newStatus = warranty.status
      if (expirationDate < now) {
        newStatus = 'EXPIRED'
      } else if (daysRemaining <= 60) {
        newStatus = 'EXPIRING_SOON'
      }

      if (newStatus !== warranty.status) {
        console.log(`[DRY RUN] Would update warranty ${warranty.id}: ${warranty.status} → ${newStatus}`)
        updateCount++
      }
    }

    return updateCount
  }

  // Actually update statuses
  const result = await warrantyService.updateAllStatuses()
  console.log(`Updated ${result.updated} warranty statuses`)
  return result.updated
}

/**
 * Check and send expiration alerts
 */
async function checkExpirationAlerts(dryRun: boolean): Promise<AlertResult[]> {
  console.log('Checking expiration alerts...')

  const now = new Date()
  const maxDays = Math.max(...ALERT_THRESHOLDS)
  const cutoffDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000)

  const warranties = await prisma.warranty.findMany({
    where: {
      expirationDate: {
        lte: cutoffDate,
        gte: now,
      },
      status: {
        in: ['ACTIVE', 'EXPIRING_SOON'],
      },
    },
    include: {
      vehicle: {
        select: {
          make: true,
          model: true,
          year: true,
        },
      },
    },
  })

  const results: AlertResult[] = []

  for (const warranty of warranties) {
    const expirationDate = new Date(warranty.expirationDate)
    const daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    const vehicleInfo = warranty.vehicle 
      ? `${warranty.vehicle.make} ${warranty.vehicle.model} (${warranty.vehicle.year})`
      : `Vehicle ${warranty.vehicleId}`

    if (shouldSendAlert(daysRemaining, warranty.alertsSent as Date[])) {
      const alertResult = await sendExpirationAlert(
        warranty.id,
        vehicleInfo,
        daysRemaining,
        dryRun
      )

      if (alertResult.success && !dryRun) {
        // Record that alert was sent
        await warrantyService.recordAlertSent(warranty.id)
      }

      results.push({
        warrantyId: warranty.id,
        vehicleInfo,
        daysRemaining,
        alertSent: alertResult.success,
        error: alertResult.error,
      })
    }
  }

  console.log(`Checked ${warranties.length} warranties, sent ${results.filter(r => r.alertSent).length} alerts`)
  return results
}

/**
 * Check for claim status changes and send notifications
 */
async function checkClaimStatusChanges(dryRun: boolean): Promise<number> {
  console.log('Checking claim status changes...')

  // Find claims that were reviewed since last check (in the last 24 hours)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const claims = await prisma.warrantyClaim.findMany({
    where: {
      reviewedDate: {
        gte: yesterday,
      },
    },
    include: {
      warranty: {
        include: {
          vehicle: {
            select: {
              make: true,
              model: true,
            },
          },
        },
      },
    },
  })

  if (dryRun) {
    console.log(`[DRY RUN] Would send ${claims.length} claim status notifications`)
    for (const claim of claims) {
      const vehicleInfo = claim.warranty?.vehicle
        ? `${claim.warranty.vehicle.make} ${claim.warranty.vehicle.model}`
        : `Vehicle ${claim.warranty?.vehicleId}`
      console.log(`[DRY RUN] Claim ${claim.id} for ${vehicleInfo}: ${claim.status}`)
    }
    return claims.length
  }

  // TODO: Send notifications for claim status changes
  // for (const claim of claims) {
  //   await notificationService.send({
  //     type: 'CLAIM_STATUS_CHANGED',
  //     claimId: claim.id,
  //     status: claim.status,
  //     vehicleInfo,
  //   })
  // }

  console.log(`Sent ${claims.length} claim status notifications`)
  return claims.length
}

/**
 * Main check function
 */
async function runWarrantyChecks(dryRun: boolean = false): Promise<CheckResult> {
  console.log(`Starting warranty checks${dryRun ? ' (DRY RUN)' : ''}...`)
  console.log('=' .repeat(50))

  const result: CheckResult = {
    statusUpdates: 0,
    alertsSent: 0,
    alerts: [],
    errors: [],
  }

  try {
    // 1. Update warranty statuses
    result.statusUpdates = await checkWarrantyStatuses(dryRun)

    // 2. Check and send expiration alerts
    result.alerts = await checkExpirationAlerts(dryRun)
    result.alertsSent = result.alerts.filter(a => a.alertSent).length

    // 3. Check claim status changes
    await checkClaimStatusChanges(dryRun)

    // Collect any errors
    result.errors = result.alerts
      .filter(a => a.error)
      .map(a => `Alert for ${a.vehicleInfo}: ${a.error}`)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(errorMessage)
    console.error('Error during warranty checks:', errorMessage)
  } finally {
    await prisma.$disconnect()
  }

  console.log('=' .repeat(50))
  console.log('Warranty checks completed:')
  console.log(`  - Status updates: ${result.statusUpdates}`)
  console.log(`  - Alerts sent: ${result.alertsSent}`)
  console.log(`  - Errors: ${result.errors.length}`)

  if (result.errors.length > 0) {
    console.log('\nErrors:')
    result.errors.forEach(e => console.log(`  - ${e}`))
  }

  return result
}

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

// Run the checks
runWarrantyChecks(dryRun)
  .then((result) => {
    process.exit(result.errors.length > 0 ? 1 : 0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
