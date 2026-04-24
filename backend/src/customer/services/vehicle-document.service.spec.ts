import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VehicleDocumentService, VehicleDocType } from './vehicle-document.service';
import { PrismaService } from '@common/services/prisma.service';
import { S3Service } from '@common/services/s3.service';

describe('VehicleDocumentService', () => {
  let service: VehicleDocumentService;
  let prisma: Record<string, jest.Mock | Record<string, jest.Mock>>;
  let s3: {
    uploadBuffer: jest.Mock;
    getSignedUrlForKey: jest.Mock;
    delete: jest.Mock;
  };

  const TENANT_ID = 'tenant-001';
  const VEHICLE_ID = 'vehicle-001';
  const DOCUMENT_ID = 'doc-001';
  const USER_ID = 'user-001';
  const NOW = new Date('2024-06-15T10:00:00Z');

  const mockVehicle = {
    id: VEHICLE_ID,
    tenantId: TENANT_ID,
    createdAt: NOW,
    updatedAt: NOW,
  };

  const mockDocument = {
    id: DOCUMENT_ID,
    tenantId: TENANT_ID,
    vehicleId: VEHICLE_ID,
    name: 'Libretto circolazione',
    docType: 'LIBRETTO' as VehicleDocType,
    s3Key: 'vehicles/vehicle-001/documents/abc123.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024000,
    uploadedBy: USER_ID,
    expiryDate: new Date('2025-12-31'),
    createdAt: NOW,
    updatedAt: NOW,
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'libretto.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024000,
    destination: '/tmp',
    filename: 'libretto.pdf',
    path: '/tmp/libretto.pdf',
    buffer: Buffer.from('test pdf content'),
  };

  beforeEach(async () => {
    s3 = {
      uploadBuffer: jest.fn().mockResolvedValue({ Key: 'vehicles/vehicle-001/documents/abc123.pdf' }),
      getSignedUrlForKey: jest.fn().mockResolvedValue('https://s3.example.com/signed-url'),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    prisma = {
      vehicle: {
        findFirst: jest.fn().mockResolvedValue(mockVehicle),
      },
      vehicleDocument: {
        create: jest.fn().mockResolvedValue(mockDocument),
        findMany: jest.fn().mockResolvedValue([mockDocument]),
        findFirst: jest.fn().mockResolvedValue(mockDocument),
        delete: jest.fn().mockResolvedValue(mockDocument),
      },
    } as unknown as Record<string, jest.Mock | Record<string, jest.Mock>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleDocumentService,
        { provide: PrismaService, useValue: prisma },
        { provide: S3Service, useValue: s3 },
      ],
    }).compile();

    service = module.get<VehicleDocumentService>(VehicleDocumentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // UPLOAD
  // ─────────────────────────────────────────────────────────────────────────────
  describe('upload', () => {
    it('should upload a document with valid PDF file', async () => {
      // Arrange
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);

      // Act
      const result = await service.upload(
        TENANT_ID,
        VEHICLE_ID,
        USER_ID,
        mockFile,
        'LIBRETTO',
        'Libretto circolazione',
        '2025-12-31',
      );

      // Assert
      expect((prisma.vehicle as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { id: VEHICLE_ID, tenantId: TENANT_ID },
      });

      expect(s3.uploadBuffer).toHaveBeenCalledWith(
        mockFile.buffer,
        expect.stringContaining('vehicles/vehicle-001/documents/'),
        'application/pdf',
        TENANT_ID,
      );

      expect((prisma.vehicleDocument as Record<string, jest.Mock>).create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          vehicleId: VEHICLE_ID,
          name: 'Libretto circolazione',
          docType: 'LIBRETTO',
          mimeType: 'application/pdf',
          sizeBytes: 1024000,
          uploadedBy: USER_ID,
          expiryDate: expect.any(Date),
        }),
      });

      expect(result.id).toBe(DOCUMENT_ID);
      expect(result.docType).toBe('LIBRETTO');
    });

    it('should upload a document with JPEG image', async () => {
      // Arrange
      const jpegFile = { ...mockFile, mimetype: 'image/jpeg', originalname: 'assicurazione.jpg' };
      const assicDoc = { ...mockDocument, docType: 'ASSICURAZIONE' as VehicleDocType };
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);
      (prisma.vehicleDocument as Record<string, jest.Mock>).create.mockResolvedValueOnce(assicDoc);

      // Act
      const result = await service.upload(
        TENANT_ID,
        VEHICLE_ID,
        USER_ID,
        jpegFile,
        'ASSICURAZIONE',
        'Polizza assicurazione',
      );

      // Assert
      expect(s3.uploadBuffer).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('.jpg'),
        'image/jpeg',
        TENANT_ID,
      );
      expect(result.docType).toBe('ASSICURAZIONE');
    });

    it('should upload a document with PNG image', async () => {
      // Arrange
      const pngFile = { ...mockFile, mimetype: 'image/png', originalname: 'bollo.png' };
      const bolloDoc = { ...mockDocument, docType: 'BOLLO' as VehicleDocType };
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);
      (prisma.vehicleDocument as Record<string, jest.Mock>).create.mockResolvedValueOnce(bolloDoc);

      // Act
      const result = await service.upload(TENANT_ID, VEHICLE_ID, USER_ID, pngFile, 'BOLLO', 'Bollo auto');

      // Assert
      expect(s3.uploadBuffer).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('.png'),
        'image/png',
        TENANT_ID,
      );
      expect(result.docType).toBe('BOLLO');
    });

    it('should upload a document with WebP image', async () => {
      // Arrange
      const webpFile = { ...mockFile, mimetype: 'image/webp', originalname: 'revisione.webp' };
      const revisioneDoc = { ...mockDocument, docType: 'REVISIONE' as VehicleDocType };
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);
      (prisma.vehicleDocument as Record<string, jest.Mock>).create.mockResolvedValueOnce(revisioneDoc);

      // Act
      const result = await service.upload(TENANT_ID, VEHICLE_ID, USER_ID, webpFile, 'REVISIONE', 'Certificato revisione');

      // Assert
      expect(s3.uploadBuffer).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('.webp'),
        'image/webp',
        TENANT_ID,
      );
      expect(result.docType).toBe('REVISIONE');
    });

    it('should handle file with no extension by appending .bin', async () => {
      // Arrange
      const noExtFile = { ...mockFile, originalname: 'documento' };
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);

      // Act
      await service.upload(TENANT_ID, VEHICLE_ID, USER_ID, noExtFile, 'ALTRO', 'Documento vario');

      // Assert
      expect(s3.uploadBuffer).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('.bin'),
        'application/pdf',
        TENANT_ID,
      );
    });

    it('should throw BadRequestException for unsupported MIME type', async () => {
      // Arrange
      const invalidFile = { ...mockFile, mimetype: 'application/octet-stream' };

      // Act & Assert
      await expect(
        service.upload(TENANT_ID, VEHICLE_ID, USER_ID, invalidFile, 'LIBRETTO', 'Documento'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for Word document', async () => {
      // Arrange
      const docFile = { ...mockFile, mimetype: 'application/msword' };

      // Act & Assert
      await expect(service.upload(TENANT_ID, VEHICLE_ID, USER_ID, docFile, 'LIBRETTO', 'Documento')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for Excel file', async () => {
      // Arrange
      const xlsFile = {
        ...mockFile,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };

      // Act & Assert
      await expect(service.upload(TENANT_ID, VEHICLE_ID, USER_ID, xlsFile, 'LIBRETTO', 'Documento')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when file exceeds 10MB', async () => {
      // Arrange
      const largeFile = { ...mockFile, size: 11 * 1024 * 1024 }; // 11MB

      // Act & Assert
      await expect(
        service.upload(TENANT_ID, VEHICLE_ID, USER_ID, largeFile, 'LIBRETTO', 'Documento grande'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for file at exactly 10MB + 1 byte', async () => {
      // Arrange
      const tooLargeFile = { ...mockFile, size: 10 * 1024 * 1024 + 1 };

      // Act & Assert
      await expect(
        service.upload(TENANT_ID, VEHICLE_ID, USER_ID, tooLargeFile, 'LIBRETTO', 'Documento'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow file at exactly 10MB', async () => {
      // Arrange
      const maxFile = { ...mockFile, size: 10 * 1024 * 1024 };
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);

      // Act & Assert
      const result = await service.upload(TENANT_ID, VEHICLE_ID, USER_ID, maxFile, 'LIBRETTO', 'Documento massimo');

      // Assert
      expect(result).toBeDefined();
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when vehicle does not exist', async () => {
      // Arrange
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        service.upload(TENANT_ID, 'non-existent-vehicle', USER_ID, mockFile, 'LIBRETTO', 'Documento'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should verify vehicle belongs to tenant before upload', async () => {
      // Arrange
      const wrongTenantVehicle = { ...mockVehicle, tenantId: 'tenant-999' };
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        service.upload(TENANT_ID, VEHICLE_ID, USER_ID, mockFile, 'LIBRETTO', 'Documento'),
      ).rejects.toThrow(NotFoundException);

      // Assert: query includes tenantId filter
      expect((prisma.vehicle as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { id: VEHICLE_ID, tenantId: TENANT_ID },
      });
    });

    it('should trim document name', async () => {
      // Arrange
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);

      // Act
      await service.upload(TENANT_ID, VEHICLE_ID, USER_ID, mockFile, 'LIBRETTO', '  Nome con spazi  ');

      // Assert
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Nome con spazi',
        }),
      });
    });

    it('should set expiryDate to null when not provided', async () => {
      // Arrange
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);

      // Act
      await service.upload(TENANT_ID, VEHICLE_ID, USER_ID, mockFile, 'LIBRETTO', 'Documento', undefined);

      // Assert
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiryDate: null,
        }),
      });
    });

    it('should parse expiryDate as Date object when provided', async () => {
      // Arrange
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);
      const expiryStr = '2025-12-31';

      // Act
      await service.upload(TENANT_ID, VEHICLE_ID, USER_ID, mockFile, 'LIBRETTO', 'Documento', expiryStr);

      // Assert
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiryDate: expect.any(Date),
        }),
      });

      const call = (prisma.vehicleDocument as Record<string, jest.Mock>).create.mock.calls[0][0];
      expect(call.data.expiryDate.toISOString()).toContain('2025-12-31');
    });

    it('should store uploadedBy user ID', async () => {
      // Arrange
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);
      const anotherUserId = 'user-999';

      // Act
      await service.upload(TENANT_ID, VEHICLE_ID, anotherUserId, mockFile, 'LIBRETTO', 'Documento');

      // Assert
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uploadedBy: anotherUserId,
        }),
      });
    });

    it('should generate unique S3 key for each upload', async () => {
      // Arrange
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);

      // Act
      await service.upload(TENANT_ID, VEHICLE_ID, USER_ID, mockFile, 'LIBRETTO', 'Doc 1');
      await service.upload(TENANT_ID, VEHICLE_ID, USER_ID, mockFile, 'ASSICURAZIONE', 'Doc 2');

      // Assert
      expect(s3.uploadBuffer).toHaveBeenCalledTimes(2);
      const call1 = (s3.uploadBuffer as jest.Mock).mock.calls[0][1];
      const call2 = (s3.uploadBuffer as jest.Mock).mock.calls[1][1];
      expect(call1).not.toBe(call2);
    });

    it('should store MIME type from file', async () => {
      // Arrange
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);

      // Act
      await service.upload(TENANT_ID, VEHICLE_ID, USER_ID, mockFile, 'LIBRETTO', 'Documento');

      // Assert
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          mimeType: 'application/pdf',
        }),
      });
    });

    it('should store file size in bytes', async () => {
      // Arrange
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);

      // Act
      await service.upload(TENANT_ID, VEHICLE_ID, USER_ID, mockFile, 'LIBRETTO', 'Documento');

      // Assert
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sizeBytes: 1024000,
        }),
      });
    });

    it('should include S3 key returned from uploadBuffer', async () => {
      // Arrange
      const s3Key = 'vehicles/vehicle-001/documents/xyz789.pdf';
      (s3.uploadBuffer as jest.Mock).mockResolvedValueOnce({ Key: s3Key });
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);

      // Act
      await service.upload(TENANT_ID, VEHICLE_ID, USER_ID, mockFile, 'LIBRETTO', 'Documento');

      // Assert
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          s3Key,
        }),
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST
  // ─────────────────────────────────────────────────────────────────────────────
  describe('list', () => {
    it('should list all documents for a vehicle ordered by createdAt descending', async () => {
      // Arrange
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);
      const oldDoc = { ...mockDocument, id: 'doc-old', createdAt: new Date('2024-01-01') };
      const newDoc = { ...mockDocument, id: 'doc-new', createdAt: new Date('2024-06-15') };
      (prisma.vehicleDocument as Record<string, jest.Mock>).findMany.mockResolvedValueOnce([newDoc, oldDoc]);

      // Act
      const result = await service.list(TENANT_ID, VEHICLE_ID);

      // Assert
      expect((prisma.vehicle as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { id: VEHICLE_ID, tenantId: TENANT_ID },
      });

      expect((prisma.vehicleDocument as Record<string, jest.Mock>).findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, vehicleId: VEHICLE_ID },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('doc-new');
      expect(result[1].id).toBe('doc-old');
    });

    it('should return empty array when no documents exist', async () => {
      // Arrange
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);
      (prisma.vehicleDocument as Record<string, jest.Mock>).findMany.mockResolvedValueOnce([]);

      // Act
      const result = await service.list(TENANT_ID, VEHICLE_ID);

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when vehicle does not exist', async () => {
      // Arrange
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.list(TENANT_ID, 'non-existent-vehicle')).rejects.toThrow(NotFoundException);
    });

    it('should filter by tenantId to prevent cross-tenant data access', async () => {
      // Arrange
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);

      // Act
      await service.list(TENANT_ID, VEHICLE_ID);

      // Assert
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, vehicleId: VEHICLE_ID },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should verify vehicle ownership before listing', async () => {
      // Arrange
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.list(TENANT_ID, VEHICLE_ID)).rejects.toThrow();

      // Assert: query includes tenantId filter
      expect((prisma.vehicle as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { id: VEHICLE_ID, tenantId: TENANT_ID },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GET DOWNLOAD URL
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getDownloadUrl', () => {
    it('should return signed download URL for document', async () => {
      // Arrange
      const signedUrl = 'https://s3.amazonaws.com/bucket/key?signed=true&expires=3600';
      (prisma.vehicleDocument as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockDocument);
      (s3.getSignedUrlForKey as jest.Mock).mockResolvedValueOnce(signedUrl);

      // Act
      const result = await service.getDownloadUrl(TENANT_ID, VEHICLE_ID, DOCUMENT_ID);

      // Assert
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { id: DOCUMENT_ID, tenantId: TENANT_ID, vehicleId: VEHICLE_ID },
      });

      expect(s3.getSignedUrlForKey).toHaveBeenCalledWith(mockDocument.s3Key, 3600);
      expect(result.url).toBe(signedUrl);
    });

    it('should throw NotFoundException when document does not exist', async () => {
      // Arrange
      (prisma.vehicleDocument as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.getDownloadUrl(TENANT_ID, VEHICLE_ID, 'non-existent-doc')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should verify document belongs to vehicle and tenant', async () => {
      // Arrange
      (prisma.vehicleDocument as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.getDownloadUrl(TENANT_ID, VEHICLE_ID, DOCUMENT_ID)).rejects.toThrow(NotFoundException);

      // Assert: query includes all three filters
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { id: DOCUMENT_ID, tenantId: TENANT_ID, vehicleId: VEHICLE_ID },
      });
    });

    it('should request signed URL with 1-hour expiry', async () => {
      // Arrange
      (prisma.vehicleDocument as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockDocument);

      // Act
      await service.getDownloadUrl(TENANT_ID, VEHICLE_ID, DOCUMENT_ID);

      // Assert
      expect(s3.getSignedUrlForKey).toHaveBeenCalledWith(mockDocument.s3Key, 3600);
    });

    it('should prevent cross-tenant document access', async () => {
      // Arrange
      const wrongTenantDoc = { ...mockDocument, tenantId: 'tenant-999' };
      (prisma.vehicleDocument as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.getDownloadUrl(TENANT_ID, VEHICLE_ID, DOCUMENT_ID)).rejects.toThrow();

      // Assert: tenantId filter is included
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { id: DOCUMENT_ID, tenantId: TENANT_ID, vehicleId: VEHICLE_ID },
      });
    });

    it('should use document S3 key for signed URL', async () => {
      // Arrange
      const customS3Key = 'vehicles/vehicle-999/documents/custom-key.pdf';
      const docWithCustomKey = { ...mockDocument, s3Key: customS3Key };
      (prisma.vehicleDocument as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(docWithCustomKey);

      // Act
      await service.getDownloadUrl(TENANT_ID, VEHICLE_ID, DOCUMENT_ID);

      // Assert
      expect(s3.getSignedUrlForKey).toHaveBeenCalledWith(customS3Key, 3600);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // REMOVE
  // ─────────────────────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('should delete document and remove from S3', async () => {
      // Arrange
      (prisma.vehicleDocument as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockDocument);

      // Act
      await service.remove(TENANT_ID, VEHICLE_ID, DOCUMENT_ID);

      // Assert
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { id: DOCUMENT_ID, tenantId: TENANT_ID, vehicleId: VEHICLE_ID },
      });

      expect(s3.delete).toHaveBeenCalledWith('mechmind-uploads', mockDocument.s3Key);

      expect((prisma.vehicleDocument as Record<string, jest.Mock>).delete).toHaveBeenCalledWith({
        where: { id: DOCUMENT_ID },
      });
    });

    it('should throw NotFoundException when document does not exist', async () => {
      // Arrange
      (prisma.vehicleDocument as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.remove(TENANT_ID, VEHICLE_ID, 'non-existent-doc')).rejects.toThrow(NotFoundException);
    });

    it('should verify document belongs to vehicle and tenant before deletion', async () => {
      // Arrange
      (prisma.vehicleDocument as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.remove(TENANT_ID, VEHICLE_ID, DOCUMENT_ID)).rejects.toThrow(NotFoundException);

      // Assert: query includes all three filters
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { id: DOCUMENT_ID, tenantId: TENANT_ID, vehicleId: VEHICLE_ID },
      });
    });

    it('should delete from S3 using correct bucket and key', async () => {
      // Arrange
      const customS3Key = 'vehicles/vehicle-001/documents/abc123xyz.pdf';
      const docWithKey = { ...mockDocument, s3Key: customS3Key };
      (prisma.vehicleDocument as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(docWithKey);

      // Act
      await service.remove(TENANT_ID, VEHICLE_ID, DOCUMENT_ID);

      // Assert
      expect(s3.delete).toHaveBeenCalledWith('mechmind-uploads', customS3Key);
    });

    it('should delete from database after S3 deletion', async () => {
      // Arrange
      (prisma.vehicleDocument as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockDocument);

      // Act
      await service.remove(TENANT_ID, VEHICLE_ID, DOCUMENT_ID);

      // Assert
      expect(s3.delete).toHaveBeenCalled();
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).delete).toHaveBeenCalled();

      // Verify order: S3 delete called before DB delete
      const s3CallOrder = (s3.delete as jest.Mock).mock.invocationCallOrder[0];
      const dbCallOrder = (prisma.vehicleDocument as Record<string, jest.Mock>).delete.mock.invocationCallOrder[0];
      expect(s3CallOrder).toBeLessThan(dbCallOrder);
    });

    it('should prevent cross-tenant document deletion', async () => {
      // Arrange
      (prisma.vehicleDocument as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.remove(TENANT_ID, VEHICLE_ID, DOCUMENT_ID)).rejects.toThrow();

      // Assert: tenantId filter is included
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).findFirst).toHaveBeenCalledWith({
        where: { id: DOCUMENT_ID, tenantId: TENANT_ID, vehicleId: VEHICLE_ID },
      });
    });

    it('should delete by document ID only from database', async () => {
      // Arrange
      (prisma.vehicleDocument as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockDocument);

      // Act
      await service.remove(TENANT_ID, VEHICLE_ID, DOCUMENT_ID);

      // Assert
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).delete).toHaveBeenCalledWith({
        where: { id: DOCUMENT_ID },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // EDGE CASES & INTEGRATION
  // ─────────────────────────────────────────────────────────────────────────────
  describe('edge cases and integration', () => {
    it('should handle multiple documents with different types', async () => {
      // Arrange
      const docs = [
        { ...mockDocument, id: 'doc-1', docType: 'LIBRETTO' as VehicleDocType },
        { ...mockDocument, id: 'doc-2', docType: 'ASSICURAZIONE' as VehicleDocType },
        { ...mockDocument, id: 'doc-3', docType: 'REVISIONE' as VehicleDocType },
        { ...mockDocument, id: 'doc-4', docType: 'BOLLO' as VehicleDocType },
        { ...mockDocument, id: 'doc-5', docType: 'ALTRO' as VehicleDocType },
      ];
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);
      (prisma.vehicleDocument as Record<string, jest.Mock>).findMany.mockResolvedValueOnce(docs);

      // Act
      const result = await service.list(TENANT_ID, VEHICLE_ID);

      // Assert
      expect(result).toHaveLength(5);
      expect(result.map((d) => d.docType)).toEqual(['LIBRETTO', 'ASSICURAZIONE', 'REVISIONE', 'BOLLO', 'ALTRO']);
    });

    it('should handle concurrent uploads to same vehicle', async () => {
      // Arrange
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValue(mockVehicle);

      // Act
      await Promise.all([
        service.upload(TENANT_ID, VEHICLE_ID, USER_ID, mockFile, 'LIBRETTO', 'Doc 1'),
        service.upload(TENANT_ID, VEHICLE_ID, USER_ID, mockFile, 'ASSICURAZIONE', 'Doc 2'),
        service.upload(TENANT_ID, VEHICLE_ID, USER_ID, mockFile, 'REVISIONE', 'Doc 3'),
      ]);

      // Assert
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).create).toHaveBeenCalledTimes(3);
      expect(s3.uploadBuffer).toHaveBeenCalledTimes(3);
    });

    it('should handle document with very long name', async () => {
      // Arrange
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);
      const longName = 'A'.repeat(255);

      // Act
      await service.upload(TENANT_ID, VEHICLE_ID, USER_ID, mockFile, 'LIBRETTO', longName);

      // Assert
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: longName,
        }),
      });
    });

    it('should handle empty name by trimming to empty string', async () => {
      // Arrange
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);

      // Act
      await service.upload(TENANT_ID, VEHICLE_ID, USER_ID, mockFile, 'LIBRETTO', '   ');

      // Assert
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: '',
        }),
      });
    });

    it('should handle ISO date string in various formats', async () => {
      // Arrange
      (prisma.vehicle as Record<string, jest.Mock>).findFirst.mockResolvedValueOnce(mockVehicle);

      // Act
      await service.upload(TENANT_ID, VEHICLE_ID, USER_ID, mockFile, 'LIBRETTO', 'Doc', '2025-12-31T23:59:59Z');

      // Assert
      expect((prisma.vehicleDocument as Record<string, jest.Mock>).create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiryDate: expect.any(Date),
        }),
      });
    });
  });
});
