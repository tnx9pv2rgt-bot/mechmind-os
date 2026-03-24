import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EstimateService } from './estimate.service';
import { PrismaService } from '../../common/services/prisma.service';
import { LoggerService } from '../../common/services/logger.service';

describe('EstimateService — convertToWorkOrder', () => {
  let service: EstimateService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  const TENANT_ID = 'tenant-001';

  const mockEstimate = {
    id: 'est-001',
    tenantId: TENANT_ID,
    estimateNumber: 'EST-2026-0001',
    customerId: 'cust-001',
    vehicleId: 'veh-001',
    status: 'ACCEPTED',
    bookingId: null,
    lines: [
      {
        id: 'line-1',
        description: 'Oil change',
        type: 'LABOR',
        quantity: 1,
        unitPriceCents: 5000,
        totalCents: 5000,
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      estimate: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      estimateLine: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      workOrder: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstimateService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: LoggerService, useValue: { log: jest.fn(), error: jest.fn() } },
      ],
    }).compile();

    service = module.get<EstimateService>(EstimateService);
  });

  it('should convert an accepted estimate to a work order', async () => {
    prisma.estimate.findFirst.mockResolvedValue(mockEstimate);
    prisma.workOrder.findFirst.mockResolvedValue(null); // no existing WO
    prisma.workOrder.create.mockResolvedValue({
      id: 'wo-001',
      woNumber: 'WO-2026-0001',
      tenantId: TENANT_ID,
      status: 'OPEN',
    });
    prisma.estimate.update.mockResolvedValue({ ...mockEstimate, status: 'CONVERTED' });

    const result = await service.convertToWorkOrder('est-001', TENANT_ID);

    expect(result).toEqual(expect.objectContaining({ woNumber: 'WO-2026-0001', status: 'OPEN' }));
    expect(prisma.workOrder.create).toHaveBeenCalled();
    expect(prisma.estimate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'CONVERTED' },
      }),
    );
  });

  it('should throw NotFoundException for missing estimate', async () => {
    prisma.estimate.findFirst.mockResolvedValue(null);

    await expect(service.convertToWorkOrder('missing', TENANT_ID)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw BadRequestException for non-ACCEPTED estimate', async () => {
    prisma.estimate.findFirst.mockResolvedValue({
      ...mockEstimate,
      status: 'DRAFT',
    });

    await expect(service.convertToWorkOrder('est-001', TENANT_ID)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw ConflictException for already-converted estimate', async () => {
    prisma.estimate.findFirst.mockResolvedValue({
      ...mockEstimate,
      status: 'ACCEPTED',
      bookingId: 'booking-001', // already converted
    });

    await expect(service.convertToWorkOrder('est-001', TENANT_ID)).rejects.toThrow(
      ConflictException,
    );
  });
});
