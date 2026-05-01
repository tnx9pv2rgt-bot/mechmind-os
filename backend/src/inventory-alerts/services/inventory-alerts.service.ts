/**
 * MechMind OS - Inventory Alerts Service
 *
 * Manages low-stock alerts for parts catalog:
 * - Detects parts below minimum threshold
 * - Logs alerts to AiDecisionLog for audit trail
 * - Processes alerts for all tenants (cron-driven)
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { Prisma } from '@prisma/client';

interface LowStockAlertData {
  partId: string;
  sku: string;
  name: string;
  currentStock: number;
  minStockLevel: number;
  reorderPoint: number;
}

@Injectable()
export class InventoryAlertsService {
  private readonly logger = new Logger(InventoryAlertsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process low-stock alerts for a specific tenant
   * Finds all parts where quantity <= minStockLevel and creates notifications
   */
  async sendLowStockAlerts(tenantId: string): Promise<number> {
    try {
      const alerts = await this.findLowStockParts(tenantId);

      if (alerts.length === 0) {
        this.logger.debug(`[Tenant ${tenantId}] No low-stock parts found`);
        return 0;
      }

      this.logger.log(`[Tenant ${tenantId}] Processing ${alerts.length} low-stock alerts`);

      // Get warehouse admin user for this tenant (or create notifications per alert)
      // For now, we'll create IN_APP notifications without a specific customer
      // In a real scenario, you might store this in a system notification table
      // or fetch the warehouse manager

      let successCount = 0;
      for (const alert of alerts) {
        try {
          await this.logAlertToAuditTrail(tenantId, alert);
          successCount++;
        } catch (error) {
          this.logger.error(
            `Failed to log alert for part ${alert.sku}:`,
            // eslint-disable-next-line sonarjs/no-duplicate-string
            error instanceof Error ? error.message : 'Unknown error',
          );
        }
      }

      this.logger.log(
        `[Tenant ${tenantId}] Created ${successCount}/${alerts.length} notifications`,
      );
      return successCount;
    } catch (error) {
      this.logger.error(
        `Error processing low-stock alerts for tenant ${tenantId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      return 0;
    }
  }

  /**
   * Run low-stock alert check for all active tenants
   * Called daily by cron scheduler
   */
  async runForAllTenants(): Promise<{ tenantsProcessed: number; alertsCreated: number }> {
    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });

      this.logger.log(`Starting inventory alerts for ${tenants.length} active tenants`);

      let totalAlerts = 0;
      for (const tenant of tenants) {
        const alerts = await this.sendLowStockAlerts(tenant.id);
        totalAlerts += alerts;
      }

      this.logger.log(
        `Completed inventory alerts: ${tenants.length} tenants, ${totalAlerts} alerts created`,
      );
      return { tenantsProcessed: tenants.length, alertsCreated: totalAlerts };
    } catch (error) {
      this.logger.error(
        'Error running inventory alerts for all tenants:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return { tenantsProcessed: 0, alertsCreated: 0 };
    }
  }

  /**
   * Find all parts in tenant where quantity <= minStockLevel
   * Uses index on (tenantId, quantity) for performance
   */
  private async findLowStockParts(tenantId: string): Promise<LowStockAlertData[]> {
    const parts = await this.prisma.part.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        inventory: {
          where: {
            tenantId,
          },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
      take: 500, // Bounded query for safety
    });

    // Filter parts where current stock <= minStockLevel
    return parts
      .filter(part => {
        const inventory = part.inventory[0];
        return inventory && inventory.quantity <= part.minStockLevel;
      })
      .map(part => ({
        partId: part.id,
        sku: part.sku,
        name: part.name,
        currentStock: part.inventory[0].quantity,
        minStockLevel: part.minStockLevel,
        reorderPoint: part.reorderPoint,
      }));
  }

  /**
   * Log a low-stock alert to AiDecisionLog for audit trail
   * Can be queried by warehouse staff via dashboard
   */
  private async logAlertToAuditTrail(tenantId: string, alert: LowStockAlertData): Promise<void> {
    // Store alert in AiDecisionLog for audit trail
    await this.prisma.aiDecisionLog.create({
      data: {
        tenantId,
        featureName: 'inventory-alerts',
        modelUsed: 'threshold-check',
        inputSummary: `Part: ${alert.sku}`,
        outputSummary: `Low stock detected: ${alert.currentStock} units (min: ${alert.minStockLevel}). Part: ${alert.name}`,
        confidence: new Prisma.Decimal(1.0),
        humanReviewed: false,
        entityType: 'Part',
        entityId: alert.partId,
      },
    });

    this.logger.debug(`Logged alert to audit trail for part ${alert.sku}`);
  }
}
