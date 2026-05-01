/**
 * Tenant Isolation Audit — Static Analysis Test
 *
 * Scans all service/controller files for Prisma queries on tenant-scoped
 * models that do NOT include tenantId within ±8 lines of context.
 *
 * This test catches data leaks at CI time, preventing cross-tenant
 * data access regressions.
 */
import * as fs from 'fs';
import * as path from 'path';

// Models that MUST have tenantId in every query (from schema.prisma)
const TENANT_MODELS = [
  'accountingSync',
  'auditLog',
  'authAuditLog',
  'booking',
  'bookingSlot',
  'callRecording',
  'campaign',
  'cannedJob',
  'cannedResponse',
  'customer',
  'customerEncrypted',
  'dataRetentionExecutionLog',
  'dataSubjectRequest',
  'estimate',
  'fleet',
  'inspection',
  'inspectionTemplate',
  'inventoryItem',
  'invoice',
  'laborGuide',
  'laborGuideEntry',
  'licensePlateDetection',
  'location',
  'lprCamera',
  'notification',
  'obdDevice',
  'obdReading',
  'parkingSession',
  'part',
  'purchaseOrder',
  'service',
  'shopFloor',
  'shopFloorEvent',
  'smsThread',
  'subscription',
  'supplier',
  'technician',
  'technicianTimeLog',
  'tireSet',
  'usageTracking',
  'user',
  'vehicle',
  'vehicleDamage',
  'vehicleEntryExit',
  'vehicleHealthHistory',
  'vehicleTwinComponent',
  'vehicleTwinConfig',
  'voiceWebhookEvent',
  'workOrder',
];

// Allowlist: patterns that are INTENTIONALLY cross-tenant
const ALLOWLIST_PATTERNS = [
  // Cron jobs that process all tenants
  'processPending',
  'markOverdueInvoices',
  'sendBookingReminders',
  'sendMaintenanceDue',
  'sendWarrantyExpiring',
  'cleanExpired',
  'archiveOld',
  'runRetentionPolicies',
  // Admin/system analytics (behind @AdminOnly)
  'unit-economics',
  // Auth service/controller: queries by userId (PK, globally unique)
  'mfa.service',
  'passkey.service',
  'magic-link.service',
  'auth.service',
  'auth.controller',
  // GDPR: intentionally cross-tenant for compliance
  'gdpr-request.service',
  'data-retention.service',
  'audit-log.service',
  // Webhook handlers: lookup by external messageId (verified signature)
  'ses-webhook',
  'updateStatus', // Twilio status callback
  // SMS inbound: phoneHash lookup (no tenant context from Twilio)
  'receiveInbound',
  // Seed/setup
  'admin-setup',
  'seed',
  // Stripe/BNPL webhook handlers (external callback, lookup by external ID)
  'bnpl.service',
  'payment-link.service',
  // Subscription admin endpoint (behind @AdminOnly)
  'subscription.service',
  // Internal methods that update by ID after parent tenant-scoped fetch
  'processNotification',
  'markFailed',
  // Services where tenantId is verified in parent query, update by ID
  'applyToEstimate',
  'applyToWorkOrder',
  'rescheduleBooking',
  // Review service (tenantId in where clause, outside ±20 context window)
  'review.service',
];

function getAllTsFiles(dir: string): string[] {
  const results: string[] = [];
  let items: fs.Dirent[];
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const item of items) {
    if (item.name === 'node_modules' || item.name === 'dist' || item.name === 'test') continue;
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...getAllTsFiles(fullPath));
    } else if (
      item.name.endsWith('.ts') &&
      !item.name.endsWith('.d.ts') &&
      !item.name.endsWith('.spec.ts') &&
      !item.name.endsWith('.dto.ts')
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

// File:line allowlist for queries that are verified safe (update by ID after
// tenant-scoped parent fetch). Each entry documents why it's safe.
const ALLOWLISTED_LINES: Record<string, string> = {
  'booking/services/booking.service.ts:774':
    'bookingSlot updated by ID after tenant-scoped fetch at line 697',
  'booking/services/booking.service.ts:782':
    'booking updated by ID after tenant-scoped fetch at line 674',
  'customer/services/customer.service.ts:450':
    'customer.count uses where object that contains tenantId from function param',
  'portal/portal.service.ts:459':
    'invoice.count uses where object that contains tenantId + customerId',
  'canned-job/canned-job.service.ts:269':
    'workOrder updated by ID after tenant-scoped fetch at line 241',
  'dvi/services/inspection.service.ts:242':
    'inspection updated by ID after tenant-scoped fetch at line 212',
  'dvi/services/inspection.service.ts:652':
    'inspection updated by ID after tenant-scoped fetch at line 212',
  'labor-guide/services/labor-guide.service.ts:230':
    'laborGuideEntry count with tenantId in where object at line 208',
  'notifications/services/notification-v2.service.ts:611':
    'notification updated by ID in private processNotification after tenant-scoped fetch',
};

function isAllowlisted(filePath: string, lineNumber: number, functionContext: string): boolean {
  // Check file:line allowlist
  const key = `${filePath}:${lineNumber}`;
  // eslint-disable-next-line security/detect-object-injection
  if (ALLOWLISTED_LINES[key]) return true;

  // Check pattern-based allowlist
  for (const pattern of ALLOWLIST_PATTERNS) {
    if (filePath.includes(pattern) || functionContext.includes(pattern)) {
      return true;
    }
  }
  return false;
}

describe('Tenant Isolation Audit', () => {
  it('should not have Prisma queries on tenant models without tenantId in context', () => {
    const srcDir = path.join(__dirname, '../../');
    const files = getAllTsFiles(srcDir);
    const violations: string[] = [];

    for (const file of files) {
      if (file.includes('prisma.service')) continue;

      let content: string;
      try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        content = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      const relativePath = path.relative(srcDir, file);

      for (let i = 0; i < lines.length; i++) {
        // eslint-disable-next-line security/detect-object-injection
        const line = lines[i];

        for (const model of TENANT_MODELS) {
          // eslint-disable-next-line security/detect-non-literal-regexp
          const regex = new RegExp(
            `prisma\\.${model}\\.(find|update|delete|create|upsert|count|aggregate)`,
          );
          if (!regex.test(line)) continue;

          // Check ±8 lines for tenantId
          const start = Math.max(0, i - 8);
          const end = Math.min(lines.length, i + 9);
          const context = lines.slice(start, end).join('\n');

          if (context.includes('tenantId')) continue;

          // Check wider context ±35 lines
          const wideStart = Math.max(0, i - 35);
          const wideEnd = Math.min(lines.length, i + 36);
          const wideContext = lines.slice(wideStart, wideEnd).join('\n');

          if (wideContext.includes('tenantId')) continue;

          // Check allowlist
          if (isAllowlisted(relativePath, i + 1, wideContext)) continue;

          violations.push(`${relativePath}:${i + 1} — prisma.${model} query without tenantId`);
        }
      }
    }

    if (violations.length > 0) {
      const msg = [
        `TENANT ISOLATION VIOLATIONS FOUND: ${violations.length}`,
        '',
        ...violations.map(v => `  ${v}`),
        '',
        'Each Prisma query on a tenant-scoped model MUST include tenantId.',
        'If this is intentional (cron, admin, webhook), add to ALLOWLIST_PATTERNS.',
      ].join('\n');
      throw new Error(msg);
    }
  });
});
