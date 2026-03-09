import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

/**
 * Data Subject Request entity from Prisma
 */
interface DataSubjectRequest {
  id: string;
  ticketNumber: string;
  requestType: string;
  status: string;
  requesterEmail?: string | null;
  requesterPhone?: string | null;
  customerId?: string | null;
  tenantId: string;
  receivedAt: Date;
  deadlineAt: Date;
  verifiedAt?: Date | null;
  completedAt?: Date | null;
  slaMet?: boolean | null;
  assignedTo?: string | null;
  rejectionReason?: string | null;
}

/**
 * Data Subject Request Types
 */
export type DataSubjectRequestType = 
  | 'ACCESS'      // Art. 15 - Right of access
  | 'DELETION'    // Art. 17 - Right to erasure
  | 'RECTIFICATION' // Art. 16 - Right to rectification
  | 'PORTABILITY' // Art. 20 - Right to data portability
  | 'RESTRICTION' // Art. 18 - Right to restriction of processing
  | 'OBJECTION';  // Art. 21 - Right to object

/**
 * Request status
 */
export type RequestStatus = 
  | 'RECEIVED'
  | 'VERIFICATION_PENDING'
  | 'VERIFIED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

/**
 * Priority level
 */
export type RequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

/**
 * Data subject request creation DTO
 */
export interface CreateDataSubjectRequestDto {
  tenantId: string;
  requestType: DataSubjectRequestType;
  requesterEmail?: string;
  requesterPhone?: string;
  customerId?: string;
  source?: 'EMAIL' | 'WEB_FORM' | 'PHONE' | 'MAIL';
  priority?: RequestPriority;
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * Data subject request response
 */
export interface DataSubjectRequestResponse {
  id: string;
  ticketNumber: string;
  requestType: DataSubjectRequestType;
  status: RequestStatus;
  requesterEmail?: string;
  requesterPhone?: string;
  customerId?: string;
  receivedAt: Date;
  deadlineAt: Date;
  verifiedAt?: Date;
  completedAt?: Date;
  slaMet?: boolean;
  assignedTo?: string;
  notes?: string;
}

/**
 * Request statistics
 */
export interface RequestStatistics {
  totalRequests: number;
  byType: Record<DataSubjectRequestType, number>;
  byStatus: Record<RequestStatus, number>;
  overdueCount: number;
  slaComplianceRate: number;
  averageCompletionTime: number; // in hours
}

/**
 * Verification result
 */
export interface VerificationResult {
  success: boolean;
  method: string;
  verifiedAt: Date;
  documents?: string[];
}

/**
 * GDPR Request Service
 * 
 * Manages data subject requests (DSR) lifecycle:
 * - Request intake and ticket generation
 * - Identity verification workflow
 * - SLA tracking and deadline management
 * - Assignment and escalation
 * - Status updates and notifications
 * 
 * @see GDPR Articles 12-22 - Data subject rights
 */
@Injectable()
export class GdprRequestService {
  // SLA: 30 days for all requests
  private readonly SLA_DAYS = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly loggerService: LoggerService,
  ) {}

  /**
   * Create a new data subject request
   * 
   * @param dto - Request creation data
   * @returns Created request with ticket number
   */
  async createRequest(dto: CreateDataSubjectRequestDto): Promise<DataSubjectRequestResponse> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${dto.tenantId} not found`);
    }

    // Generate ticket number
    const year = new Date().getFullYear();
    const sequence = await this.getNextTicketSequence(dto.tenantId, year);
    const ticketNumber = `GDPR-${year}-${sequence.toString().padStart(4, '0')}`;

    const receivedAt = new Date();
    const deadlineAt = new Date(receivedAt.getTime() + this.SLA_DAYS * 24 * 60 * 60 * 1000);

    // Create the request
    const request = await this.prisma.withTenant(dto.tenantId, async (prisma) => {
      return prisma.dataSubjectRequest.create({
        data: {
          tenantId: dto.tenantId,
          ticketNumber,
          requestType: dto.requestType,
          requesterEmail: dto.requesterEmail,
          requesterPhone: dto.requesterPhone,
          customerId: dto.customerId,
          status: 'RECEIVED',
          receivedAt,
          deadlineAt,
          priority: dto.priority || 'NORMAL',
          source: dto.source || 'EMAIL',
          notes: dto.notes,
          metadata: dto.metadata ? JSON.stringify(dto.metadata) : undefined,
        },
      });
    });

    this.loggerService.log(
      `Created data subject request ${ticketNumber} of type ${dto.requestType}`,
      'GdprRequestService',
    );

    // Log to audit trail
    await this.prisma.withTenant(dto.tenantId, async (prisma) => {
      await prisma.auditLog.create({
        data: {
          tenantId: dto.tenantId,
          action: 'DSR_CREATED',
          tableName: 'data_subject_requests',
          recordId: request.id,
          newValues: {
            ticketNumber,
            requestType: dto.requestType,
            requesterEmail: dto.requesterEmail,
          } as unknown as string,
          createdAt: receivedAt,
        },
      });
    });

    return this.mapToResponse(request);
  }

  /**
   * Get a request by ID
   * 
   * @param requestId - Request UUID
   * @param tenantId - Tenant ID
   * @returns Request details
   */
  async getRequest(requestId: string, tenantId: string): Promise<DataSubjectRequestResponse> {
    const request = await this.prisma.withTenant(tenantId, async (prisma) => {
      return prisma.dataSubjectRequest.findFirst({
        where: { id: requestId, tenantId },
      });
    });

    if (!request) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }

    return this.mapToResponse(request);
  }

  /**
   * Get a request by ticket number
   * 
   * @param ticketNumber - Ticket number (e.g., GDPR-2026-0001)
   * @param tenantId - Tenant ID
   * @returns Request details
   */
  async getRequestByTicket(ticketNumber: string, tenantId: string): Promise<DataSubjectRequestResponse> {
    const request = await this.prisma.withTenant(tenantId, async (prisma) => {
      return prisma.dataSubjectRequest.findFirst({
        where: { ticketNumber, tenantId },
      });
    });

    if (!request) {
      throw new NotFoundException(`Request ${ticketNumber} not found`);
    }

    return this.mapToResponse(request);
  }

  /**
   * List requests for a tenant
   * 
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns List of requests
   */
  async listRequests(
    tenantId: string,
    filters?: {
      status?: RequestStatus;
      type?: DataSubjectRequestType;
      pending?: boolean;
    },
  ): Promise<DataSubjectRequestResponse[]> {
    const where: any = { tenantId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.type) {
      where.requestType = filters.type;
    }

    if (filters?.pending) {
      where.status = {
        notIn: ['COMPLETED', 'REJECTED', 'CANCELLED'],
      };
    }

    const requests = await this.prisma.withTenant(tenantId, async (prisma) => {
      return prisma.dataSubjectRequest.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
      });
    });

    return requests.map((r: DataSubjectRequest) => this.mapToResponse(r));
  }

  /**
   * Update request status
   * 
   * @param requestId - Request UUID
   * @param tenantId - Tenant ID
   * @param status - New status
   * @param notes - Optional notes
   * @returns Updated request
   */
  async updateStatus(
    requestId: string,
    tenantId: string,
    status: RequestStatus,
    notes?: string,
  ): Promise<DataSubjectRequestResponse> {
    const request = await this.getRequest(requestId, tenantId);

    if (request.status === 'COMPLETED' || request.status === 'REJECTED') {
      throw new BadRequestException('Cannot modify completed or rejected requests');
    }

    const updateData: any = { status };

    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
      updateData.slaMet = new Date() <= request.deadlineAt;
    }

    if (notes) {
      updateData.notes = request.notes 
        ? `${request.notes}\n${new Date().toISOString()}: ${notes}` 
        : notes;
    }

    const updated = await this.prisma.withTenant(tenantId, async (prisma) => {
      return prisma.dataSubjectRequest.update({
        where: { id: requestId },
        data: updateData,
      });
    });

    this.loggerService.log(
      `Request ${request.ticketNumber} status updated to ${status}`,
      'GdprRequestService',
    );

    return this.mapToResponse(updated);
  }

  /**
   * Verify requester identity
   * 
   * @param requestId - Request UUID
   * @param tenantId - Tenant ID
   * @param verificationData - Verification details
   * @returns Verification result
   */
  async verifyIdentity(
    requestId: string,
    tenantId: string,
    verificationData: {
      method: string;
      documents?: string[];
      verifiedBy?: string;
    },
  ): Promise<VerificationResult> {
    const request = await this.getRequest(requestId, tenantId);

    if (request.status !== 'RECEIVED' && request.status !== 'VERIFICATION_PENDING') {
      throw new BadRequestException('Request is not pending verification');
    }

    const verifiedAt = new Date();

    await this.prisma.withTenant(tenantId, async (prisma) => {
      await prisma.dataSubjectRequest.update({
        where: { id: requestId },
        data: {
          status: 'VERIFIED',
          verifiedAt,
          verificationMethod: verificationData.method,
          verificationDocuments: verificationData.documents,
          identityVerified: true,
          notes: `Identity verified by ${verificationData.verifiedBy || 'system'} using ${verificationData.method}`,
        },
      });
    });

    this.loggerService.log(
      `Identity verified for request ${request.ticketNumber}`,
      'GdprRequestService',
    );

    return {
      success: true,
      method: verificationData.method,
      verifiedAt,
      documents: verificationData.documents,
    };
  }

  /**
   * Assign request to a user
   * 
   * @param requestId - Request UUID
   * @param tenantId - Tenant ID
   * @param userId - User to assign to
   * @returns Updated request
   */
  async assignRequest(
    requestId: string,
    tenantId: string,
    userId: string,
  ): Promise<DataSubjectRequestResponse> {
    const updated = await this.prisma.withTenant(tenantId, async (prisma) => {
      return prisma.dataSubjectRequest.update({
        where: { id: requestId },
        data: {
          assignedTo: userId,
          status: 'IN_PROGRESS',
        },
      });
    });

    this.loggerService.log(
      `Request ${updated.ticketNumber} assigned to user ${userId}`,
      'GdprRequestService',
    );

    return this.mapToResponse(updated);
  }

  /**
   * Reject a request
   * 
   * @param requestId - Request UUID
   * @param tenantId - Tenant ID
   * @param reason - Rejection reason
   * @param legalBasis - GDPR article allowing rejection
   * @returns Updated request
   */
  async rejectRequest(
    requestId: string,
    tenantId: string,
    reason: string,
    legalBasis?: string,
  ): Promise<DataSubjectRequestResponse> {
    const request = await this.getRequest(requestId, tenantId);

    if (request.status === 'COMPLETED') {
      throw new BadRequestException('Cannot reject completed request');
    }

    const updated = await this.prisma.withTenant(tenantId, async (prisma) => {
      return prisma.dataSubjectRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          completedAt: new Date(),
          rejectionReason: reason,
          rejectionBasis: legalBasis,
          notes: `Rejected: ${reason}`,
        },
      });
    });

    this.loggerService.log(
      `Request ${request.ticketNumber} rejected: ${reason}`,
      'GdprRequestService',
    );

    return this.mapToResponse(updated);
  }

  /**
   * Get pending requests that need attention
   * 
   * @param tenantId - Optional tenant filter
   * @returns Pending requests grouped by urgency
   */
  async getPendingRequests(tenantId?: string): Promise<{
    overdue: DataSubjectRequestResponse[];
    urgent: DataSubjectRequestResponse[];
    normal: DataSubjectRequestResponse[];
  }> {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const where: any = {
      status: {
        notIn: ['COMPLETED', 'REJECTED', 'CANCELLED'],
      },
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    const requests = await this.prisma.dataSubjectRequest.findMany({
      where,
      orderBy: { deadlineAt: 'asc' },
    });

    const overdue: DataSubjectRequestResponse[] = [];
    const urgent: DataSubjectRequestResponse[] = [];
    const normal: DataSubjectRequestResponse[] = [];

    for (const request of requests) {
      const response = this.mapToResponse(request);

      if (request.deadlineAt < now) {
        overdue.push(response);
      } else if (request.deadlineAt <= sevenDaysFromNow) {
        urgent.push(response);
      } else {
        normal.push(response);
      }
    }

    return { overdue, urgent, normal };
  }

  /**
   * Get request statistics
   * 
   * @param tenantId - Optional tenant filter
   * @returns Statistics summary
   */
  async getStatistics(tenantId?: string): Promise<RequestStatistics> {
    const where: any = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const [total, byType, byStatus, overdue, slaStats] = await Promise.all([
      this.prisma.dataSubjectRequest.count({ where }),
      this.prisma.dataSubjectRequest.groupBy({
        by: ['requestType'],
        where,
        _count: { requestType: true },
      }),
      this.prisma.dataSubjectRequest.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
      this.prisma.dataSubjectRequest.count({
        where: {
          ...where,
          status: { notIn: ['COMPLETED', 'REJECTED', 'CANCELLED'] },
          deadlineAt: { lt: new Date() },
        },
      }),
      this.prisma.dataSubjectRequest.aggregate({
        where: {
          ...where,
          status: 'COMPLETED',
        },
        _count: { slaMet: true },
      }),
    ]);

    const byTypeMap: Record<string, number> = {};
    for (const item of byType) {
      byTypeMap[item.requestType] = item._count.requestType;
    }

    const byStatusMap: Record<string, number> = {};
    for (const item of byStatus) {
      byStatusMap[item.status] = item._count.status;
    }

    return {
      totalRequests: total,
      byType: byTypeMap as Record<DataSubjectRequestType, number>,
      byStatus: byStatusMap as Record<RequestStatus, number>,
      overdueCount: overdue,
      slaComplianceRate: slaStats._count.slaMet / (slaStats._count.slaMet + overdue) || 0,
      averageCompletionTime: 0, // Would calculate from actual data
    };
  }

  /**
   * Get next ticket sequence number
   */
  private async getNextTicketSequence(tenantId: string, year: number): Promise<number> {
    const count = await this.prisma.dataSubjectRequest.count({
      where: {
        tenantId,
        ticketNumber: {
          startsWith: `GDPR-${year}-`,
        },
      },
    });
    return count + 1;
  }

  /**
   * Map database entity to response DTO
   */
  private mapToResponse(request: DataSubjectRequest): DataSubjectRequestResponse {
    return {
      id: request.id,
      ticketNumber: request.ticketNumber,
      requestType: request.requestType as DataSubjectRequestType,
      status: request.status as RequestStatus,
      requesterEmail: request.requesterEmail || undefined,
      requesterPhone: request.requesterPhone || undefined,
      customerId: request.customerId || undefined,
      receivedAt: request.receivedAt,
      deadlineAt: request.deadlineAt,
      verifiedAt: request.verifiedAt || undefined,
      completedAt: request.completedAt || undefined,
      slaMet: request.slaMet || undefined,
      assignedTo: request.assignedTo || undefined,
    };
  }
}
