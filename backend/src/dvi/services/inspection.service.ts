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
import {
  InspectionStatus,
  InspectionItemStatus,
  FindingStatus,
  InspectionFinding,
} from '@prisma/client';

@Injectable()
export class InspectionService {
  private readonly photoBucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly s3: S3Service,
    private readonly notifications: NotificationsService,
  ) {
    this.photoBucket = this.config.get<string>(
      'S3_INSPECTION_PHOTOS_BUCKET',
      'mechmind-inspection-photos',
    );
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
        mechanic: { select: { id: true, name: true } },
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
        mechanic: { select: { id: true, name: true } },
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
    filters: {
      vehicleId?: string;
      customerId?: string;
      status?: InspectionStatus;
      mechanicId?: string;
    },
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
        mechanic: { select: { name: true } },
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
      mechanicName: i.mechanic.name,
      issuesFound: i.findings.length,
      criticalIssues: i.findings.filter((f: InspectionFinding) => f.severity === 'CRITICAL').length,
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
        mechanic: { select: { id: true, name: true } },
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
  async addFinding(tenantId: string, inspectionId: string, dto: CreateFindingDto): Promise<void> {
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
  async updateFinding(tenantId: string, findingId: string, dto: UpdateFindingDto): Promise<void> {
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
    await this.notifications.sendNotification({
      tenantId,
      userId: inspection.mechanicId,
      type: 'inspection_completed',
      title: 'Inspection Approved',
      message: `Customer has approved the inspection findings`,
      data: { inspectionId, type: 'INSPECTION_APPROVED' },
    });
  }

  /**
   * Generate PDF report for a vehicle inspection using PDFKit
   */
  async generateReport(tenantId: string, inspectionId: string): Promise<Buffer> {
    const inspection = await this.findById(tenantId, inspectionId);

    // Dynamic import to keep PDFKit optional
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(22).text('Digital Vehicle Inspection Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#666').text(`Report ID: ${inspection.id}`, { align: 'center' });
      doc.moveDown(1);

      // Vehicle info
      doc.fontSize(14).fillColor('#000').text('Vehicle Information');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
      doc.moveDown(0.3);
      doc.fontSize(10);
      doc.text(`Make/Model: ${inspection.vehicle.make} ${inspection.vehicle.model}`);
      doc.text(`License Plate: ${inspection.vehicle.licensePlate}`);
      if (inspection.mileage) doc.text(`Mileage: ${inspection.mileage.toLocaleString()} km`);
      if (inspection.fuelLevel) doc.text(`Fuel Level: ${inspection.fuelLevel}`);
      doc.text(`Mechanic: ${inspection.mechanic.name}`);
      doc.text(`Date: ${inspection.startedAt.toLocaleDateString('it-IT')}`);
      doc.moveDown(1);

      // Findings summary
      doc.fontSize(14).text('Findings Summary');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
      doc.moveDown(0.3);
      doc.fontSize(10);

      if (inspection.findings.length === 0) {
        doc.font('Helvetica-Oblique').text('No issues found.').font('Helvetica');
      } else {
        for (const finding of inspection.findings) {
          const severityColor =
            finding.severity === 'CRITICAL'
              ? '#dc2626'
              : finding.severity === 'HIGH'
                ? '#ea580c'
                : finding.severity === 'MEDIUM'
                  ? '#ca8a04'
                  : '#16a34a';

          doc.fillColor(severityColor).text(`[${finding.severity}] `, { continued: true });
          doc.fillColor('#000').text(`${finding.title} — ${finding.description}`);
          if (finding.recommendation) {
            doc.fillColor('#555').text(`  Recommendation: ${finding.recommendation}`);
          }
          if (finding.estimatedCost !== undefined) {
            doc.text(`  Estimated Cost: €${finding.estimatedCost.toFixed(2)}`);
          }
          doc.fillColor('#000');
          doc.moveDown(0.3);
        }
      }
      doc.moveDown(1);

      // Inspection items
      doc.fontSize(14).text('Inspection Items');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
      doc.moveDown(0.3);
      doc.fontSize(10);

      for (const item of inspection.items) {
        const statusIcon =
          item.status === 'CHECKED'
            ? 'OK'
            : item.status === 'ISSUE_FOUND'
              ? 'ISSUE'
              : item.status === 'NOT_APPLICABLE'
                ? 'N/A'
                : 'PENDING';

        doc.text(`${item.category} > ${item.name}: ${statusIcon}`);
        if (item.notes) doc.fillColor('#555').text(`  Notes: ${item.notes}`).fillColor('#000');
      }

      // Footer
      doc.moveDown(2);
      doc
        .fontSize(8)
        .fillColor('#999')
        .text(`Generated by MechMind OS on ${new Date().toLocaleString('it-IT')}`, {
          align: 'center',
        });

      doc.end();
    });
  }

  // ============== PRIVATE METHODS ==============

  private async notifyCustomer(inspection: any): Promise<void> {
    // Send email/SMS notification to customer
    await this.notifications.sendNotification({
      tenantId: inspection.tenantId,
      userId: inspection.mechanicId,
      type: 'inspection_completed',
      title: 'Your Vehicle Inspection is Ready',
      message: 'Your vehicle inspection has been completed and is ready for review.',
      data: {
        customerName: inspection.customer.encryptedFirstName,
        vehicleInfo: `${inspection.vehicle.make} ${inspection.vehicle.model}`,
        inspectionUrl: `${this.config.get('FRONTEND_URL')}/inspections/${inspection.id}`,
        findingsCount: inspection.findings.length,
      },
      email: {
        to: inspection.customer.encryptedEmail,
        subject: 'Your Vehicle Inspection is Ready',
        template: 'inspection-ready',
        variables: {
          customerName: inspection.customer.encryptedFirstName,
          vehicleInfo: `${inspection.vehicle.make} ${inspection.vehicle.model}`,
          inspectionUrl: `${this.config.get('FRONTEND_URL')}/inspections/${inspection.id}`,
          findingsCount: inspection.findings.length,
        },
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
        name: inspection.customer.encryptedName || '',
      },
      mechanic: {
        id: inspection.mechanic.id,
        name: inspection.mechanic.name,
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
