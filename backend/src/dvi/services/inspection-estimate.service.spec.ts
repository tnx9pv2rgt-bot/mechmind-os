import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InspectionService } from './inspection.service';
import { PrismaService } from '../../common/services/prisma.service';
import { S3Service } from '../../common/services/s3.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { PublicTokenService } from '../../public-token/public-token.service';

describe('InspectionService — createEstimateFromFindings', () => {
  let service: InspectionService;
  let prisma: Record<string, Record<string, jest.Mock>>;

  const TENANT_ID = 'tenant-001';

  beforeEach(async () => {
    prisma = {
      inspection: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      inspectionTemplate: { findFirst: jest.fn() },
      inspectionItem: { updateMany: jest.fn() },
      inspectionFinding: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      inspectionPhoto: { create: jest.fn() },
      estimate: { findFirst: jest.fn(), create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InspectionService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-bucket') } },
        {
          provide: S3Service,
          useValue: { upload: jest.fn(), getSignedDownloadUrl: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { sendNotification: jest.fn() },
        },
        {
          provide: PublicTokenService,
          useValue: {
            generateToken: jest.fn().mockResolvedValue({ token: 'test-token' }),
            validateToken: jest.fn(),
            consumeToken: jest.fn(),
            revokeTokensForEntity: jest.fn(),
          },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<InspectionService>(InspectionService);
  });

  it('should create an estimate from approved findings', async () => {
    const inspection = {
      id: 'insp-001',
      tenantId: TENANT_ID,
      customerId: 'cust-001',
      vehicleId: 'veh-001',
      findings: [
        {
          id: 'f1',
          title: 'Brake pads worn',
          description: 'Front brake pads below minimum thickness',
          estimatedCost: 120.0,
          severity: 'HIGH',
        },
        {
          id: 'f2',
          title: 'Oil leak',
          description: 'Minor oil leak from valve cover',
          estimatedCost: 80.0,
          severity: 'MEDIUM',
        },
      ],
      vehicle: { id: 'veh-001', make: 'Toyota', model: 'Corolla' },
    };

    prisma.inspection.findFirst.mockResolvedValue(inspection);
    prisma.estimate.findFirst.mockResolvedValue(null);
    prisma.estimate.create.mockResolvedValue({
      id: 'est-001',
      estimateNumber: 'EST-2026-0001',
      status: 'DRAFT',
      lines: [
        { description: 'Brake pads worn — Front brake pads below minimum thickness' },
        { description: 'Oil leak — Minor oil leak from valve cover' },
      ],
    });

    const result = await service.createEstimateFromFindings(
      TENANT_ID,
      'insp-001',
      ['f1', 'f2'],
      'user-001',
    );

    expect(result).toEqual(
      expect.objectContaining({ status: 'DRAFT', estimateNumber: 'EST-2026-0001' }),
    );
    expect(prisma.estimate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          customerId: 'cust-001',
          vehicleId: 'veh-001',
          status: 'DRAFT',
        }),
      }),
    );
  });

  it('should throw NotFoundException for missing inspection', async () => {
    prisma.inspection.findFirst.mockResolvedValue(null);

    await expect(
      service.createEstimateFromFindings(TENANT_ID, 'missing', ['f1'], 'user-001'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when no matching findings', async () => {
    prisma.inspection.findFirst.mockResolvedValue({
      id: 'insp-001',
      tenantId: TENANT_ID,
      findings: [],
      vehicle: {},
    });

    await expect(
      service.createEstimateFromFindings(TENANT_ID, 'insp-001', ['f1'], 'user-001'),
    ).rejects.toThrow(NotFoundException);
  });
});
