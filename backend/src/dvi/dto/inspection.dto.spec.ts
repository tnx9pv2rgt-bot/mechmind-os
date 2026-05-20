/**
 * DVI DTOs Validation Tests
 */

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CreateInspectionDto,
  UpdateInspectionDto,
  UpdateInspectionItemDto,
  CreateFindingDto,
  UpdateFindingDto,
  CustomerApprovalDto,
  InspectionQueryDto,
  UploadPhotoDto,
  InspectionResponseDto,
  InspectionPhotoResponseDto,
  InspectionItemResponseDto,
  InspectionFindingResponseDto,
  InspectionSummaryDto,
} from './inspection.dto';
import {
  InspectionStatus,
  InspectionItemStatus,
  FindingSeverity,
  FindingStatus,
  FuelLevel,
} from '@prisma/client';

const TENANT_ID = 'tenant-uuid-001';

describe('DVI DTOs', () => {
  describe('CreateInspectionDto', () => {
    it('deve validare DTO valido', async () => {
      const dto = plainToInstance(CreateInspectionDto, {
        vehicleId: '550e8400-e29b-41d4-a716-446655440001',
        customerId: '550e8400-e29b-41d4-a716-446655440002',
        templateId: '550e8400-e29b-41d4-a716-446655440003',
        mechanicId: '550e8400-e29b-41d4-a716-446655440004',
        mileage: 45200,
        fuelLevel: FuelLevel.HALF,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve respingere UUID invalido in vehicleId', async () => {
      const dto = plainToInstance(CreateInspectionDto, {
        vehicleId: 'invalid-uuid',
        customerId: '550e8400-e29b-41d4-a716-446655440002',
        templateId: '550e8400-e29b-41d4-a716-446655440003',
        mechanicId: '550e8400-e29b-41d4-a716-446655440004',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('vehicleId');
    });

    it('deve consentire mileage opzionale', async () => {
      const dto = plainToInstance(CreateInspectionDto, {
        vehicleId: '550e8400-e29b-41d4-a716-446655440001',
        customerId: '550e8400-e29b-41d4-a716-446655440002',
        templateId: '550e8400-e29b-41d4-a716-446655440003',
        mechanicId: '550e8400-e29b-41d4-a716-446655440004',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve respingere mileage negativo', async () => {
      const dto = plainToInstance(CreateInspectionDto, {
        vehicleId: '550e8400-e29b-41d4-a716-446655440001',
        customerId: '550e8400-e29b-41d4-a716-446655440002',
        templateId: '550e8400-e29b-41d4-a716-446655440003',
        mechanicId: '550e8400-e29b-41d4-a716-446655440004',
        mileage: -100,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('deve validare fuelLevel enum', async () => {
      const dto = plainToInstance(CreateInspectionDto, {
        vehicleId: '550e8400-e29b-41d4-a716-446655440001',
        customerId: '550e8400-e29b-41d4-a716-446655440002',
        templateId: '550e8400-e29b-41d4-a716-446655440003',
        mechanicId: '550e8400-e29b-41d4-a716-446655440004',
        fuelLevel: FuelLevel.FULL,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('UpdateInspectionItemDto', () => {
    it('deve validare DTO valido', async () => {
      const dto = plainToInstance(UpdateInspectionItemDto, {
        templateItemId: '550e8400-e29b-41d4-a716-446655440005',
        status: InspectionItemStatus.CHECKED,
        notes: 'Test notes',
        severity: FindingSeverity.MEDIUM,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve respingere status enum invalido', async () => {
      const dto = plainToInstance(UpdateInspectionItemDto, {
        templateItemId: '550e8400-e29b-41d4-a716-446655440005',
        status: 'INVALID_STATUS' as unknown as InspectionItemStatus,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('deve consentire note opzionali', async () => {
      const dto = plainToInstance(UpdateInspectionItemDto, {
        templateItemId: '550e8400-e29b-41d4-a716-446655440005',
        status: InspectionItemStatus.PENDING,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('UpdateInspectionDto', () => {
    it('deve validare DTO valido', async () => {
      const dto = plainToInstance(UpdateInspectionDto, {
        status: InspectionStatus.PENDING_REVIEW,
        mileage: 45200,
        items: [
          {
            templateItemId: '550e8400-e29b-41d4-a716-446655440005',
            status: InspectionItemStatus.CHECKED,
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve consentire tutti i campi opzionali', async () => {
      const dto = plainToInstance(UpdateInspectionDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve validare array di item annidati', async () => {
      const dto = plainToInstance(UpdateInspectionDto, {
        items: [
          {
            templateItemId: '550e8400-e29b-41d4-a716-446655440005',
            status: InspectionItemStatus.ISSUE_FOUND,
            notes: 'Issue found',
          },
          {
            templateItemId: '550e8400-e29b-41d4-a716-446655440006',
            status: InspectionItemStatus.PENDING,
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('CreateFindingDto', () => {
    it('deve validare DTO valido', async () => {
      const dto = plainToInstance(CreateFindingDto, {
        category: 'Brakes',
        title: 'Worn brake pads',
        description: 'Front brake pads are 70% worn',
        severity: FindingSeverity.MEDIUM,
        recommendation: 'Replace within 5000 km',
        estimatedCost: 150.0,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve respingere severity enum invalido', async () => {
      const dto = plainToInstance(CreateFindingDto, {
        category: 'Brakes',
        title: 'Worn brake pads',
        description: 'Front brake pads are 70% worn',
        severity: 'INVALID' as unknown as FindingSeverity,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('deve consentire recommendation e estimatedCost opzionali', async () => {
      const dto = plainToInstance(CreateFindingDto, {
        category: 'Brakes',
        title: 'Worn brake pads',
        description: 'Front brake pads are 70% worn',
        severity: FindingSeverity.LOW,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('UpdateFindingDto', () => {
    it('deve validare DTO valido', async () => {
      const dto = plainToInstance(UpdateFindingDto, {
        status: FindingStatus.APPROVED,
        approvedByCustomer: true,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve consentire tutti i campi opzionali', async () => {
      const dto = plainToInstance(UpdateFindingDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve respingere status enum invalido', async () => {
      const dto = plainToInstance(UpdateFindingDto, {
        status: 'INVALID' as unknown as FindingStatus,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('CustomerApprovalDto', () => {
    it('deve validare DTO valido', async () => {
      const dto = plainToInstance(CustomerApprovalDto, {
        email: 'customer@example.com',
        approvedFindingIds: ['finding-1', 'finding-2'],
        declinedFindingIds: ['finding-3'],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve consentire signature opzionale', async () => {
      const dto = plainToInstance(CustomerApprovalDto, {
        email: 'customer@example.com',
        approvedFindingIds: [],
        declinedFindingIds: [],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve respingere email non stringa', async () => {
      const dto = plainToInstance(CustomerApprovalDto, {
        email: 123 as unknown as string,
        approvedFindingIds: [],
        declinedFindingIds: [],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('deve consentire array vuoti', async () => {
      const dto = plainToInstance(CustomerApprovalDto, {
        email: 'customer@example.com',
        approvedFindingIds: [],
        declinedFindingIds: [],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('InspectionQueryDto', () => {
    it('deve validare DTO valido', async () => {
      const dto = plainToInstance(InspectionQueryDto, {
        vehicleId: '550e8400-e29b-41d4-a716-446655440001',
        customerId: '550e8400-e29b-41d4-a716-446655440002',
        status: InspectionStatus.IN_PROGRESS,
        mechanicId: '550e8400-e29b-41d4-a716-446655440003',
        page: 1,
        limit: 20,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve consentire tutti i campi opzionali', async () => {
      const dto = plainToInstance(InspectionQueryDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve respingere page < 1', async () => {
      const dto = plainToInstance(InspectionQueryDto, {
        page: 0,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('deve respingere limit < 1', async () => {
      const dto = plainToInstance(InspectionQueryDto, {
        limit: 0,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UploadPhotoDto', () => {
    it('deve validare DTO valido', async () => {
      const dto = plainToInstance(UploadPhotoDto, {
        itemId: '550e8400-e29b-41d4-a716-446655440005',
        category: 'Engine',
        description: 'Engine compartment photo',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve consentire tutti i campi opzionali', async () => {
      const dto = plainToInstance(UploadPhotoDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve respingere itemId UUID invalido', async () => {
      const dto = plainToInstance(UploadPhotoDto, {
        itemId: 'not-a-uuid',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Response DTOs', () => {
    it('InspectionPhotoResponseDto deve essere istanziabile', () => {
      const photo: InspectionPhotoResponseDto = {
        id: 'photo-1',
        url: 'https://s3.example.com/photo.jpg',
        thumbnailUrl: 'https://s3.example.com/photo-thumb.jpg',
        category: 'Engine',
        description: 'Engine photo',
        takenAt: new Date(),
      };

      expect(photo.id).toBe('photo-1');
      expect(photo.url).toContain('s3.example.com');
      expect(TENANT_ID).toBe('tenant-uuid-001');
    });

    it('InspectionItemResponseDto deve essere istanziabile', () => {
      const item: InspectionItemResponseDto = {
        id: 'item-1',
        category: 'Brakes',
        name: 'Brake pads',
        status: InspectionItemStatus.CHECKED,
        notes: 'OK',
        severity: FindingSeverity.LOW,
        photos: [],
      };

      expect(item.id).toBe('item-1');
      expect(item.category).toBe('Brakes');
      expect(item.status).toBe(InspectionItemStatus.CHECKED);
    });

    it('InspectionFindingResponseDto deve essere istanziabile', () => {
      const finding: InspectionFindingResponseDto = {
        id: 'finding-1',
        category: 'Brakes',
        title: 'Worn pads',
        description: 'Brake pads are worn',
        severity: FindingSeverity.MEDIUM,
        recommendation: 'Replace soon',
        estimatedCost: 150.0,
        status: FindingStatus.REPORTED,
        approvedByCustomer: false,
      };

      expect(finding.id).toBe('finding-1');
      expect(finding.severity).toBe(FindingSeverity.MEDIUM);
    });

    it('InspectionResponseDto deve contenere tutte le proprietà necessarie', () => {
      const inspection: InspectionResponseDto = {
        id: 'insp-1',
        status: InspectionStatus.IN_PROGRESS,
        startedAt: new Date(),
        vehicle: {
          id: 'vehicle-1',
          make: 'Fiat',
          model: 'Panda',
          licensePlate: 'AB123CD',
        },
        customer: {
          id: 'customer-1',
          name: 'Mario Rossi',
        },
        mechanic: {
          id: 'mechanic-1',
          name: 'Marco Bianchi',
        },
        items: [],
        findings: [],
        photos: [],
        customerNotified: false,
        customerViewed: false,
      };

      expect(inspection.status).toBe(InspectionStatus.IN_PROGRESS);
      expect(inspection.vehicle.make).toBe('Fiat');
      expect(inspection.customer.name).toBe('Mario Rossi');
    });

    it('InspectionSummaryDto deve essere istanziabile', () => {
      const summary: InspectionSummaryDto = {
        id: 'insp-1',
        status: InspectionStatus.PENDING_REVIEW,
        startedAt: new Date(),
        vehicleInfo: 'Fiat Panda AB123CD',
        customerName: 'Mario Rossi',
        mechanicName: 'Marco Bianchi',
        issuesFound: 3,
        criticalIssues: 1,
      };

      expect(summary.id).toBe('insp-1');
      expect(summary.issuesFound).toBe(3);
      expect(summary.criticalIssues).toBe(1);
    });
  });

  describe('DTO Integration', () => {
    it('deve gestire flusso completo create -> update -> approval', async () => {
      // Create
      const createDto = plainToInstance(CreateInspectionDto, {
        vehicleId: '550e8400-e29b-41d4-a716-446655440001',
        customerId: '550e8400-e29b-41d4-a716-446655440002',
        templateId: '550e8400-e29b-41d4-a716-446655440003',
        mechanicId: '550e8400-e29b-41d4-a716-446655440004',
        mileage: 45200,
      });
      expect(await validate(createDto)).toHaveLength(0);

      // Update
      const updateDto = plainToInstance(UpdateInspectionDto, {
        status: InspectionStatus.READY_FOR_CUSTOMER,
        items: [
          {
            templateItemId: '550e8400-e29b-41d4-a716-446655440005',
            status: InspectionItemStatus.ISSUE_FOUND,
            severity: FindingSeverity.MEDIUM,
          },
        ],
      });
      expect(await validate(updateDto)).toHaveLength(0);

      // Approval
      const approvalDto = plainToInstance(CustomerApprovalDto, {
        email: 'customer@example.com',
        approvedFindingIds: ['finding-1'],
        declinedFindingIds: [],
      });
      expect(await validate(approvalDto)).toHaveLength(0);
    });
  });
});
