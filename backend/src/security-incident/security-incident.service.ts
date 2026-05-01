import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import { SecurityIncidentStatus } from '@prisma/client';
import {
  CreateSecurityIncidentDto,
  UpdateSecurityIncidentDto,
  UpdateIncidentStatusDto,
  IncidentQueryDto,
} from './dto/security-incident.dto';

/** NIS2 deadline constants (milliseconds) */
const NIS2_EARLY_WARNING_MS = 24 * 60 * 60 * 1000; // 24h
const NIS2_FULL_REPORT_MS = 72 * 60 * 60 * 1000; // 72h

/** Valid state transitions map */
const STATUS_TRANSITIONS: Record<SecurityIncidentStatus, SecurityIncidentStatus[]> = {
  DETECTED: ['INVESTIGATING'],
  INVESTIGATING: ['CONTAINED'],
  CONTAINED: ['RESOLVED'],
  RESOLVED: ['REPORTED_ACN'],
  REPORTED_ACN: ['CLOSED'],
  CLOSED: [],
};

export interface Nis2DeadlineAlert {
  incidentId: string;
  title: string;
  severity: string;
  detectedAt: Date;
  hoursElapsed: number;
  earlyWarningOverdue: boolean;
  fullReportOverdue: boolean;
  status: string;
}

export interface ComplianceDashboard {
  mfaEnabledForAdmins: boolean;
  encryptionAtRest: boolean;
  auditLogging: boolean;
  incidentResponsePlanActive: boolean;
  openIncidents: number;
  avgResolutionTimeHours: number | null;
  nis2DeadlineAlerts: Nis2DeadlineAlert[];
  complianceScore: number;
}

@Injectable()
export class SecurityIncidentService {
  private readonly logger = new Logger(SecurityIncidentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Create a new security incident */
  async create(
    tenantId: string,
    dto: CreateSecurityIncidentDto,
    createdBy?: string,
  ): Promise<ReturnType<typeof this.prisma.securityIncident.create>> {
    this.logger.log(`Creating security incident for tenant ${tenantId}: ${dto.title}`);

    return this.prisma.securityIncident.create({
      data: {
        tenantId,
        title: dto.title,
        description: dto.description,
        severity: dto.severity,
        status: 'DETECTED',
        detectedAt: new Date(dto.detectedAt),
        incidentType: dto.incidentType,
        affectedSystems: dto.affectedSystems ?? [],
        affectedUsers: dto.affectedUsers,
        dataBreached: dto.dataBreached ?? false,
        responseActions: dto.responseActions,
        createdBy,
      },
    });
  }

  /** List incidents with pagination and filters */
  async findAll(
    tenantId: string,
    query: IncidentQueryDto,
  ): Promise<{ data: unknown[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (query.status) where.status = query.status;
    if (query.severity) where.severity = query.severity;
    if (query.incidentType) where.incidentType = query.incidentType;

    const [data, total] = await Promise.all([
      this.prisma.securityIncident.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.securityIncident.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /** Get single incident by ID */
  async findOne(
    tenantId: string,
    id: string,
  ): Promise<ReturnType<typeof this.prisma.securityIncident.findUnique>> {
    const incident = await this.prisma.securityIncident.findUnique({
      where: { id },
    });

    if (!incident || incident.tenantId !== tenantId) {
      throw new NotFoundException(`Incidente di sicurezza ${id} non trovato`);
    }

    return incident;
  }

  /** Update incident details (not status) */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateSecurityIncidentDto,
  ): Promise<ReturnType<typeof this.prisma.securityIncident.update>> {
    await this.findOne(tenantId, id);

    return this.prisma.securityIncident.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.severity !== undefined && { severity: dto.severity }),
        ...(dto.incidentType !== undefined && { incidentType: dto.incidentType }),
        ...(dto.affectedSystems !== undefined && { affectedSystems: dto.affectedSystems }),
        ...(dto.affectedUsers !== undefined && { affectedUsers: dto.affectedUsers }),
        ...(dto.dataBreached !== undefined && { dataBreached: dto.dataBreached }),
        ...(dto.responseActions !== undefined && { responseActions: dto.responseActions }),
        ...(dto.rootCause !== undefined && { rootCause: dto.rootCause }),
        ...(dto.preventiveMeasures !== undefined && { preventiveMeasures: dto.preventiveMeasures }),
      },
    });
  }

  /** Transition incident status with validation */
  async updateStatus(
    tenantId: string,
    id: string,
    dto: UpdateIncidentStatusDto,
  ): Promise<ReturnType<typeof this.prisma.securityIncident.update>> {
    const incident = await this.findOne(tenantId, id);
    if (!incident) {
      throw new NotFoundException(`Incidente di sicurezza ${id} non trovato`);
    }

    const currentStatus = incident.status as SecurityIncidentStatus;
    const newStatus = dto.status as SecurityIncidentStatus;
    // eslint-disable-next-line security/detect-object-injection
    const allowed = STATUS_TRANSITIONS[currentStatus];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Transizione non valida: ${currentStatus} -> ${newStatus}. ` +
          `Transizioni consentite: ${allowed.join(', ') || 'nessuna'}`,
      );
    }

    const timestampUpdates: Record<string, Date> = {};
    const now = new Date();

    if (newStatus === 'CONTAINED') timestampUpdates.containedAt = now;
    if (newStatus === 'RESOLVED') timestampUpdates.resolvedAt = now;
    if (newStatus === 'REPORTED_ACN') timestampUpdates.reportedAt = now;

    this.logger.log(`Incident ${id}: status ${currentStatus} -> ${newStatus}`);

    return this.prisma.securityIncident.update({
      where: { id },
      data: {
        status: newStatus,
        ...timestampUpdates,
      },
    });
  }

  /** Check NIS2 deadline compliance for all open incidents */
  async checkNis2Deadlines(tenantId: string): Promise<Nis2DeadlineAlert[]> {
    const openIncidents = await this.prisma.securityIncident.findMany({
      where: {
        tenantId,
        status: { notIn: ['REPORTED_ACN', 'CLOSED'] },
      },
      orderBy: { detectedAt: 'asc' },
    });

    const now = Date.now();
    return openIncidents.map(incident => {
      const elapsed = now - incident.detectedAt.getTime();
      return {
        incidentId: incident.id,
        title: incident.title,
        severity: incident.severity,
        detectedAt: incident.detectedAt,
        hoursElapsed: Math.round((elapsed / (60 * 60 * 1000)) * 10) / 10,
        earlyWarningOverdue: elapsed > NIS2_EARLY_WARNING_MS,
        fullReportOverdue: elapsed > NIS2_FULL_REPORT_MS,
        status: incident.status,
      };
    });
  }

  /** Get NIS2 incident dashboard stats */
  async getDashboard(tenantId: string): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    avgResolutionTimeHours: number | null;
    nis2Alerts: Nis2DeadlineAlert[];
  }> {
    const [incidents, nis2Alerts] = await Promise.all([
      this.prisma.securityIncident.findMany({ where: { tenantId } }),
      this.checkNis2Deadlines(tenantId),
    ]);

    const bySeverity: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    const byStatus: Record<string, number> = {
      DETECTED: 0,
      INVESTIGATING: 0,
      CONTAINED: 0,
      RESOLVED: 0,
      REPORTED_ACN: 0,
      CLOSED: 0,
    };

    let totalResolutionMs = 0;
    let resolvedCount = 0;

    for (const inc of incidents) {
      bySeverity[inc.severity] = (bySeverity[inc.severity] || 0) + 1;
      byStatus[inc.status] = (byStatus[inc.status] || 0) + 1;

      if (inc.resolvedAt && inc.detectedAt) {
        totalResolutionMs += inc.resolvedAt.getTime() - inc.detectedAt.getTime();
        resolvedCount++;
      }
    }

    const avgResolutionTimeHours =
      resolvedCount > 0
        ? Math.round((totalResolutionMs / resolvedCount / (60 * 60 * 1000)) * 10) / 10
        : null;

    return {
      total: incidents.length,
      bySeverity,
      byStatus,
      avgResolutionTimeHours,
      nis2Alerts,
    };
  }

  /** Get NIS2 compliance overview */
  async getComplianceOverview(tenantId: string): Promise<ComplianceDashboard> {
    // Check if MFA is enabled for all admin users
    const adminUsers = await this.prisma.user.findMany({
      where: { tenantId, role: 'ADMIN', isActive: true },
      select: { id: true, totpEnabled: true, smsOtpEnabled: true },
    });
    const mfaEnabledForAdmins =
      adminUsers.length > 0 &&
      adminUsers.every(u => u.totpEnabled === true || u.smsOtpEnabled === true);

    // Open incidents
    const openIncidents = await this.prisma.securityIncident.count({
      where: {
        tenantId,
        status: { notIn: ['CLOSED', 'REPORTED_ACN'] },
      },
    });

    // Average resolution time
    const resolvedIncidents = await this.prisma.securityIncident.findMany({
      where: { tenantId, resolvedAt: { not: null } },
      select: { detectedAt: true, resolvedAt: true },
    });

    let avgResolutionTimeHours: number | null = null;
    if (resolvedIncidents.length > 0) {
      const totalMs = resolvedIncidents.reduce((acc, inc) => {
        return acc + (inc.resolvedAt!.getTime() - inc.detectedAt.getTime());
      }, 0);
      avgResolutionTimeHours =
        Math.round((totalMs / resolvedIncidents.length / (60 * 60 * 1000)) * 10) / 10;
    }

    // NIS2 deadline alerts
    const nis2DeadlineAlerts = await this.checkNis2Deadlines(tenantId);

    // Incident response plan is "active" if the tenant has at least handled one incident
    const handledIncidents = await this.prisma.securityIncident.count({
      where: {
        tenantId,
        status: { in: ['RESOLVED', 'REPORTED_ACN', 'CLOSED'] },
      },
    });
    const incidentResponsePlanActive = handledIncidents > 0;

    // Calculate compliance score (0-100)
    let score = 0;
    // MFA for admins: 25 points
    if (mfaEnabledForAdmins) score += 25;
    // Encryption at rest: 25 points (always true)
    score += 25;
    // Audit logging: 25 points (always true)
    score += 25;
    // No overdue NIS2 deadlines: 25 points
    const overdueCount = nis2DeadlineAlerts.filter(
      a => a.earlyWarningOverdue || a.fullReportOverdue,
    ).length;
    if (overdueCount === 0) score += 25;
    else if (overdueCount <= 2) score += 15;
    else score += 5;

    return {
      mfaEnabledForAdmins,
      encryptionAtRest: true,
      auditLogging: true,
      incidentResponsePlanActive,
      openIncidents,
      avgResolutionTimeHours,
      nis2DeadlineAlerts,
      complianceScore: score,
    };
  }
}
