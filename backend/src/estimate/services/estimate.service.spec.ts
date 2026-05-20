import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EstimateService } from './estimate.service';
import { PrismaService } from '../../common/services/prisma.service';
import { LoggerService } from '../../common/services/logger.service';
import { PublicTokenService } from '../../public-token/public-token.service';

// Mock Prisma enums that may not be generated in test environment
jest.mock('@prisma/client', () => ({
  ...(jest.requireActual('@prisma/client') as Record<string, unknown>),
  EstimateStatus: {
    DRAFT: 'DRAFT',
    SENT: 'SENT',
    PARTIALLY_APPROVED: 'PARTIALLY_APPROVED',
    ACCEPTED: 'ACCEPTED',
    REJECTED: 'REJECTED',
    CONVERTED: 'CONVERTED',
    EXPIRED: 'EXPIRED',
  },
  PublicTokenType: {
    ESTIMATE_APPROVAL: 'ESTIMATE_APPROVAL',
    PAYMENT: 'PAYMENT',
    DVI_REPORT: 'DVI_REPORT',
    REVIEW_REQUEST: 'REVIEW_REQUEST',
    CHECKIN: 'CHECKIN',
    MEMBERSHIP_INVITE: 'MEMBERSHIP_INVITE',
  },
}));

const mockPrisma = {
  estimate: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  estimateLine: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  workOrder: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockEventEmitter = { emit: jest.fn() };
const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
const mockPublicTokenService = {
  generateToken: jest.fn(),
  validateToken: jest.fn(),
  consumeToken: jest.fn(),
  revokeTokensForEntity: jest.fn(),
};
const mockConfigService = { get: jest.fn().mockReturnValue('https://app.mechmind.io') };

describe('EstimateService', () => {
  let service: EstimateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstimateService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: LoggerService, useValue: mockLogger },
        { provide: PublicTokenService, useValue: mockPublicTokenService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EstimateService>(EstimateService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an estimate with lines', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(null);
      const expected = {
        id: '1',
        estimateNumber: 'EST-2026-0001',
        status: 'DRAFT',
        lines: [],
      };
      mockPrisma.estimate.create.mockResolvedValue(expected);

      const result = await service.create('t1', {
        customerId: 'c1',
        createdBy: 'u1',
        lines: [],
      } as never);
      expect(result.estimateNumber).toContain('EST-');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('estimate.created', expect.any(Object));
    });
  });

  describe('create', () => {
    it('should create an estimate with lines and calculate totals', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(null);
      const expected = {
        id: '1',
        estimateNumber: 'EST-2026-0001',
        status: 'DRAFT',
        lines: [{ id: 'l1' }],
      };
      mockPrisma.estimate.create.mockResolvedValue(expected);

      const result = await service.create('t1', {
        customerId: 'c1',
        createdBy: 'u1',
        discountCents: 100,
        lines: [
          {
            type: 'LABOR',
            description: 'Oil change',
            quantity: 1,
            unitPriceCents: 5000,
            vatRate: 0.22,
          },
        ],
      } as never);
      expect(result).toEqual(expected);
      expect(mockPrisma.estimate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: 't1', status: 'DRAFT' }),
        }),
      );
    });

    it('should generate next estimate number based on existing', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue({
        estimateNumber: `EST-${new Date().getFullYear()}-0005`,
      });
      const expected = {
        id: '2',
        estimateNumber: `EST-${new Date().getFullYear()}-0006`,
        status: 'DRAFT',
        lines: [],
      };
      mockPrisma.estimate.create.mockResolvedValue(expected);

      const result = await service.create('t1', {
        customerId: 'c1',
        createdBy: 'u1',
        lines: [],
      } as never);
      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('should return estimates with pagination', async () => {
      const estimates = [{ id: '1', lines: [] }];
      mockPrisma.$transaction.mockResolvedValue([estimates, 1]);

      const result = await service.findAll('t1', {});
      expect(result).toEqual({ estimates, total: 1 });
    });

    it('should apply customerId filter', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);
      await service.findAll('t1', { customerId: 'c1' });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should apply status filter', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);
      await service.findAll('t1', { status: 'DRAFT' as never });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should apply limit and offset', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);
      await service.findAll('t1', { limit: 10, offset: 20 });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return estimate with lines', async () => {
      const estimate = { id: '1', lines: [{ id: 'l1' }] };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimate);

      const result = await service.findById('t1', '1');
      expect(result).toEqual(estimate);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(null);
      await expect(service.findById('t1', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('send', () => {
    it('should mark estimate as SENT', async () => {
      const estimate = { id: '1', status: 'DRAFT', customerId: 'c1', estimateNumber: 'EST-001' };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimate);
      mockPrisma.estimate.update.mockResolvedValue({ ...estimate, status: 'SENT' });

      const result = await service.send('t1', '1');
      expect(result.status).toBe('SENT');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('estimate.sent', expect.any(Object));
    });
  });

  describe('accept', () => {
    it('should mark estimate as ACCEPTED', async () => {
      const estimate = { id: '1', status: 'SENT', customerId: 'c1', estimateNumber: 'EST-001' };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimate);
      mockPrisma.estimate.update.mockResolvedValue({ ...estimate, status: 'ACCEPTED' });

      const result = await service.accept('t1', '1');
      expect(result.status).toBe('ACCEPTED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('estimate.accepted', expect.any(Object));
    });
  });

  describe('reject', () => {
    it('should mark estimate as REJECTED', async () => {
      const estimate = { id: '1', status: 'SENT', customerId: 'c1', estimateNumber: 'EST-001' };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimate);
      mockPrisma.estimate.update.mockResolvedValue({ ...estimate, status: 'REJECTED' });

      const result = await service.reject('t1', '1');
      expect(result.status).toBe('REJECTED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('estimate.rejected', expect.any(Object));
    });

    it('should throw BadRequestException if estimate is not SENT', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        customerId: 'c1',
        estimateNumber: 'EST-001',
      });
      await expect(service.reject('t1', '1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update a DRAFT estimate', async () => {
      const existing = { id: '1', status: 'DRAFT', customerId: 'c1' };
      mockPrisma.estimate.findFirst.mockResolvedValue(existing);
      const updated = { ...existing, notes: 'Updated' };
      mockPrisma.estimate.update.mockResolvedValue(updated);

      const result = await service.update('t1', '1', { notes: 'Updated' } as never);
      expect(result).toEqual(updated);
    });

    it('should update a SENT estimate', async () => {
      const existing = { id: '1', status: 'SENT', customerId: 'c1' };
      mockPrisma.estimate.findFirst.mockResolvedValue(existing);
      mockPrisma.estimate.update.mockResolvedValue({ ...existing, notes: 'Updated' });

      const result = await service.update('t1', '1', { notes: 'Updated' } as never);
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if estimate is ACCEPTED', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue({
        id: '1',
        status: 'ACCEPTED',
        customerId: 'c1',
      });
      await expect(service.update('t1', '1', { notes: 'X' } as never)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should recalculate totals when discountCents changes', async () => {
      const existing = { id: '1', status: 'DRAFT', customerId: 'c1', discountCents: 0 };
      mockPrisma.estimate.findFirst
        .mockResolvedValueOnce(existing) // findById call in update
        .mockResolvedValueOnce({ discountCents: 500 }); // recalculateTotals
      mockPrisma.estimate.update.mockResolvedValue({ ...existing, discountCents: 500 });
      mockPrisma.estimateLine.findMany.mockResolvedValue([{ totalCents: 10000, vatRate: 0.22 }]);

      const result = await service.update('t1', '1', { discountCents: 500 } as never);
      expect(result).toBeDefined();
    });
  });

  describe('addLine', () => {
    it('should add a line to a DRAFT estimate', async () => {
      const estimate = { id: '1', status: 'DRAFT', customerId: 'c1', discountCents: 0 };
      mockPrisma.estimate.findFirst
        .mockResolvedValueOnce(estimate) // findById in addLine
        .mockResolvedValueOnce({ discountCents: 0 }); // recalculateTotals
      mockPrisma.estimateLine.create.mockResolvedValue({ id: 'l1' });
      mockPrisma.estimateLine.findMany.mockResolvedValue([{ totalCents: 5000, vatRate: 0.22 }]);
      mockPrisma.estimate.update.mockResolvedValue({ ...estimate, subtotalCents: 5000 });

      const result = await service.addLine('t1', '1', {
        type: 'LABOR',
        description: 'Brake service',
        quantity: 1,
        unitPriceCents: 5000,
        vatRate: 0.22,
      } as never);
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if estimate is not DRAFT', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue({
        id: '1',
        status: 'SENT',
        customerId: 'c1',
      });
      await expect(
        service.addLine('t1', '1', {
          type: 'LABOR',
          description: 'X',
          quantity: 1,
          unitPriceCents: 100,
          vatRate: 0.22,
        } as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeLine', () => {
    it('should remove a line from a DRAFT estimate', async () => {
      mockPrisma.estimateLine.findUnique.mockResolvedValue({
        id: 'l1',
        estimateId: '1',
        estimate: { id: '1', tenantId: 't1', status: 'DRAFT' },
      });
      mockPrisma.estimateLine.delete.mockResolvedValue({ id: 'l1' });
      mockPrisma.estimateLine.findMany.mockResolvedValue([]);
      mockPrisma.estimate.findFirst.mockResolvedValue({ discountCents: 0 });
      mockPrisma.estimate.update.mockResolvedValue({ id: '1', subtotalCents: 0 });

      const result = await service.removeLine('t1', 'l1');
      expect(result).toBeDefined();
      expect(mockPrisma.estimateLine.delete).toHaveBeenCalledWith({ where: { id: 'l1' } });
    });

    it('should throw NotFoundException if line not found', async () => {
      mockPrisma.estimateLine.findUnique.mockResolvedValue(null);
      await expect(service.removeLine('t1', 'x')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if line belongs to different tenant', async () => {
      mockPrisma.estimateLine.findUnique.mockResolvedValue({
        id: 'l1',
        estimateId: '1',
        estimate: { id: '1', tenantId: 'other-tenant', status: 'DRAFT' },
      });
      await expect(service.removeLine('t1', 'l1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if estimate is not DRAFT', async () => {
      mockPrisma.estimateLine.findUnique.mockResolvedValue({
        id: 'l1',
        estimateId: '1',
        estimate: { id: '1', tenantId: 't1', status: 'SENT' },
      });
      await expect(service.removeLine('t1', 'l1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('send', () => {
    it('should throw BadRequestException if estimate is not DRAFT', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue({
        id: '1',
        status: 'SENT',
        customerId: 'c1',
        estimateNumber: 'EST-001',
      });
      await expect(service.send('t1', '1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('accept', () => {
    it('should throw BadRequestException if estimate is not SENT', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        customerId: 'c1',
        estimateNumber: 'EST-001',
      });
      await expect(service.accept('t1', '1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('convertToBooking', () => {
    it('should convert an ACCEPTED estimate to booking', async () => {
      const estimate = {
        id: '1',
        status: 'ACCEPTED',
        customerId: 'c1',
        estimateNumber: 'EST-001',
        termsAccepted: true,
        customerSignature: 'sig',
      };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimate);
      mockPrisma.estimate.update.mockResolvedValue({
        ...estimate,
        status: 'CONVERTED',
        bookingId: 'b1',
      });

      const result = await service.convertToBooking('t1', '1', 'b1');
      expect(result.status).toBe('CONVERTED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'estimate.converted',
        expect.objectContaining({
          estimateId: '1',
          bookingId: 'b1',
        }),
      );
    });

    it('should throw BadRequestException if estimate is not ACCEPTED', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue({
        id: '1',
        status: 'SENT',
        customerId: 'c1',
        estimateNumber: 'EST-001',
      });
      await expect(service.convertToBooking('t1', '1', 'b1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when termsAccepted is false (line 350)', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue({
        id: '1',
        status: 'ACCEPTED',
        customerId: 'c1',
        estimateNumber: 'EST-001',
        termsAccepted: false,
        customerSignature: 'sig',
      });
      await expect(service.convertToBooking('t1', '1', 'b1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when customerSignature is null (line 350)', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue({
        id: '1',
        status: 'ACCEPTED',
        customerId: 'c1',
        estimateNumber: 'EST-001',
        termsAccepted: true,
        customerSignature: null,
      });
      await expect(service.convertToBooking('t1', '1', 'b1')).rejects.toThrow(BadRequestException);
    });
  });

  // Cover defensive guard clauses (lines 132, 167, 220, 253, 286, 320)
  // These are unreachable in normal flow because findById already throws,
  // but we cover them by spying on findById to return a falsy value.
  describe('defensive null guards after findById', () => {
    it('update should throw NotFoundException if findById returns null (line 132)', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(null as never);
      await expect(service.update('t1', '1', { notes: 'X' } as never)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('addLine should throw NotFoundException if findById returns null (line 167)', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(null as never);
      await expect(
        service.addLine('t1', '1', {
          type: 'LABOR',
          description: 'X',
          quantity: 1,
          unitPriceCents: 100,
          vatRate: 0.22,
        } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('send should throw NotFoundException if findById returns null (line 220)', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(null as never);
      await expect(service.send('t1', '1')).rejects.toThrow(NotFoundException);
    });

    it('accept should throw NotFoundException if findById returns null (line 253)', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(null as never);
      await expect(service.accept('t1', '1')).rejects.toThrow(NotFoundException);
    });

    it('reject should throw NotFoundException if findById returns null (line 286)', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(null as never);
      await expect(service.reject('t1', '1')).rejects.toThrow(NotFoundException);
    });

    it('convertToBooking should throw NotFoundException if findById returns null (line 320)', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(null as never);
      await expect(service.convertToBooking('t1', '1', 'b1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('State Machine', () => {
    it('should reject REJECTED → SENT (send)', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue({
        id: '1',
        status: 'REJECTED',
        customerId: 'c1',
        estimateNumber: 'EST-001',
      });
      await expect(service.send('t1', '1')).rejects.toThrow(BadRequestException);
    });

    it('should reject DRAFT → ACCEPTED (accept)', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        customerId: 'c1',
        estimateNumber: 'EST-001',
      });
      await expect(service.accept('t1', '1')).rejects.toThrow(BadRequestException);
    });

    it('should reject EXPIRED → ACCEPTED (accept)', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue({
        id: '1',
        status: 'EXPIRED',
        customerId: 'c1',
        estimateNumber: 'EST-001',
      });
      await expect(service.accept('t1', '1')).rejects.toThrow(BadRequestException);
    });

    it('should reject CONVERTED → SENT (send)', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue({
        id: '1',
        status: 'CONVERTED',
        customerId: 'c1',
        estimateNumber: 'EST-001',
      });
      await expect(service.send('t1', '1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('sendForApproval', () => {
    it('should generate token and return approval URL', async () => {
      const estimate = { id: '1', status: 'DRAFT', customerId: 'c1', estimateNumber: 'EST-001' };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimate);
      mockPublicTokenService.revokeTokensForEntity.mockResolvedValue(0);
      mockPublicTokenService.generateToken.mockResolvedValue({ token: 'abc123' });
      mockPrisma.estimate.update.mockResolvedValue({
        ...estimate,
        status: 'SENT',
        approvalToken: 'abc123',
      });

      const result = await service.sendForApproval('t1', '1', 'SMS');
      expect(result.approvalUrl).toContain('abc123');
      expect(mockPublicTokenService.generateToken).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'estimate.sentForApproval',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException when estimate not found (line 390)', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(null as never);
      await expect(service.sendForApproval('t1', 'non-existent', 'SMS')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getByApprovalToken', () => {
    it('should return estimate by valid token', async () => {
      const tokenRecord = { entityId: '1', tenantId: 't1' };
      mockPublicTokenService.validateToken.mockResolvedValue(tokenRecord);
      const estimate = { id: '1', estimateNumber: 'EST-001', lines: [] };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimate);

      const result = await service.getByApprovalToken('abc123');
      expect(result).toEqual(estimate);
    });

    it('should throw NotFoundException if estimate not found', async () => {
      mockPublicTokenService.validateToken.mockResolvedValue({ entityId: 'x', tenantId: 't1' });
      mockPrisma.estimate.findFirst.mockResolvedValue(null);

      await expect(service.getByApprovalToken('abc123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('processApproval', () => {
    it('should approve all lines and set status ACCEPTED', async () => {
      const tokenRecord = { entityId: '1', tenantId: 't1' };
      mockPublicTokenService.validateToken.mockResolvedValue(tokenRecord);
      const estimate = {
        id: '1',
        status: 'SENT',
        customerId: 'c1',
        estimateNumber: 'EST-001',
        lines: [{ id: 'l1' }, { id: 'l2' }],
      };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimate);
      mockPrisma.estimateLine.update.mockResolvedValue({});
      mockPrisma.estimateLine.findMany.mockResolvedValue([
        { id: 'l1', customerApproved: true },
        { id: 'l2', customerApproved: true },
      ]);
      mockPrisma.estimate.update.mockResolvedValue({ ...estimate, status: 'ACCEPTED' });
      mockPublicTokenService.consumeToken.mockResolvedValue({});

      const result = await service.processApproval('abc123', [
        { lineId: 'l1', approved: true },
        { lineId: 'l2', approved: true },
      ]);
      expect(result!.status).toBe('ACCEPTED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('estimate.approved', expect.any(Object));
    });

    it('should set PARTIALLY_APPROVED when some lines rejected', async () => {
      const tokenRecord = { entityId: '1', tenantId: 't1' };
      mockPublicTokenService.validateToken.mockResolvedValue(tokenRecord);
      const estimate = {
        id: '1',
        status: 'SENT',
        customerId: 'c1',
        estimateNumber: 'EST-001',
        lines: [{ id: 'l1' }, { id: 'l2' }],
      };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimate);
      mockPrisma.estimateLine.update.mockResolvedValue({});
      mockPrisma.estimateLine.findMany.mockResolvedValue([
        { id: 'l1', customerApproved: true },
        { id: 'l2', customerApproved: false },
      ]);
      mockPrisma.estimate.update.mockResolvedValue({ ...estimate, status: 'PARTIALLY_APPROVED' });
      mockPublicTokenService.consumeToken.mockResolvedValue({});

      const result = await service.processApproval('abc123', [
        { lineId: 'l1', approved: true },
        { lineId: 'l2', approved: false, reason: 'Troppo caro' },
      ]);
      expect(result!.status).toBe('PARTIALLY_APPROVED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'estimate.partiallyApproved',
        expect.any(Object),
      );
    });

    it('should throw BadRequestException if estimate not in SENT status', async () => {
      mockPublicTokenService.validateToken.mockResolvedValue({ entityId: '1', tenantId: 't1' });
      mockPrisma.estimate.findFirst.mockResolvedValue({
        id: '1',
        status: 'ACCEPTED',
        customerId: 'c1',
        estimateNumber: 'EST-001',
        lines: [],
      });
      await expect(service.processApproval('abc123', [])).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when estimate not found in DB (line 481)', async () => {
      mockPublicTokenService.validateToken.mockResolvedValue({ entityId: '1', tenantId: 't1' });
      mockPrisma.estimate.findFirst.mockResolvedValue(null);
      await expect(service.processApproval('abc123', [])).rejects.toThrow(NotFoundException);
    });

    it('should set REJECTED and emit estimate.rejected when all lines rejected (lines 522, 559)', async () => {
      const tokenRecord = { entityId: '1', tenantId: 't1' };
      mockPublicTokenService.validateToken.mockResolvedValue(tokenRecord);
      const estimate = {
        id: '1',
        status: 'SENT',
        customerId: 'c1',
        estimateNumber: 'EST-001',
        lines: [{ id: 'l1' }, { id: 'l2' }],
      };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimate);
      mockPrisma.estimateLine.update.mockResolvedValue({});
      mockPrisma.estimateLine.findMany.mockResolvedValue([
        { id: 'l1', customerApproved: false },
        { id: 'l2', customerApproved: false },
      ]);
      mockPrisma.estimate.update.mockResolvedValue({ ...estimate, status: 'REJECTED' });
      mockPublicTokenService.consumeToken.mockResolvedValue({});

      const result = await service.processApproval('abc123', [
        { lineId: 'l1', approved: false, reason: 'Troppo caro' },
        { lineId: 'l2', approved: false, reason: 'Non necessario' },
      ]);

      expect(result!.status).toBe('REJECTED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'estimate.rejected',
        expect.objectContaining({ estimateId: '1', tenantId: 't1' }),
      );
    });

    it('should throw BadRequestException when lineId not found (line 481)', async () => {
      const tokenRecord = { entityId: '1', tenantId: 't1' };
      mockPublicTokenService.validateToken.mockResolvedValue(tokenRecord);
      const estimate = {
        id: '1',
        status: 'SENT',
        customerId: 'c1',
        estimateNumber: 'EST-001',
        lines: [{ id: 'l1' }],
      };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimate);

      await expect(
        service.processApproval('abc123', [{ lineId: 'non-existent', approved: true }]),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveAll', () => {
    it('should approve all lines and set status ACCEPTED', async () => {
      const tokenRecord = { entityId: '1', tenantId: 't1' };
      mockPublicTokenService.validateToken.mockResolvedValue(tokenRecord);
      const estimate = {
        id: '1',
        status: 'SENT',
        customerId: 'c1',
        estimateNumber: 'EST-001',
        lines: [{ id: 'l1' }, { id: 'l2' }],
      };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimate);
      mockPrisma.estimateLine.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.estimate.update.mockResolvedValue({ ...estimate, status: 'ACCEPTED' });
      mockPublicTokenService.consumeToken.mockResolvedValue({});

      const result = await service.approveAll('abc123');
      expect(result!.status).toBe('ACCEPTED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('estimate.approved', expect.any(Object));
    });

    it('should throw BadRequestException if estimate not in SENT status', async () => {
      mockPublicTokenService.validateToken.mockResolvedValue({ entityId: '1', tenantId: 't1' });
      mockPrisma.estimate.findFirst.mockResolvedValue({
        id: '1',
        status: 'DRAFT',
        customerId: 'c1',
        estimateNumber: 'EST-001',
        lines: [],
      });
      await expect(service.approveAll('abc123')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when estimate not found in DB (line 592)', async () => {
      mockPublicTokenService.validateToken.mockResolvedValue({ entityId: '1', tenantId: 't1' });
      mockPrisma.estimate.findFirst.mockResolvedValue(null);
      await expect(service.approveAll('abc123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('convertToWorkOrder', () => {
    const year = new Date().getFullYear();
    const prefix = `WO-${year}-`;

    const baseEstimate = {
      id: 'est-001',
      status: 'ACCEPTED',
      tenantId: 't1',
      estimateNumber: 'EST-001',
      bookingId: null,
      vehicleId: 'veh-001',
      customerId: 'cust-001',
      lines: [],
    };

    it('should throw NotFoundException when estimate not found', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(null);
      await expect(service.convertToWorkOrder('est-001', 't1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when estimate already converted (has bookingId)', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue({ ...baseEstimate, bookingId: 'book-001' });
      await expect(service.convertToWorkOrder('est-001', 't1')).rejects.toThrow(ConflictException);
    });

    it('should generate WO number seq=1 when no lastWo exists (line 675 false branch)', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(baseEstimate);
      mockPrisma.workOrder.findFirst.mockResolvedValue(null);
      const wo = { id: 'wo-001', woNumber: `${prefix}0001` };
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
      );
      mockPrisma.workOrder.create.mockResolvedValue(wo);
      mockPrisma.estimate.update.mockResolvedValue({ ...baseEstimate, status: 'CONVERTED' });

      const result = await service.convertToWorkOrder('est-001', 't1');
      expect(result).toEqual(wo);
      expect(mockPrisma.workOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ woNumber: `${prefix}0001` }) }),
      );
    });

    it('should increment seq from lastWo sequence (line 675 true branch)', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(baseEstimate);
      mockPrisma.workOrder.findFirst.mockResolvedValue({ woNumber: `${prefix}0005` });
      const wo = { id: 'wo-002', woNumber: `${prefix}0006` };
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
      );
      mockPrisma.workOrder.create.mockResolvedValue(wo);
      mockPrisma.estimate.update.mockResolvedValue({ ...baseEstimate, status: 'CONVERTED' });

      await service.convertToWorkOrder('est-001', 't1');
      expect(mockPrisma.workOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ woNumber: `${prefix}0006` }) }),
      );
    });

    it('should keep seq=1 when lastWo.woNumber is not parseable (line 677 false branch)', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(baseEstimate);
      mockPrisma.workOrder.findFirst.mockResolvedValue({ woNumber: 'WO-INVALID-FORMAT' });
      const wo = { id: 'wo-003', woNumber: `${prefix}0001` };
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
      );
      mockPrisma.workOrder.create.mockResolvedValue(wo);
      mockPrisma.estimate.update.mockResolvedValue({ ...baseEstimate, status: 'CONVERTED' });

      await service.convertToWorkOrder('est-001', 't1');
      expect(mockPrisma.workOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ woNumber: `${prefix}0001` }) }),
      );
    });

    it('should emit estimate.convertedToWorkOrder event', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(baseEstimate);
      mockPrisma.workOrder.findFirst.mockResolvedValue(null);
      const wo = { id: 'wo-001', woNumber: `${prefix}0001` };
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
      );
      mockPrisma.workOrder.create.mockResolvedValue(wo);
      mockPrisma.estimate.update.mockResolvedValue({ ...baseEstimate, status: 'CONVERTED' });

      await service.convertToWorkOrder('est-001', 't1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'estimate.convertedToWorkOrder',
        expect.objectContaining({ estimateId: 'est-001', workOrderId: 'wo-001', tenantId: 't1' }),
      );
    });
  });

  describe('branch coverage — create validUntil (line 74)', () => {
    it('should set validUntil when provided in create dto', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(null);
      const expected = { id: '1', estimateNumber: 'EST-2026-0001', status: 'DRAFT', lines: [] };
      mockPrisma.estimate.create.mockResolvedValue(expected);

      await service.create('t1', {
        customerId: 'c1',
        createdBy: 'u1',
        validUntil: '2026-12-31',
        lines: [],
      } as never);

      expect(mockPrisma.estimate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ validUntil: expect.any(Date) }),
        }),
      );
    });
  });

  describe('branch coverage — update validUntil (line 174)', () => {
    it('should set validUntil when provided in update dto', async () => {
      const existing = { id: '1', status: 'DRAFT', customerId: 'c1' };
      mockPrisma.estimate.findFirst.mockResolvedValue(existing);
      mockPrisma.estimate.update.mockResolvedValue({
        ...existing,
        validUntil: new Date('2026-12-31'),
      });

      await service.update('t1', '1', { validUntil: '2026-12-31' } as never);

      expect(mockPrisma.estimate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ validUntil: expect.any(Date) }),
        }),
      );
    });
  });

  describe('branch coverage — processApproval optional params (lines 505, 533-535)', () => {
    it('should handle rejection with no reason (approval.reason ?? null branch)', async () => {
      mockPublicTokenService.validateToken.mockResolvedValue({ entityId: '1', tenantId: 't1' });
      const estimate = {
        id: '1',
        status: 'SENT',
        customerId: 'c1',
        estimateNumber: 'EST-001',
        lines: [{ id: 'l1' }],
      };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimate);
      mockPrisma.estimateLine.update.mockResolvedValue({});
      mockPrisma.estimateLine.findMany.mockResolvedValue([{ id: 'l1', customerApproved: false }]);
      mockPrisma.estimate.update.mockResolvedValue({ ...estimate, status: 'REJECTED' });
      mockPublicTokenService.consumeToken.mockResolvedValue({});

      const result = await service.processApproval('abc123', [{ lineId: 'l1', approved: false }]);
      expect(result!.status).toBe('REJECTED');
    });

    it('should spread signature, termsAccepted, ipAddress when all provided (lines 533-535)', async () => {
      mockPublicTokenService.validateToken.mockResolvedValue({ entityId: '1', tenantId: 't1' });
      const estimate = {
        id: '1',
        status: 'SENT',
        customerId: 'c1',
        estimateNumber: 'EST-001',
        lines: [{ id: 'l1' }],
      };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimate);
      mockPrisma.estimateLine.update.mockResolvedValue({});
      mockPrisma.estimateLine.findMany.mockResolvedValue([{ id: 'l1', customerApproved: true }]);
      mockPrisma.estimate.update.mockResolvedValue({ ...estimate, status: 'ACCEPTED' });
      mockPublicTokenService.consumeToken.mockResolvedValue({});

      await service.processApproval(
        'abc123',
        [{ lineId: 'l1', approved: true }],
        'sig-data',
        true,
        '1.2.3.4',
      );

      expect(mockPrisma.estimate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerSignature: 'sig-data',
            termsAccepted: true,
            approvalIpAddress: '1.2.3.4',
          }),
        }),
      );
    });
  });

  describe('branch coverage — approveAll optional params (lines 620-622)', () => {
    it('should spread signature, termsAccepted, ipAddress when all provided', async () => {
      mockPublicTokenService.validateToken.mockResolvedValue({ entityId: '1', tenantId: 't1' });
      const estimate = {
        id: '1',
        status: 'SENT',
        customerId: 'c1',
        estimateNumber: 'EST-001',
        lines: [{ id: 'l1' }],
      };
      mockPrisma.estimate.findFirst.mockResolvedValue(estimate);
      mockPrisma.estimateLine.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.estimate.update.mockResolvedValue({ ...estimate, status: 'ACCEPTED' });
      mockPublicTokenService.consumeToken.mockResolvedValue({});

      await service.approveAll('abc123', 'sig-data', true, '10.0.0.1');

      expect(mockPrisma.estimate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerSignature: 'sig-data',
            termsAccepted: true,
            approvalIpAddress: '10.0.0.1',
          }),
        }),
      );
    });
  });

  describe('branch coverage — calculateTotals negative total (line 770)', () => {
    it('should return totalCents=0 when discount exceeds subtotal+vat', async () => {
      mockPrisma.estimate.findFirst.mockResolvedValue(null);
      const expected = { id: '1', estimateNumber: 'EST-2026-0001', status: 'DRAFT', lines: [] };
      mockPrisma.estimate.create.mockResolvedValue(expected);

      await service.create('t1', {
        customerId: 'c1',
        createdBy: 'u1',
        discountCents: 99999,
        lines: [
          { type: 'LABOR', description: 'Test', quantity: 1, unitPriceCents: 100, vatRate: 0 },
        ],
      } as never);

      expect(mockPrisma.estimate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalCents: 0 }),
        }),
      );
    });
  });

  describe('branch coverage — recalculateTotals negative total (line 803)', () => {
    it('should clamp totalCents to 0 when discount exceeds lines total in recalculate', async () => {
      const estimate = { id: '1', status: 'DRAFT', customerId: 'c1', discountCents: 0 };
      mockPrisma.estimate.findFirst
        .mockResolvedValueOnce(estimate)
        .mockResolvedValueOnce({ discountCents: 999999 });
      mockPrisma.estimateLine.findMany.mockResolvedValue([{ totalCents: 100, vatRate: 0 }]);
      mockPrisma.estimate.update.mockResolvedValue({ ...estimate, totalCents: 0 });

      await service.update('t1', '1', { discountCents: 999999 } as never);

      expect(mockPrisma.estimate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalCents: 0 }),
        }),
      );
    });

    it('should use discount=0 when estimate not found in recalculateTotals (line 795 ?? branch)', async () => {
      const estimate = { id: '1', status: 'DRAFT', customerId: 'c1', discountCents: 0 };
      mockPrisma.estimate.findFirst.mockResolvedValueOnce(estimate).mockResolvedValueOnce(null);
      mockPrisma.estimateLine.findMany.mockResolvedValue([{ totalCents: 5000, vatRate: 0.22 }]);
      mockPrisma.estimate.update.mockResolvedValue({ ...estimate, totalCents: 6100 });

      await service.update('t1', '1', { discountCents: 0 } as never);

      expect(mockPrisma.estimate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subtotalCents: 5000 }),
        }),
      );
    });
  });
});
