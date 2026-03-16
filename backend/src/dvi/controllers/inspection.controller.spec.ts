import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InspectionController } from './inspection.controller';
import { InspectionService } from '../services/inspection.service';

describe('InspectionController', () => {
  let controller: InspectionController;
  let service: jest.Mocked<InspectionService>;

  const TENANT_ID = 'tenant-001';
  const USER_ID = 'user-001';

  const mockInspection = {
    id: 'insp-001',
    tenantId: TENANT_ID,
    vehicleId: 'veh-001',
    status: 'IN_PROGRESS',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InspectionController],
      providers: [
        {
          provide: InspectionService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            addFinding: jest.fn(),
            updateFinding: jest.fn(),
            uploadPhoto: jest.fn(),
            submitCustomerApproval: jest.fn(),
            generateReport: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InspectionController>(InspectionController);
    service = module.get(InspectionService) as jest.Mocked<InspectionService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to service with tenantId and dto', async () => {
      const dto = { vehicleId: 'veh-001', mechanicId: 'mech-001' };
      service.create.mockResolvedValue(mockInspection as never);

      const result = await controller.create(TENANT_ID, dto as never);

      expect(service.create).toHaveBeenCalledWith(TENANT_ID, dto);
      expect(result).toEqual(mockInspection);
    });
  });

  describe('findAll', () => {
    it('should delegate to service with tenantId and filters', async () => {
      const query = { vehicleId: 'veh-001', status: 'IN_PROGRESS' };
      service.findAll.mockResolvedValue([mockInspection] as never);

      const result = await controller.findAll(TENANT_ID, query as never);

      expect(service.findAll).toHaveBeenCalledWith(TENANT_ID, {
        vehicleId: 'veh-001',
        customerId: undefined,
        status: 'IN_PROGRESS',
        mechanicId: undefined,
      });
      expect(result).toEqual([mockInspection]);
    });
  });

  describe('findById', () => {
    it('should delegate to service with tenantId and id', async () => {
      service.findById.mockResolvedValue(mockInspection as never);

      const result = await controller.findById(TENANT_ID, 'insp-001');

      expect(service.findById).toHaveBeenCalledWith(TENANT_ID, 'insp-001');
      expect(result).toEqual(mockInspection);
    });
  });

  describe('update', () => {
    it('should delegate to service with tenantId, id, dto, and userId', async () => {
      const dto = { status: 'COMPLETED' };
      const updated = { ...mockInspection, status: 'COMPLETED' };
      service.update.mockResolvedValue(updated as never);

      const result = await controller.update(TENANT_ID, USER_ID, 'insp-001', dto as never);

      expect(service.update).toHaveBeenCalledWith(TENANT_ID, 'insp-001', dto, USER_ID);
      expect(result).toEqual(updated);
    });
  });

  describe('addFinding', () => {
    it('should delegate to service with tenantId, inspectionId, and dto', async () => {
      const dto = { component: 'Brakes', severity: 'HIGH' };
      service.addFinding.mockResolvedValue(undefined as never);

      await controller.addFinding(TENANT_ID, 'insp-001', dto as never);

      expect(service.addFinding).toHaveBeenCalledWith(TENANT_ID, 'insp-001', dto);
    });
  });

  describe('updateFinding', () => {
    it('should delegate to service with tenantId, findingId, and dto', async () => {
      const dto = { status: 'APPROVED' };
      service.updateFinding.mockResolvedValue(undefined as never);

      await controller.updateFinding(TENANT_ID, 'finding-001', dto as never);

      expect(service.updateFinding).toHaveBeenCalledWith(TENANT_ID, 'finding-001', dto);
    });
  });

  describe('uploadPhoto', () => {
    it('should delegate to service with file buffer and metadata', async () => {
      const mockFile = {
        buffer: Buffer.from('fake-image'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;
      service.uploadPhoto.mockResolvedValue({ id: 'photo-001', url: 'https://s3/photo.jpg' });

      const result = await controller.uploadPhoto(
        TENANT_ID,
        USER_ID,
        'insp-001',
        mockFile,
        'item-001',
        'brakes',
        'Worn brake pads',
      );

      expect(service.uploadPhoto).toHaveBeenCalledWith(
        TENANT_ID,
        'insp-001',
        mockFile.buffer,
        'image/jpeg',
        USER_ID,
        'item-001',
        'brakes',
        'Worn brake pads',
      );
      expect(result).toEqual({ id: 'photo-001', url: 'https://s3/photo.jpg' });
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(
        controller.uploadPhoto(TENANT_ID, USER_ID, 'insp-001', undefined as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitApproval', () => {
    it('should delegate to service with tenantId, inspectionId, and dto', async () => {
      const dto = { approvedItems: ['item-1'], rejectedItems: ['item-2'] };
      service.submitCustomerApproval.mockResolvedValue(undefined as never);

      await controller.submitApproval(TENANT_ID, 'insp-001', dto as never);

      expect(service.submitCustomerApproval).toHaveBeenCalledWith(TENANT_ID, 'insp-001', dto);
    });
  });

  describe('generateReport', () => {
    it('should delegate to service with tenantId and id', async () => {
      const pdfBuffer = Buffer.from('pdf-content');
      service.generateReport.mockResolvedValue(pdfBuffer as never);

      const result = await controller.generateReport(TENANT_ID, 'insp-001');

      expect(service.generateReport).toHaveBeenCalledWith(TENANT_ID, 'insp-001');
      expect(result).toEqual(pdfBuffer);
    });
  });
});
