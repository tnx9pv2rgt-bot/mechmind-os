import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import { S3Service } from '@common/services/s3.service';
import * as crypto from 'crypto';
import * as path from 'path';

export type VehicleDocType = 'LIBRETTO' | 'ASSICURAZIONE' | 'REVISIONE' | 'BOLLO' | 'ALTRO';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

@Injectable()
export class VehicleDocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async upload(
    tenantId: string,
    vehicleId: string,
    userId: string,
    file: Express.Multer.File,
    docType: VehicleDocType,
    name: string,
    expiryDate?: string,
  ) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Tipo file non consentito. Usa PDF, JPEG, PNG o WebP.');
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('File troppo grande. Massimo 10MB.');
    }

    await this.ensureVehicleExists(tenantId, vehicleId);

    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const safeKey = `vehicles/${vehicleId}/documents/${crypto.randomBytes(16).toString('hex')}${ext}`;
    const result = await this.s3.uploadBuffer(file.buffer, safeKey, file.mimetype, tenantId);

    return this.prisma.vehicleDocument.create({
      data: {
        tenantId,
        vehicleId,
        name: name.trim(),
        docType,
        s3Key: result.Key,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedBy: userId,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });
  }

  async list(tenantId: string, vehicleId: string) {
    await this.ensureVehicleExists(tenantId, vehicleId);
    return this.prisma.vehicleDocument.findMany({
      where: { tenantId, vehicleId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDownloadUrl(
    tenantId: string,
    vehicleId: string,
    documentId: string,
  ): Promise<{ url: string }> {
    const doc = await this.prisma.vehicleDocument.findFirst({
      where: { id: documentId, tenantId, vehicleId },
    });
    if (!doc) throw new NotFoundException('Documento non trovato');

    const url = await this.s3.getSignedUrlForKey(doc.s3Key, 3600);
    return { url };
  }

  async remove(tenantId: string, vehicleId: string, documentId: string): Promise<void> {
    const doc = await this.prisma.vehicleDocument.findFirst({
      where: { id: documentId, tenantId, vehicleId },
    });
    if (!doc) throw new NotFoundException('Documento non trovato');

    await this.s3.delete('mechmind-uploads', doc.s3Key);
    await this.prisma.vehicleDocument.delete({ where: { id: documentId } });
  }

  private async ensureVehicleExists(tenantId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId },
    });
    if (!vehicle) throw new NotFoundException(`Veicolo ${vehicleId} non trovato`);
  }
}
