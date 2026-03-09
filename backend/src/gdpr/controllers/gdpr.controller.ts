import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';

// Services
import { GdprDeletionService } from '../services/gdpr-deletion.service';
import { DataRetentionService } from '../services/data-retention.service';
import { GdprConsentService } from '../services/gdpr-consent.service';
import { GdprExportService, ExportFormat } from '../services/gdpr-export.service';
import { UserRole } from '@auth/guards/roles.guard';
import { GdprRequestService, DataSubjectRequestType } from '../services/gdpr-request.service';

// DTOs
import { 
  CreateConsentDto, 
  CreateDataSubjectRequestDto, 
  VerifyIdentityDto,
  UpdateRequestStatusDto,
} from '../dto/gdpr.dto';

/**
 * GDPR Controller
 * 
 * REST API endpoints for GDPR compliance operations:
 * - Data subject requests (CRUD)
 * - Consent management
 * - Data exports
 * - Deletion requests
 * - Retention policy management
 */
@Controller('gdpr')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GdprController {
  constructor(
    private readonly deletionService: GdprDeletionService,
    private readonly retentionService: DataRetentionService,
    private readonly consentService: GdprConsentService,
    private readonly exportService: GdprExportService,
    private readonly requestService: GdprRequestService,
  ) {}

  // ============================================================================
  // Data Subject Requests (Art. 12-22)
  // ============================================================================

  /**
   * Create a new data subject request
   * @param dto Request data
   * @param user Current user
   */
  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async createRequest(
    @Body() dto: CreateDataSubjectRequestDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.requestService.createRequest({
      ...dto,
      tenantId,
      source: 'WEB_FORM',
      requestType: dto.requestType as any,
      priority: dto.priority as any,
    });
  }

  /**
   * List data subject requests
   * @param tenantId Tenant ID
   * @param status Optional status filter
   * @param type Optional type filter
   */
  @Get('requests')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async listRequests(
    @Query('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.requestService.listRequests(tenantId, {
      status: status as any,
      type: type as DataSubjectRequestType,
    });
  }

  /**
   * Get pending requests (overdue, urgent, normal)
   * @param tenantId Optional tenant filter
   */
  @Get('requests/pending')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async getPendingRequests(
    @Query('tenantId') tenantId?: string,
  ) {
    return this.requestService.getPendingRequests(tenantId);
  }

  /**
   * Get a specific request
   * @param requestId Request UUID
   * @param tenantId Tenant ID
   */
  @Get('requests/:requestId')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async getRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.requestService.getRequest(requestId, tenantId);
  }

  /**
   * Update request status
   * @param requestId Request UUID
   * @param tenantId Tenant ID
   * @param dto Status update
   */
  @Patch('requests/:requestId/status')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async updateRequestStatus(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: UpdateRequestStatusDto,
  ) {
    return this.requestService.updateStatus(requestId, tenantId, dto.status as any, dto.notes);
  }

  /**
   * Verify requester identity
   * @param requestId Request UUID
   * @param tenantId Tenant ID
   * @param dto Verification data
   */
  @Post('requests/:requestId/verify')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async verifyIdentity(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: VerifyIdentityDto,
  ) {
    return this.requestService.verifyIdentity(requestId, tenantId, dto);
  }

  /**
   * Assign request to user
   * @param requestId Request UUID
   * @param tenantId Tenant ID
   * @param userId User to assign
   */
  @Post('requests/:requestId/assign')
  @Roles(UserRole.ADMIN)
  async assignRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Query('tenantId') tenantId: string,
    @Body('userId') userId: string,
  ) {
    return this.requestService.assignRequest(requestId, tenantId, userId);
  }

  /**
   * Reject a request
   * @param requestId Request UUID
   * @param tenantId Tenant ID
   * @param body Rejection details
   */
  @Post('requests/:requestId/reject')
  @Roles(UserRole.ADMIN)
  async rejectRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Query('tenantId') tenantId: string,
    @Body() body: { reason: string; legalBasis?: string },
  ) {
    return this.requestService.rejectRequest(requestId, tenantId, body.reason, body.legalBasis);
  }

  /**
   * Get request statistics
   * @param tenantId Optional tenant filter
   */
  @Get('requests/stats')
  @Roles(UserRole.ADMIN)
  async getRequestStats(
    @Query('tenantId') tenantId?: string,
  ) {
    return this.requestService.getStatistics(tenantId);
  }

  // ============================================================================
  // Data Exports (Art. 15, 20)
  // ============================================================================

  /**
   * Export customer data (Right of Access - Art. 15)
   * @param customerId Customer UUID
   * @param tenantId Tenant ID
   * @param format Export format
   * @param requestId Optional associated request ID
   */
  @Get('customers/:customerId/export')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async exportCustomerData(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('tenantId') tenantId: string,
    @Query('format') format: ExportFormat = 'JSON',
    @Query('requestId') requestId?: string,
  ) {
    return this.exportService.exportCustomerData(customerId, tenantId, format, requestId);
  }

  /**
   * Create portable data export (Art. 20)
   * @param customerId Customer UUID
   * @param tenantId Tenant ID
   */
  @Get('customers/:customerId/portability')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async exportPortableData(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.exportService.exportPortableData(customerId, tenantId);
  }

  /**
   * Generate and queue export job
   * @param customerId Customer UUID
   * @param tenantId Tenant ID
   * @param format Export format
   */
  @Post('customers/:customerId/export')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async generateExport(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('tenantId') tenantId: string,
    @Body('format') format: ExportFormat = 'JSON',
  ) {
    return this.exportService.generateExport(customerId, tenantId, format);
  }

  // ============================================================================
  // Data Deletion (Art. 17)
  // ============================================================================

  /**
   * Queue customer data deletion (Right to Erasure)
   * @param customerId Customer UUID
   * @param tenantId Tenant ID
   * @param body Deletion details
   */
  @Post('customers/:customerId/delete')
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async queueDeletion(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('tenantId') tenantId: string,
    @Body() body: {
      requestId: string;
      reason: string;
      verificationMethod?: string;
    },
  ) {
    return this.deletionService.queueDeletion(
      customerId,
      tenantId,
      body.requestId,
      body.reason,
      {
        identityVerificationMethod: body.verificationMethod,
      },
    );
  }

  /**
   * Get deletion job status
   * @param jobId BullMQ job ID
   */
  @Get('deletion-jobs/:jobId')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async getDeletionJobStatus(
    @Param('jobId') jobId: string,
  ) {
    return this.deletionService.getJobStatus(jobId);
  }

  /**
   * Cancel a pending deletion job
   * @param jobId BullMQ job ID
   * @param body Cancellation reason
   */
  @Post('deletion-jobs/:jobId/cancel')
  @Roles(UserRole.ADMIN)
  async cancelDeletion(
    @Param('jobId') jobId: string,
    @Body('reason') reason: string,
  ) {
    return this.deletionService.cancelDeletion(jobId, reason);
  }

  /**
   * Get deletion queue statistics
   */
  @Get('deletion-jobs/stats')
  @Roles(UserRole.ADMIN)
  async getDeletionQueueStats() {
    return this.deletionService.getQueueStats();
  }

  // ============================================================================
  // Consent Management
  // ============================================================================

  /**
   * Record customer consent
   * @param customerId Customer UUID
   * @param tenantId Tenant ID
   * @param dto Consent data
   * @param headers Request headers for IP/user agent
   */
  @Post('customers/:customerId/consent')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async recordConsent(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: CreateConsentDto,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.consentService.recordConsent(
      customerId,
      tenantId,
      dto.consentType as any,
      dto.granted,
      {
        ipAddress: forwardedFor,
        userAgent,
        collectionMethod: dto.collectionMethod,
        collectionPoint: dto.collectionPoint,
        legalBasis: dto.legalBasis,
        verifiedIdentity: dto.verifiedIdentity,
        metadata: dto.metadata,
      },
    );
  }

  /**
   * Revoke customer consent
   * @param customerId Customer UUID
   * @param tenantId Tenant ID
   * @param consentType Type of consent to revoke
   * @param body Revocation details
   */
  @Delete('customers/:customerId/consent/:consentType')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async revokeConsent(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('tenantId') tenantId: string,
    @Param('consentType') consentType: string,
    @Body() body: { reason?: string; revokedBy?: string },
  ) {
    return this.consentService.revokeConsent(
      customerId,
      tenantId,
      consentType as any,
      body.reason,
      body.revokedBy,
    );
  }

  /**
   * Get customer consent status
   * @param customerId Customer UUID
   * @param tenantId Tenant ID
   */
  @Get('customers/:customerId/consent')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async getConsentStatus(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.consentService.getCustomerConsentStatus(customerId, tenantId);
  }

  /**
   * Get consent audit trail
   * @param customerId Customer UUID
   * @param tenantId Tenant ID
   */
  @Get('customers/:customerId/consent/history')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async getConsentHistory(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.consentService.getConsentAuditTrail(customerId, tenantId);
  }

  // ============================================================================
  // Data Retention
  // ============================================================================

  /**
   * Get retention policy configuration
   */
  @Get('retention/policy')
  @Roles(UserRole.ADMIN)
  async getRetentionPolicy() {
    return this.retentionService.getRetentionPolicy();
  }

  /**
   * Get retention statistics for a tenant
   * @param tenantId Tenant ID
   */
  @Get('retention/stats')
  @Roles(UserRole.ADMIN)
  async getRetentionStats(
    @Query('tenantId') tenantId: string,
  ) {
    return this.retentionService.getTenantRetentionStats(tenantId);
  }

  /**
   * Update tenant retention policy
   * @param tenantId Tenant ID
   * @param body New retention days
   */
  @Patch('retention/policy')
  @Roles(UserRole.ADMIN)
  async updateRetentionPolicy(
    @Query('tenantId') tenantId: string,
    @Body('days') days: number,
  ) {
    return this.retentionService.updateTenantRetentionPolicy(tenantId, days);
  }

  /**
   * Trigger manual retention enforcement
   * @param tenantId Optional tenant filter
   */
  @Post('retention/enforce')
  @Roles(UserRole.ADMIN)
  async enforceRetention(
    @Query('tenantId') tenantId?: string,
  ) {
    return this.retentionService.queueRetentionEnforcement(tenantId);
  }
}
