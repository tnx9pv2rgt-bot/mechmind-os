/**
 * MechMind OS - Digital Vehicle Inspection Service
 * 
 * Manages complete vehicle inspection workflow:
 * - Create inspections from templates
 * - Record inspection items with photos
 * - Track findings and severity
 * - Customer approval workflow
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/services/prisma.service';
import { S3Service } from '../../common/services/s3.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import {
  CreateInspectionDto,
  UpdateInspectionDto,
  CreateFindingDto,
  UpdateFindingDto,
  CustomerApprovalDto,
  InspectionResponseDto,
  InspectionSummaryDto,
} from '../dto/inspection.dto';
import { InspectionStatus, InspectionItemStatus, FindingStatus } from '@prisma/client';

@Injectable()
export class InspectionService {
  private readonly photoBucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly s3: S3Service,
    private readonly notifications: NotificationsService,
  ) {
    this.photoBucket = this.config.get<string>('S3_INSPECTION_PHOTOS_BUCKET', 'mechmind-inspection-photos');
  }

  /**
   * Create a new inspection from template
   */
  async create(tenantId: string, dto: CreateInspectionDto): Promise<InspectionResponseDto> {
    // Verify template exists and belongs to tenant
    const template = await this.prisma.inspectionTemplate.findFirst({
      where: { id: dto.templateId, tenantId, isActive: true },
      include: { items: { orderBy: { position: 'asc' } } },
    });

    if (!template) {
      throw new NotFoundException('Inspection template not found');
    }

    // Create inspection with template items
    const inspection = await this.prisma.inspection.create({
      data: {
        tenantId,
        templateId: dto.templateId,
        vehicleId: dto.vehicleId,
        customerId: dto.customerId,
        mechanicId: dto.mechanicId,
        mileage: dto.mileage,
        fuelLevel: dto.fuelLevel,
        status: InspectionStatus.IN_PROGRESS,
        items: {
          create: template.items.map(item => ({
            templateItemId: item.id,
            status: InspectionItemStatus.PENDING,
          })),
        },
      },
      include: {
        vehicle: true,
        customer: true,
        mechanic: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { templateItem: true, photos: true } },
        findings: true,
        photos: true,
      },
    });

    return this.mapToResponseDto(inspection);
  }

  /**
   * Get inspection by ID
   */
  async findById(tenantId: string, id: string): Promise<InspectionResponseDto> {
    const inspection = await this.prisma.inspection.findFirst({
      where: { id, tenantId },
      include: {
        vehicle: true,
        customer: true,
        mechanic: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { templateItem: true, photos: true } },
        findings: true,
        photos: true,
      },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    return this.mapToResponseDto(inspection);
  }

  /**
   * List inspections with filters
   */
  async findAll(
    tenantId: string,
    filters: { vehicleId?: string; customerId?: string; status?: InspectionStatus; mechanicId?: string },
  ): Promise<InspectionSummaryDto[]> {
    const inspections = await this.prisma.inspection.findMany({
      where: {
        tenantId,
        ...(filters.vehicleId && { vehicleId: filters.vehicleId }),
        ...(filters.customerId && { customerId: filters.customerId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.mechanicId && { mechanicId: filters.mechanicId }),
      },
      include: {
        vehicle: true,
        customer: true,
        mechanic: { select: { firstName: true, lastName: true } },
        findings: { select: { severity: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    return inspections.map(i => ({
      id: i.id,
      status: i.status,
      startedAt: i.startedAt,
      vehicleInfo: `${i.vehicle.make} ${i.vehicle.model} (${i.vehicle.licensePlate})`,
      customerName: i.customer.encryptedFirstName || 'Unknown', // Decrypt if needed
      mechanicName: `${i.mechanic.firstName} ${i.mechanic.lastName}`,
      issuesFound: i.findings.length,
      criticalIssues: i.findings.filter(f => f.severity === 'CRITICAL').length,
    }));
  }

  /**
   * Update inspection progress
   */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateInspectionDto,
    mechanicId: string,
  ): Promise<InspectionResponseDto> {
    const inspection = await this.prisma.inspection.findFirst({
      where: { id, tenantId, mechanicId },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    // Update items if provided
    if (dto.items) {
      for (const item of dto.items) {
        await this.prisma.inspectionItem.updateMany({
          where: {
            inspectionId: id,
            templateItemId: item.templateItemId,
          },
          data: {
            status: item.status,
            notes: item.notes,
            severity: item.severity,
          },
        });
      }
    }

    // Update inspection
    const updated = await this.prisma.inspection.update({
      where: { id },
      data: {
        status: dto.status,
        mileage: dto.mileage,
        ...(dto.status === InspectionStatus.READY_FOR_CUSTOMER && {
          completedAt: new Date(),
        }),
      },
      include: {
        vehicle: true,
        customer: true,
        mechanic: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { templateItem: true, photos: true } },
        findings: true,
        photos: true,
      },
    });

    // Notify customer if ready for review
    if (dto.status === InspectionStatus.READY_FOR_CUSTOMER) {
      await this.notifyCustomer(updated);
    }

    return this.mapToResponseDto(updated);
  }

  /**
   * Add finding to inspection
   */
  async addFinding(
    tenantId: string,
    inspectionId: string,
    dto: CreateFindingDto,
  ): Promise<void> {
    const inspection = await this.prisma.inspection.findFirst({
      where: { id: inspectionId, tenantId },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    await this.prisma.inspectionFinding.create({
      data: {
        inspectionId,
        category: dto.category,
        title: dto.title,
        description: dto.description,
        severity: dto.severity,
        recommendation: dto.recommendation,
        estimatedCost: dto.estimatedCost,
        status: FindingStatus.REPORTED,
      },
    });
  }

  /**
   * Update finding status
   */
  async updateFinding(
    tenantId: string,
    findingId: string,
    dto: UpdateFindingDto,
  ): Promise<void> {
    const finding = await this.prisma.inspectionFinding.findFirst({
      where: { id: findingId, inspection: { tenantId } },
    });

    if (!finding) {
      throw new NotFoundException('Finding not found');
    }

    await this.prisma.inspectionFinding.update({
      where: { id: findingId },
      data: {
        status: dto.status,
        ...(dto.approvedByCustomer && {
          approvedByCustomer: true,
          approvedAt: new Date(),
        }),
      },
    });
  }

  /**
   * Upload inspection photo
   */
  async uploadPhoto(
    tenantId: string,
    inspectionId: string,
    file: Buffer,
    mimeType: string,
    uploadedBy: string,
    itemId?: string,
    category?: string,
    description?: string,
  ): Promise<{ id: string; url: string }> {
    const inspection = await this.prisma.inspection.findFirst({
      where: { id: inspectionId, tenantId },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    // Generate unique key
    const timestamp = Date.now();
    const key = `inspections/${tenantId}/${inspectionId}/${timestamp}.jpg`;

    // Upload to S3
    await this.s3.upload(this.photoBucket, key, file, mimeType);

    // Generate presigned URL
    const url = await this.s3.getSignedUrl(this.photoBucket, key, 3600 * 24 * 7); // 7 days

    // Save to database
    const photo = await this.prisma.inspectionPhoto.create({
      data: {
        inspectionId,
        itemId,
        s3Key: key,
        s3Bucket: this.photoBucket,
        url,
        category,
        description,
        takenBy: uploadedBy,
      },
    });

    return { id: photo.id, url };
  }

  /**
   * Submit customer approval
   */
  async submitCustomerApproval(
    tenantId: string,
    inspectionId: string,
    dto: CustomerApprovalDto,
  ): Promise<void> {
    const inspection = await this.prisma.inspection.findFirst({
      where: { id: inspectionId, tenantId },
      include: { customer: true },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    // Verify customer email (simple check - could be more sophisticated)
    // In production, use signed URLs with JWT tokens instead

    // Update approved findings
    if (dto.approvedFindingIds.length > 0) {
      await this.prisma.inspectionFinding.updateMany({
        where: { id: { in: dto.approvedFindingIds } },
        data: {
          status: FindingStatus.APPROVED,
          approvedByCustomer: true,
          approvedAt: new Date(),
        },
      });
    }

    // Update declined findings
    if (dto.declinedFindingIds.length > 0) {
      await this.prisma.inspectionFinding.updateMany({
        where: { id: { in: dto.declinedFindingIds } },
        data: { status: FindingStatus.DECLINED },
      });
    }

    // Update inspection status
    await this.prisma.inspection.update({
      where: { id: inspectionId },
      data: {
        status: InspectionStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: dto.email,
      },
    });

    // Notify mechanic/shop
    await this.notifications.sendToUser({
      tenantId,
      userId: inspection.mechanicId,
      title: 'Inspection Approved',
      body: `Customer has approved the inspection findings`,
      data: { inspectionId, type: 'INSPECTION_APPROVED' },
    });
  }

  /**
   * Generate PDF report
   */
  async generateReport(tenantId: string, inspectionId: string): Promise<Buffer> {
    const inspection = await this.findById(tenantId, inspectionId);
    
    // TODO: Implement PDF generation using puppeteer or similar
    // This would generate a professional inspection report
    
    throw new Error('PDF generation not yet implemented');
  }

  // ============== PRIVATE METHODS ==============

  private async notifyCustomer(inspection: any): Promise<void> {
    // Send email/SMS notification to customer
    await this.notifications.sendEmail({
      tenantId: inspection.tenantId,
      to: inspection.customer.encryptedEmail,
      subject: 'Your Vehicle Inspection is Ready',
      template: 'inspection-ready',
      data: {
        customerName: inspection.customer.encryptedFirstName,
        vehicleInfo: `${inspection.vehicle.make} ${inspection.vehicle.model}`,
        inspectionUrl: `${this.config.get('FRONTEND_URL')}/inspections/${inspection.id}`,
        findingsCount: inspection.findings.length,
      },
    });

    // Update notification status
    await this.prisma.inspection.update({
      where: { id: inspection.id },
      data: { customerNotified: true },
    });
  }

  private mapToResponseDto(inspection: any): InspectionResponseDto {
    return {
      id: inspection.id,
      status: inspection.status,
      startedAt: inspection.startedAt,
      completedAt: inspection.completedAt ?? undefined,
      mileage: inspection.mileage ?? undefined,
      fuelLevel: inspection.fuelLevel ?? undefined,
      vehicle: {
        id: inspection.vehicle.id,
        make: inspection.vehicle.make,
        model: inspection.vehicle.model,
        licensePlate: inspection.vehicle.licensePlate,
      },
      customer: {
        id: inspection.customer.id,
        firstName: inspection.customer.encryptedFirstName || '',
        lastName: inspection.customer.encryptedLastName || '',
      },
      mechanic: {
        id: inspection.mechanic.id,
        firstName: inspection.mechanic.firstName,
        lastName: inspection.mechanic.lastName,
      },
      items: inspection.items.map((item: any) => ({
        id: item.id,
        category: item.templateItem.category,
        name: item.templateItem.name,
        status: item.status,
        notes: item.notes ?? undefined,
        severity: item.severity ?? undefined,
        photos: item.photos.map((p: any) => ({
          id: p.id,
          url: p.url,
          thumbnailUrl: p.thumbnailUrl ?? undefined,
          category: p.category ?? undefined,
          description: p.description ?? undefined,
          takenAt: p.takenAt,
        })),
      })),
      findings: inspection.findings.map((f: any) => ({
        id: f.id,
        category: f.category,
        title: f.title,
        description: f.description,
        severity: f.severity,
        recommendation: f.recommendation ?? undefined,
        estimatedCost: f.estimatedCost ? Number(f.estimatedCost) : undefined,
        status: f.status,
        approvedByCustomer: f.approvedByCustomer,
      })),
      photos: inspection.photos.map((p: any) => ({
        id: p.id,
        url: p.url,
        thumbnailUrl: p.thumbnailUrl ?? undefined,
        category: p.category ?? undefined,
        description: p.description ?? undefined,
        takenAt: p.takenAt,
      })),
      customerNotified: inspection.customerNotified,
      customerViewed: inspection.customerViewed,
      approvedAt: inspection.approvedAt ?? undefined,
    };
  }
}
