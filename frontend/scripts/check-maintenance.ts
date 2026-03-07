#!/usr/bin/env node
/**
 * Maintenance Check Cron Script
 * 
 * This script runs daily to:
 * 1. Update isOverdue status for all maintenance schedules
 * 2. Calculate daysUntilDue and kmUntilDue
 * 3. Send notifications for items due in 7 days
 * 
 * Recommended usage: Run via cron at 8:00 AM daily
 * 0 8 * * * cd /path/to/project && npx ts-node scripts/check-maintenance.ts
 * 
 * Or use Vercel Cron (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/maintenance-check",
 *     "schedule": "0 8 * * *"
 *   }]
 * }
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Configuration
const NOTIFICATION_DAYS_BEFORE = 7

interface CheckResult {
  checkedAt: Date
  schedulesChecked: number
  newlyOverdue: number
  notificationsSent: number
  errors: string[]
}

/**
 * Main function to check maintenance schedules
 */
async function checkMaintenance(): Promise<CheckResult> {
  const result: CheckResult = {
    checkedAt: new Date(),
    schedulesChecked: 0,
    newlyOverdue: 0,
    notificationsSent: 0,
    errors: []
  }

  console.log('🔧 Starting maintenance check...')
  console.log(`⏰ ${result.checkedAt.toISOString()}`)

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get all schedules that might need updating
    const schedules = await prisma.maintenanceSchedule.findMany({
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            licensePlate: true,
            mileage: true,
            ownerEmail: true,
            ownerPhone: true
          }
        }
      }
    })

    result.schedulesChecked = schedules.length
    console.log(`📋 Found ${schedules.length} maintenance schedules`)

    // Process each schedule
    for (const schedule of schedules) {
      try {
        // Calculate days until due
        const diffTime = schedule.nextDueDate.getTime() - today.getTime()
        const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        const isOverdue = daysUntilDue < 0

        // Check for changes
        const wasOverdue = schedule.isOverdue
        const isNewlyOverdue = isOverdue && !wasOverdue

        // Calculate km until due (if vehicle mileage is available)
        let kmUntilDue = schedule.kmUntilDue
        if (schedule.vehicle.mileage !== null && schedule.vehicle.mileage !== undefined) {
          kmUntilDue = schedule.nextDueKm - schedule.vehicle.mileage
        }

        // Update schedule
        await prisma.maintenanceSchedule.update({
          where: { id: schedule.id },
          data: {
            daysUntilDue,
            kmUntilDue,
            isOverdue
          }
        })

        // Track newly overdue
        if (isNewlyOverdue) {
          result.newlyOverdue++
          console.log(`⚠️  Newly overdue: ${schedule.vehicle.make} ${schedule.vehicle.model} - ${schedule.type}`)
          
          // Send notification for newly overdue
          await sendOverdueNotification(schedule)
        }

        // Check if notification should be sent (due within 7 days and not yet alerted)
        const shouldNotify = 
          daysUntilDue > 0 && 
          daysUntilDue <= NOTIFICATION_DAYS_BEFORE && 
          !schedule.alertSentAt &&
          !isOverdue

        if (shouldNotify) {
          await sendUpcomingNotification(schedule, daysUntilDue)
          result.notificationsSent++
          
          // Mark as alerted
          await prisma.maintenanceSchedule.update({
            where: { id: schedule.id },
            data: { alertSentAt: new Date() }
          })
        }

      } catch (error) {
        const errorMsg = `Failed to process schedule ${schedule.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(`❌ ${errorMsg}`)
        result.errors.push(errorMsg)
      }
    }

    console.log('✅ Maintenance check completed')
    console.log(`📊 Results: ${result.newlyOverdue} newly overdue, ${result.notificationsSent} notifications sent`)

  } catch (error) {
    const errorMsg = `Fatal error during maintenance check: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(`❌ ${errorMsg}`)
    result.errors.push(errorMsg)
  } finally {
    await prisma.$disconnect()
  }

  return result
}

/**
 * Send notification for overdue maintenance
 */
async function sendOverdueNotification(
  schedule: any
): Promise<void> {
  const maintenanceType = getMaintenanceTypeLabel(schedule.type)
  const vehicleInfo = `${schedule.vehicle.make} ${schedule.vehicle.model} (${schedule.vehicle.licensePlate || 'N/A'})`
  
  console.log(`📧 Sending overdue notification for ${vehicleInfo} - ${maintenanceType}`)

  // Here you would integrate with your notification service
  // Examples: SendGrid, Twilio, internal notification system, etc.
  
  // Example integration points:
  // - Send email to vehicle owner
  // - Send SMS/WhatsApp via Twilio
  // - Create in-app notification
  // - Send webhook to external system

  // Placeholder for notification logic
  const notificationPayload = {
    to: schedule.vehicle.ownerEmail,
    phone: schedule.vehicle.ownerPhone,
    subject: `Manutenzione scaduta: ${maintenanceType}`,
    body: `La manutenzione programmata (${maintenanceType}) per il veicolo ${vehicleInfo} è scaduta.`,
    priority: schedule.notificationLevel === 'CRITICAL' ? 'high' : 'normal',
    scheduleId: schedule.id,
    vehicleId: schedule.vehicle.id
  }

  // TODO: Integrate with your notification service
  // await notificationService.send(notificationPayload)
  
  console.log('📨 Notification payload:', JSON.stringify(notificationPayload, null, 2))
}

/**
 * Send notification for upcoming maintenance
 */
async function sendUpcomingNotification(
  schedule: any,
  daysUntilDue: number
): Promise<void> {
  const maintenanceType = getMaintenanceTypeLabel(schedule.type)
  const vehicleInfo = `${schedule.vehicle.make} ${schedule.vehicle.model} (${schedule.vehicle.licensePlate || 'N/A'})`
  
  console.log(`📧 Sending upcoming notification for ${vehicleInfo} - ${maintenanceType} (in ${daysUntilDue} days)`)

  // Similar to overdue notification, but for upcoming maintenance
  const notificationPayload = {
    to: schedule.vehicle.ownerEmail,
    phone: schedule.vehicle.ownerPhone,
    subject: `Manutenzione in scadenza: ${maintenanceType}`,
    body: `La manutenzione programmata (${maintenanceType}) per il veicolo ${vehicleInfo} scadrà tra ${daysUntilDue} giorni.`,
    priority: 'normal',
    scheduleId: schedule.id,
    vehicleId: schedule.vehicle.id,
    daysUntilDue
  }

  // TODO: Integrate with your notification service
  // await notificationService.send(notificationPayload)
  
  console.log('📨 Notification payload:', JSON.stringify(notificationPayload, null, 2))
}

/**
 * Get Italian label for maintenance type
 */
function getMaintenanceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'OIL_CHANGE': 'Cambio Olio',
    'TIRE_ROTATION': 'Rotazione Pneumatici',
    'BRAKE_CHECK': 'Controllo Freni',
    'FILTER': 'Sostituzione Filtri',
    'INSPECTION': 'Ispezione Generale',
    'BELTS': 'Controllo Cinghie',
    'BATTERY': 'Controllo Batteria'
  }
  return labels[type] || type
}

/**
 * Run the check if this file is executed directly
 */
if (require.main === module) {
  checkMaintenance()
    .then((result) => {
      console.log('\n📈 Final Results:')
      console.log(JSON.stringify(result, null, 2))
      
      // Exit with error code if there were errors
      process.exit(result.errors.length > 0 ? 1 : 0)
    })
    .catch((error) => {
      console.error('💥 Unhandled error:', error)
      process.exit(1)
    })
}

export { checkMaintenance }
export default checkMaintenance
