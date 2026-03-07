/**
 * Progressive Profiling Scheduler
 * Sistema di scheduling per i reminder email del profilamento progressivo
 */

import { ReminderSchedule, ProfilingStageId } from './types'

// Configurazione dei reminder per ogni stage
export const REMINDER_SCHEDULES: ReminderSchedule[] = [
  {
    stage: 'week1',
    delay: '7d',
    template: 'complete-profile-week1',
    subject: '🎁 10% di sconto ti aspetta! Completa il tuo profilo',
  },
  {
    stage: 'week2',
    delay: '14d',
    template: 'complete-profile-week2',
    subject: '🚚 Spedizione gratuita per te! Aggiungi i dati mancanti',
  },
  {
    stage: 'month1',
    delay: '30d',
    template: 'complete-profile-month1',
    subject: '📚 Ebook esclusivo in regalo! Finalizza il tuo profilo',
  },
]

// Tipi di job supportati
type JobType = 'send-email' | 'in-app-notification' | 'push-notification'

interface ScheduledJob {
  id: string
  type: JobType
  to: string
  template: string
  delay: string
  scheduledAt: Date
  metadata?: Record<string, unknown>
}

// Storage in-memory per i job (in produzione usare Redis/Bull/BullMQ)
const scheduledJobs = new Map<string, ScheduledJob>()

/**
 * Genera un ID univoco per il job
 */
function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Parsa il delay in millisecondi
 */
function parseDelay(delay: string): number {
  const match = delay.match(/^(\d+)([dhm])$/)
  if (!match) throw new Error(`Invalid delay format: ${delay}`)
  
  const [, value, unit] = match
  const numValue = parseInt(value, 10)
  
  switch (unit) {
    case 'd': return numValue * 24 * 60 * 60 * 1000 // giorni
    case 'h': return numValue * 60 * 60 * 1000      // ore
    case 'm': return numValue * 60 * 1000           // minuti
    default: throw new Error(`Unknown time unit: ${unit}`)
  }
}

/**
 * Schedula un nuovo job
 */
export function scheduleJob(
  type: JobType,
  config: {
    to: string
    template: string
    delay: string
    metadata?: Record<string, unknown>
  }
): string {
  const jobId = generateJobId()
  const delayMs = parseDelay(config.delay)
  
  const job: ScheduledJob = {
    id: jobId,
    type,
    to: config.to,
    template: config.template,
    delay: config.delay,
    scheduledAt: new Date(Date.now() + delayMs),
    metadata: config.metadata,
  }
  
  scheduledJobs.set(jobId, job)
  
  // In produzione, qui si userebbe Bull/BullMQ o un cron job
  console.log(`[Scheduler] Job ${jobId} scheduled for ${job.scheduledAt.toISOString()}`)
  
  return jobId
}

/**
 * Schedula tutti i reminder per un nuovo cliente
 */
export function scheduleProfilingReminders(customerId: string): string[] {
  const jobIds: string[] = []
  
  for (const schedule of REMINDER_SCHEDULES) {
    const jobId = scheduleJob('send-email', {
      to: customerId,
      template: schedule.template,
      delay: schedule.delay,
      metadata: {
        subject: schedule.subject,
        stage: schedule.stage,
      },
    })
    
    jobIds.push(jobId)
  }
  
  return jobIds
}

/**
 * Schedula un reminder specifico per uno stage
 */
export function scheduleStageReminder(
  customerId: string,
  stage: ProfilingStageId
  
): string | null {
  const schedule = REMINDER_SCHEDULES.find(s => s.stage === stage)
  if (!schedule) return null
  
  return scheduleJob('send-email', {
    to: customerId,
    template: schedule.template,
    delay: schedule.delay,
    metadata: {
      subject: schedule.subject,
      stage,
    },
  })
}

/**
 * Cancella un job schedulato
 */
export function cancelScheduledJob(jobId: string): boolean {
  const existed = scheduledJobs.has(jobId)
  scheduledJobs.delete(jobId)
  
  if (existed) {
    console.log(`[Scheduler] Job ${jobId} cancelled`)
  }
  
  return existed
}

/**
 * Cancella tutti i reminder per un cliente
 */
export function cancelAllReminders(customerId: string): number {
  let cancelledCount = 0
  
  for (const [jobId, job] of scheduledJobs.entries()) {
    if (job.to === customerId) {
      scheduledJobs.delete(jobId)
      cancelledCount++
    }
  }
  
  console.log(`[Scheduler] Cancelled ${cancelledCount} reminders for customer ${customerId}`)
  return cancelledCount
}

/**
 * Ottiene tutti i job schedulati per un cliente
 */
export function getScheduledJobsForCustomer(customerId: string): ScheduledJob[] {
  return Array.from(scheduledJobs.values()).filter(job => job.to === customerId)
}

/**
 * Processa i job scaduti (da chiamare da un cron job)
 */
export function processExpiredJobs(): ScheduledJob[] {
  const now = new Date()
  const expiredJobs: ScheduledJob[] = []
  
  for (const [jobId, job] of scheduledJobs.entries()) {
    if (job.scheduledAt <= now) {
      expiredJobs.push(job)
      scheduledJobs.delete(jobId)
      
      // In produzione, qui si invierebbe effettivamente l'email
      console.log(`[Scheduler] Processing job ${jobId}:`, {
        type: job.type,
        to: job.to,
        template: job.template,
      })
    }
  }
  
  return expiredJobs
}

/**
 * Simula l'invio di un reminder (per testing)
 */
export async function simulateSendReminder(
  customerId: string,
  template: string
): Promise<boolean> {
  console.log(`[Scheduler] Sending reminder to ${customerId} using template ${template}`)
  
  // Simula una chiamata API
  await new Promise(resolve => setTimeout(resolve, 100))
  
  return true
}

/**
 * Verifica se un cliente ha reminder pendenti
 */
export function hasPendingReminders(customerId: string): boolean {
  return Array.from(scheduledJobs.values()).some(job => job.to === customerId)
}
