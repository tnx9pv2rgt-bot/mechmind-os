import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VehicleDocumentController } from './vehicle-document.controller';
import { VehicleDocumentService } from '../services/vehicle-document.service';

// Re-export for synchronous validation tests
export { BadRequestException };

describe('VehicleDocumentController', () => {
  let controller: VehicleDocumentController;
  let service: jest.Mocked<VehicleDocumentService>;

  const TENANT_ID = 'tenant-001';
  const VEHICLE_ID = 'veh-001';
  const USER_ID = 'user-001';
  const DOCUMENT_ID = 'doc-001';

  const mockDocument = {
    id: DOCUMENT_ID,
    tenantId: TENANT_ID,
    vehicleId: VEHICLE_ID,
    name: 'Libretto Circolazione',
    docType: 'LIBRETTO' as const,
    s3Key: 'vehicles/veh-001/documents/abc123.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 102400,
    uploadedBy: USER_ID,
    expiryDate: new Date('2026-12-31'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFile = {
    originalname: 'libretto.pdf',
    buffer: Buffer.from('PDF content'),
    mimetype: 'application/pdf',
    size: 102400,
  } as Express.Multer.File;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehicleDocumentController],
      providers: [
        {
          provide: VehicleDocumentService,
          useValue: {
            list: jest.fn(),
            upload: jest.fn(),
            getDownloadUrl: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<VehicleDocumentController>(VehicleDocumentController);
    service = module.get(VehicleDocumentService) as jest.Mocked<VehicleDocumentService>;
  });

  describe('list', () => {
    it('should list documents for a vehicle', async () => {
      service.list.mockResolvedValueOnce([mockDocument]);

      const result = await controller.list(TENANT_ID, VEHICLE_ID);

      expect(service.list).toHaveBeenCalledWith(TENANT_ID, VEHICLE_ID);
      expect(result).toEqual({ success: true, data: [mockDocument] });
    });

    it('should return empty array when no documents found', async () => {
      service.list.mockResolvedValueOnce([]);

      const result = await controller.list(TENANT_ID, VEHICLE_ID);

      expect(service.list).toHaveBeenCalledWith(TENANT_ID, VEHICLE_ID);
      expect(result.data).toEqual([]);
      expect(result.success).toBe(true);
    });

    it('should propagate service errors', async () => {
      const error = new NotFoundException('Vehicle not found');
      service.list.mockRejectedValueOnce(error);

      await expect(controller.list(TENANT_ID, VEHICLE_ID)).rejects.toThrow(error);
      expect(service.list).toHaveBeenCalledWith(TENANT_ID, VEHICLE_ID);
    });
  });

  describe('upload', () => {
    it('should upload a document successfully', async () => {
      service.upload.mockResolvedValueOnce(mockDocument);

      const result = await controller.upload(
        TENANT_ID,
        USER_ID,
        VEHICLE_ID,
        mockFile,
        'LIBRETTO',
        'Libretto Circolazione',
        '2026-12-31',
      );

      expect(service.upload).toHaveBeenCalledWith(
        TENANT_ID,
        VEHICLE_ID,
        USER_ID,
        mockFile,
        'LIBRETTO',
        'Libretto Circolazione',
        '2026-12-31',
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDocument);
    });

    it('should upload document without expiry date', async () => {
      service.upload.mockResolvedValueOnce(mockDocument);

      const result = await controller.upload(
        TENANT_ID,
        USER_ID,
        VEHICLE_ID,
        mockFile,
        'LIBRETTO',
        'Libretto Circolazione',
      );

      expect(service.upload).toHaveBeenCalledWith(
        TENANT_ID,
        VEHICLE_ID,
        USER_ID,
        mockFile,
        'LIBRETTO',
        'Libretto Circolazione',
        undefined,
      );
      expect(result.success).toBe(true);
    });

    it('should validate all allowed document types', async () => {
      const allowedTypes: Array<'LIBRETTO' | 'ASSICURAZIONE' | 'REVISIONE' | 'BOLLO' | 'ALTRO'> = [
        'LIBRETTO',
        'ASSICURAZIONE',
        'REVISIONE',
        'BOLLO',
        'ALTRO',
      ];

      for (const docType of allowedTypes) {
        service.upload.mockResolvedValueOnce(mockDocument);

        const result = await controller.upload(
          TENANT_ID,
          USER_ID,
          VEHICLE_ID,
          mockFile,
          docType,
          'Test Document',
        );

        expect(result.success).toBe(true);
        expect(service.upload).toHaveBeenCalledWith(
          TENANT_ID,
          VEHICLE_ID,
          USER_ID,
          mockFile,
          docType,
          'Test Document',
          undefined,
        );
      }
    });

    it('should reject upload with invalid docType', async () => {
      await expect(
        controller.upload(
          TENANT_ID,
          USER_ID,
          VEHICLE_ID,
          mockFile,
          'INVALID_TYPE',
          'Test Document',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(service.upload).not.toHaveBeenCalled();
    });

    it('should reject upload when file is missing', async () => {
      await expect(
        controller.upload(
          TENANT_ID,
          USER_ID,
          VEHICLE_ID,
          undefined as never,
          'LIBRETTO',
          'Test Document',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(service.upload).not.toHaveBeenCalled();
    });

    it('should reject upload when document name is empty string', async () => {
      await expect(
        controller.upload(TENANT_ID, USER_ID, VEHICLE_ID, mockFile, 'LIBRETTO', '   '),
      ).rejects.toThrow(BadRequestException);

      expect(service.upload).not.toHaveBeenCalled();
    });

    it('should reject upload when document name is undefined', async () => {
      await expect(
        controller.upload(TENANT_ID, USER_ID, VEHICLE_ID, mockFile, 'LIBRETTO', undefined as never),
      ).rejects.toThrow(BadRequestException);

      expect(service.upload).not.toHaveBeenCalled();
    });
  });

  describe('download', () => {
    it('should get signed download URL for a document', async () => {
      const mockUrl = { url: 'https://s3.amazonaws.com/signed-url' };
      service.getDownloadUrl.mockResolvedValueOnce(mockUrl);

      const result = await controller.download(TENANT_ID, VEHICLE_ID, DOCUMENT_ID);

      expect(service.getDownloadUrl).toHaveBeenCalledWith(TENANT_ID, VEHICLE_ID, DOCUMENT_ID);
      expect(result).toEqual({ success: true, data: mockUrl });
    });

    it('should propagate service error when document not found', async () => {
      const error = new NotFoundException('Document not found');
      service.getDownloadUrl.mockRejectedValueOnce(error);

      await expect(controller.download(TENANT_ID, VEHICLE_ID, DOCUMENT_ID)).rejects.toThrow(error);
      expect(service.getDownloadUrl).toHaveBeenCalledWith(TENANT_ID, VEHICLE_ID, DOCUMENT_ID);
    });

    it('should handle missing document gracefully', async () => {
      const error = new NotFoundException('Documento non trovato');
      service.getDownloadUrl.mockRejectedValueOnce(error);

      await expect(controller.download(TENANT_ID, VEHICLE_ID, 'nonexistent')).rejects.toThrow(
        'Documento non trovato',
      );
    });
  });

  describe('remove', () => {
    it('should delete a document', async () => {
      service.remove.mockResolvedValueOnce(undefined);

      const result = await controller.remove(TENANT_ID, VEHICLE_ID, DOCUMENT_ID);

      expect(service.remove).toHaveBeenCalledWith(TENANT_ID, VEHICLE_ID, DOCUMENT_ID);
      expect(result).toEqual({ success: true, message: 'Documento eliminato' });
    });

    it('should return success message after deletion', async () => {
      service.remove.mockResolvedValueOnce(undefined);

      const result = await controller.remove(TENANT_ID, VEHICLE_ID, DOCUMENT_ID);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Documento eliminato');
    });

    it('should propagate service error when document not found', async () => {
      const error = new NotFoundException('Documento non trovato');
      service.remove.mockRejectedValueOnce(error);

      await expect(controller.remove(TENANT_ID, VEHICLE_ID, DOCUMENT_ID)).rejects.toThrow(error);
      expect(service.remove).toHaveBeenCalledWith(TENANT_ID, VEHICLE_ID, DOCUMENT_ID);
    });
  });

  describe('tenantId isolation', () => {
    it('should pass correct tenantId in list operation', async () => {
      service.list.mockResolvedValueOnce([]);

      await controller.list('tenant-xyz', VEHICLE_ID);

      expect(service.list).toHaveBeenCalledWith('tenant-xyz', VEHICLE_ID);
    });

    it('should pass correct tenantId in upload operation', async () => {
      service.upload.mockResolvedValueOnce(mockDocument);

      await controller.upload('tenant-xyz', USER_ID, VEHICLE_ID, mockFile, 'LIBRETTO', 'Document');

      expect(service.upload).toHaveBeenCalledWith(
        'tenant-xyz',
        VEHICLE_ID,
        USER_ID,
        mockFile,
        'LIBRETTO',
        'Document',
        undefined,
      );
    });

    it('should pass correct tenantId in download operation', async () => {
      service.getDownloadUrl.mockResolvedValueOnce({ url: 'https://...' });

      await controller.download('tenant-xyz', VEHICLE_ID, DOCUMENT_ID);

      expect(service.getDownloadUrl).toHaveBeenCalledWith('tenant-xyz', VEHICLE_ID, DOCUMENT_ID);
    });

    it('should pass correct tenantId in remove operation', async () => {
      service.remove.mockResolvedValueOnce(undefined);

      await controller.remove('tenant-xyz', VEHICLE_ID, DOCUMENT_ID);

      expect(service.remove).toHaveBeenCalledWith('tenant-xyz', VEHICLE_ID, DOCUMENT_ID);
    });
  });

  describe('response consistency', () => {
    it('should always return success: true for successful operations', async () => {
      service.list.mockResolvedValueOnce([mockDocument]);

      const result = await controller.list(TENANT_ID, VEHICLE_ID);

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('data');
    });

    it('should return consistent response format', async () => {
      service.upload.mockResolvedValueOnce(mockDocument);

      const result = await controller.upload(
        TENANT_ID,
        USER_ID,
        VEHICLE_ID,
        mockFile,
        'LIBRETTO',
        'Document',
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(typeof result.success).toBe('boolean');
    });

    it('should return data property in list response', async () => {
      service.list.mockResolvedValueOnce([mockDocument]);

      const result = await controller.list(TENANT_ID, VEHICLE_ID);

      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should return message in delete response', async () => {
      service.remove.mockResolvedValueOnce(undefined);

      const result = await controller.remove(TENANT_ID, VEHICLE_ID, DOCUMENT_ID);

      expect(result.message).toBeDefined();
      expect(typeof result.message).toBe('string');
    });
  });

  describe('upload validation edge cases (branch coverage)', () => {
    it('should handle name with only whitespace (trim check)', async () => {
      const whitespaceName = '   \t\n   ';
      await expect(
        controller.upload(TENANT_ID, USER_ID, VEHICLE_ID, mockFile, 'LIBRETTO', whitespaceName),
      ).rejects.toThrow(BadRequestException);

      expect(service.upload).not.toHaveBeenCalled();
    });

    it('should accept name with surrounding whitespace but content', async () => {
      service.upload.mockResolvedValueOnce(mockDocument);

      const result = await controller.upload(
        TENANT_ID,
        USER_ID,
        VEHICLE_ID,
        mockFile,
        'ASSICURAZIONE',
        '  Valid Document Name  ',
      );

      expect(service.upload).toHaveBeenCalledWith(
        TENANT_ID,
        VEHICLE_ID,
        USER_ID,
        mockFile,
        'ASSICURAZIONE',
        '  Valid Document Name  ',
        undefined,
      );
      expect(result.success).toBe(true);
    });

    it('should validate docType at boundary with first allowed type', async () => {
      service.upload.mockResolvedValueOnce(mockDocument);

      const result = await controller.upload(
        TENANT_ID,
        USER_ID,
        VEHICLE_ID,
        mockFile,
        'LIBRETTO',
        'Test',
      );

      expect(service.upload).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should validate docType at boundary with last allowed type', async () => {
      service.upload.mockResolvedValueOnce(mockDocument);

      const result = await controller.upload(
        TENANT_ID,
        USER_ID,
        VEHICLE_ID,
        mockFile,
        'ALTRO',
        'Test',
      );

      expect(service.upload).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should reject null docType as invalid', async () => {
      await expect(
        controller.upload(TENANT_ID, USER_ID, VEHICLE_ID, mockFile, null as never, 'Test Document'),
      ).rejects.toThrow(BadRequestException);

      expect(service.upload).not.toHaveBeenCalled();
    });

    it('should handle all validation checks in order (file first)', async () => {
      // File missing should fail before checking name or docType
      await expect(
        controller.upload(TENANT_ID, USER_ID, VEHICLE_ID, undefined as never, 'INVALID_TYPE', ''),
      ).rejects.toThrow('File obbligatorio');

      expect(service.upload).not.toHaveBeenCalled();
    });

    it('should handle all validation checks in order (name second)', async () => {
      // Name missing should fail before checking docType
      await expect(
        controller.upload(TENANT_ID, USER_ID, VEHICLE_ID, mockFile, 'INVALID_TYPE', ''),
      ).rejects.toThrow('Nome documento obbligatorio');

      expect(service.upload).not.toHaveBeenCalled();
    });

    it('should handle all validation checks in order (docType last)', async () => {
      // Only docType should fail when others are valid
      await expect(
        controller.upload(TENANT_ID, USER_ID, VEHICLE_ID, mockFile, 'INVALID_TYPE', 'Valid Name'),
      ).rejects.toThrow(BadRequestException);

      expect(service.upload).not.toHaveBeenCalled();
    });
  });
});
